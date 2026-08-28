import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  FAB,
  Button,
  ActivityIndicator,
  useTheme,
  Card,
  Appbar,
} from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { ExpenseWithDetails, PeriodicSummary, PeriodType } from '@/types/expense';
import { ExpenseRepository } from '@/services/db/expense-repository';
import { CloudSyncService } from '@/services/cloud/cloud-sync-service';
import {
  PeriodSelector,
  getPeriodDateRange,
} from '@/components/dashboard/period-selector';
import { StatCard } from '@/components/dashboard/stat-card';
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown';
import { ExpenseCard } from '@/components/expense/expense-card';

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: '7 Hari Terakhir',
  month: 'Bulan Ini',
  year: 'Tahun Ini',
  all: 'Semua Waktu',
};

export default function DashboardScreen() {
  const theme = useTheme();

  const [period, setPeriod] = useState<PeriodType>('month');
  const [summary, setSummary] = useState<PeriodicSummary | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      const { startDate, endDate } = getPeriodDateRange(period);

      // 1. Muat dari SQLite lokal terlebih dahulu agar UI instan dan cepat
      const sumData = await ExpenseRepository.getPeriodicSummary(startDate, endDate);
      const allData = await ExpenseRepository.getExpenses({ startDate, endDate });

      setSummary(sumData);
      setRecentExpenses(allData.slice(0, 5)); // 5 transaksi terkini

      // 2. Jika terhubung ke cloud dan (data lokal masih kosong ATAU pengguna me-refresh layar)
      const config = await CloudSyncService.getConfig();
      if (config.cloud_base_url && (allData.length === 0 || isRefresh)) {
        setCloudSyncing(true);
        const syncRes = await CloudSyncService.sync();
        if (syncRes.success) {
          // Muat ulang data terbaru dari SQLite yang sudah dicache
          const refreshedSum = await ExpenseRepository.getPeriodicSummary(startDate, endDate);
          const refreshedAll = await ExpenseRepository.getExpenses({ startDate, endDate });
          setSummary(refreshedSum);
          setRecentExpenses(refreshedAll.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Gagal memuat data dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCloudSyncing(false);
    }
  }, [period]);

  // Muat ulang data setiap kali screen ini difokuskan
  useFocusEffect(
    useCallback(() => {
      loadDashboardData(false);
    }, [loadDashboardData])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadDashboardData(true);
  }

  function handleAddExpense() {
    router.push('/modal');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Aplikasi */}
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title="MoneyWise" subtitle="Catatan & Analisis Pengeluaran" titleStyle={{ fontWeight: '800' }} />
        <Appbar.Action icon="cog-outline" onPress={() => router.push('/settings')} />
        <Appbar.Action icon="plus-circle" onPress={handleAddExpense} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {/* Banner Efek Sinkronisasi Cloud */}
        {cloudSyncing && (
          <View style={[styles.cloudBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ marginLeft: 8, color: theme.colors.primary, fontWeight: '700' }}>
              Menyinkronkan data cloud ke penyimpanan lokal...
            </Text>
          </View>
        )}

        {/* Pemilih Periode */}
        <PeriodSelector selectedPeriod={period} onSelectPeriod={setPeriod} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            {/* Kartu Statistik */}
            {summary && <StatCard summary={summary} periodLabel={PERIOD_LABELS[period]} />}

            {/* Breakdown Pengeluaran per Kategori */}
            {summary && <CategoryBreakdown categories={summary.categories_breakdown} />}

            {/* Daftar Transaksi Terkini */}
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Pengeluaran Terkini
                </Text>
                {recentExpenses.length > 0 && (
                  <Button
                    mode="text"
                    compact
                    onPress={() => router.push('/(tabs)/explore')}>
                    Lihat Semua
                  </Button>
                )}
              </View>

              {recentExpenses.length === 0 ? (
                <Card mode="outlined" style={styles.emptyCard}>
                  <Card.Content style={styles.emptyContent}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: 'center' }}>
                      Belum ada transaksi di periode ini.{'\n'}Klik tombol (+) untuk mencatat pengeluaran.
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                recentExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) untuk Tambah Pengeluaran Cepat */}
      <FAB
        icon="plus"
        label="Catat Baru"
        onPress={handleAddExpense}
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  cloudBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentSection: {
    marginTop: 10,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: '800',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
  },
  emptyContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});
