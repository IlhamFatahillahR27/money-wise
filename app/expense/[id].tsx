import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  Portal,
  Dialog,
  ActivityIndicator,
  useTheme,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { ExpenseComparison, ExpenseWithDetails } from '@/types/expense';
import { ExpenseRepository } from '@/services/db/expense-repository';
import { ComparisonEngine } from '@/services/analytics/comparison-engine';
import { ComparisonCard } from '@/components/expense/comparison-card';
import { formatRupiah, formatTanggalIndo } from '@/utils/currency';

export default function ExpenseDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [expense, setExpense] = useState<ExpenseWithDetails | null>(null);
  const [comparison, setComparison] = useState<ExpenseComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadExpenseDetail(id);
    }
  }, [id]);

  async function loadExpenseDetail(expenseId: string) {
    try {
      setLoading(true);
      const data = await ExpenseRepository.getExpenseById(expenseId);
      setExpense(data);

      if (data) {
        // Cari catatan serupa sebelumnya untuk perbandingan otomatis
        const previous = await ExpenseRepository.getPreviousSimilarExpense(
          data.id,
          data.title,
          data.date
        );

        if (previous) {
          const compResult = ComparisonEngine.compare(data, previous);
          setComparison(compResult);
        } else {
          setComparison(null);
        }
      }
    } catch (error) {
      console.error('Gagal memuat detail pengeluaran:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!expense) return;
    try {
      setDeleting(true);
      await ExpenseRepository.deleteExpense(expense.id);
      setDeleteDialogVisible(false);
      router.back();
    } catch (error) {
      console.error('Gagal menghapus pengeluaran:', error);
      Alert.alert('Error', 'Gagal menghapus pengeluaran.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">Data pengeluaran tidak ditemukan.</Text>
        <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 12 }}>
          Kembali
        </Button>
      </View>
    );
  }

  const categoryColor = expense.category_color || theme.colors.primary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}>
      {/* Kartu Ringkasan Utama */}
      <Card mode="elevated" style={styles.mainCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Chip
              icon={expense.category_icon || 'tag-outline'}
              style={{ backgroundColor: categoryColor + '20' }}
              textStyle={{ color: categoryColor, fontWeight: '700' }}>
              {expense.category_name || 'Umum'}
            </Chip>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {formatTanggalIndo(expense.date)}
            </Text>
          </View>

          <Text variant="headlineSmall" style={styles.title}>
            {expense.title}
          </Text>

          <Text variant="displaySmall" style={[styles.totalAmount, { color: theme.colors.error }]}>
            {formatRupiah(expense.total_amount)}
          </Text>

          {expense.notes && (
            <View style={styles.notesBox}>
              <Text variant="bodyMedium" style={{ fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>
                &quot;{expense.notes}&quot;
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Kartu Rincian Custom Fields */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Title
          title="Rincian Item / Custom Fields"
          subtitle={`${expense.items.length} rincian tersimpan`}
          left={(props) => <IconButton {...props} icon="format-list-bulleted" />}
          titleStyle={{ fontWeight: '700' }}
        />
        <Card.Content>
          {expense.items.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.outline, paddingVertical: 8 }}>
              Tidak ada rincian custom field untuk transaksi ini.
            </Text>
          ) : (
            expense.items.map((item, index) => (
              <View key={item.id}>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                      {item.field_name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      Tipe: {item.field_type === 'currency' ? 'Rupiah' : item.field_type === 'number' ? 'Angka' : 'Teks'}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {item.field_type === 'currency'
                      ? formatRupiah(parseFloat(item.field_value) || 0)
                      : `${item.field_value}${item.unit ? ' ' + item.unit : ''}`}
                  </Text>
                </View>
                {index < expense.items.length - 1 && <Divider style={{ marginVertical: 4 }} />}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Seksi Komparasi Head-to-Head */}
      {comparison ? (
        <ComparisonCard comparison={comparison} />
      ) : (
        <Card mode="outlined" style={[styles.noCompCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              ℹ️ Belum ada pencatatan serupa sebelumnya untuk dikomparasikan. Komparasi akan otomatis tampil ketika ada pengeluaran dengan judul atau kategori yang sama di waktu berikutnya.
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Tombol Hapus */}
      <Button
        mode="outlined"
        icon="trash-can-outline"
        textColor={theme.colors.error}
        style={styles.deleteButton}
        onPress={() => setDeleteDialogVisible(true)}>
        Hapus Pengeluaran Ini
      </Button>

      {/* Dialog Konfirmasi Hapus */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Hapus Pengeluaran?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Apakah Anda yakin ingin menghapus catatan &quot;{expense.title}&quot;? Tindakan ini tidak dapat dibatalkan.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Batal</Button>
            <Button
              textColor={theme.colors.error}
              loading={deleting}
              disabled={deleting}
              onPress={handleDeleteConfirm}>
              Hapus
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontWeight: '800',
    marginBottom: 6,
  },
  totalAmount: {
    fontWeight: '900',
    marginVertical: 4,
  },
  notesBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  detailCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  noCompCard: {
    borderRadius: 14,
    marginVertical: 8,
  },
  deleteButton: {
    marginTop: 16,
    borderRadius: 10,
    borderColor: '#ffcdd2',
  },
});
