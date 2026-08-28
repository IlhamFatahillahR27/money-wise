import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Searchbar,
  Chip,
  Text,
  useTheme,
  ActivityIndicator,
  Appbar,
  Card,
  Button,
} from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { Category, ExpenseWithDetails } from '@/types/expense';
import { ExpenseRepository } from '@/services/db/expense-repository';
import { CategoryRepository } from '@/services/db/category-repository';
import { CloudSyncService } from '@/services/cloud/cloud-sync-service';
import { ExpenseCard } from '@/components/expense/expense-card';
import { ExcelExportService } from '@/services/export/excel-export';
import { formatRupiah } from '@/utils/currency';

export default function ExploreScreen() {
  const theme = useTheme();

  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);

  useEffect(() => {
    CategoryRepository.getAllCategories()
      .then(setCategories)
      .catch((err) => console.error('Gagal memuat kategori:', err));
  }, []);

  const loadExpenses = useCallback(async (isRefresh = false) => {
    try {
      // 1. Muat dari SQLite lokal terlebih dahulu
      const data = await ExpenseRepository.getExpenses({
        categoryId: selectedCategoryId || undefined,
        searchQuery: searchQuery || undefined,
      });
      setExpenses(data);

      // 2. Jika di-refresh atau data lokal kosong, dan terhubung cloud
      const config = await CloudSyncService.getConfig();
      if (config.cloud_base_url && (isRefresh || data.length === 0)) {
        setCloudSyncing(true);
        const syncRes = await CloudSyncService.sync();
        if (syncRes.success) {
          const refreshed = await ExpenseRepository.getExpenses({
            categoryId: selectedCategoryId || undefined,
            searchQuery: searchQuery || undefined,
          });
          setExpenses(refreshed);
          const catList = await CategoryRepository.getAllCategories();
          setCategories(catList);
        }
      }
    } catch (error) {
      console.error('Gagal mengambil data pengeluaran:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCloudSyncing(false);
    }
  }, [selectedCategoryId, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses(false);
    }, [loadExpenses])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadExpenses(true);
  }

  async function handleExportExcel() {
    if (expenses.length === 0) {
      Alert.alert('Data Kosong', 'Tidak ada data pengeluaran yang dapat diekspor.');
      return;
    }
    try {
      await ExcelExportService.exportToExcel(expenses);
    } catch (error: any) {
      Alert.alert('Gagal Ekspor', error.message || 'Terjadi kesalahan saat membuat file Excel.');
    }
  }

  const totalFilteredAmount = expenses.reduce((acc, curr) => acc + curr.total_amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Halaman */}
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content
          title="Riwayat Pengeluaran"
          subtitle={`${expenses.length} transaksi (${formatRupiah(totalFilteredAmount)})`}
          titleStyle={{ fontWeight: '800' }}
        />
        <Appbar.Action icon="file-excel-box" onPress={handleExportExcel} />
        <Appbar.Action icon="plus-circle" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      {/* Banner Sinkronisasi Cloud */}
      {cloudSyncing && (
        <View style={[styles.cloudBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="labelSmall" style={{ marginLeft: 8, color: theme.colors.primary, fontWeight: '700' }}>
            Memperbarui data dari cloud...
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Cari judul pengeluaran atau catatan..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          elevation={1}
          style={styles.searchBar}
        />
      </View>

      {/* Filter Kategori Horizontal Chips */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip
            selected={selectedCategoryId === null}
            onPress={() => setSelectedCategoryId(null)}
            style={styles.chip}>
            Semua Kategori
          </Chip>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <Chip
                key={cat.id}
                selected={isSelected}
                onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                icon={cat.icon || 'tag-outline'}
                style={[
                  styles.chip,
                  isSelected && { backgroundColor: cat.color + '25', borderColor: cat.color },
                ]}
                textStyle={isSelected ? { color: cat.color, fontWeight: '700' } : undefined}>
                {cat.name}
              </Chip>
            );
          })}
        </ScrollView>
      </View>

      {/* Daftar Pengeluaran */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseCard expense={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Card mode="outlined" style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4 }}>
                  Tidak ada pengeluaran ditemukan
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: 'center' }}>
                  {searchQuery || selectedCategoryId
                    ? 'Coba ubah kata kunci pencarian atau filter kategori Anda.'
                    : 'Mulai catat pengeluaran pertama Anda sekarang!'}
                </Text>
                <Button
                  mode="contained"
                  icon="plus"
                  style={{ marginTop: 14 }}
                  onPress={() => router.push('/modal')}>
                  Catat Pengeluaran Baru
                </Button>
              </Card.Content>
            </Card>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cloudBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 12,
  },
  filterSection: {
    paddingBottom: 8,
  },
  chipRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    marginTop: 30,
    borderRadius: 14,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
