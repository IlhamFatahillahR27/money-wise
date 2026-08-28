import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme, Divider } from 'react-native-paper';
import { PeriodicSummary } from '@/types/expense';
import { formatRupiah } from '@/utils/currency';

interface StatCardProps {
  summary: PeriodicSummary;
  periodLabel: string;
}

export function StatCard({ summary, periodLabel }: StatCardProps) {
  const theme = useTheme();

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Content style={styles.content}>
        <Text variant="labelMedium" style={{ color: theme.colors.outline, textTransform: 'uppercase' }}>
          Total Pengeluaran ({periodLabel})
        </Text>
        <Text variant="displaySmall" style={[styles.totalAmount, { color: theme.colors.error }]}>
          {formatRupiah(summary.total_expense)}
        </Text>

        <Divider style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Rata-rata Harian
            </Text>
            <Text variant="titleSmall" style={styles.metricText}>
              {formatRupiah(summary.daily_average)}
            </Text>
          </View>

          <View style={styles.col}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Terbesar
            </Text>
            <Text variant="titleSmall" style={styles.metricText}>
              {formatRupiah(summary.highest_expense)}
            </Text>
          </View>

          <View style={styles.col}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Transaksi
            </Text>
            <Text variant="titleSmall" style={styles.metricText}>
              {summary.transaction_count} kali
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 18,
  },
  content: {
    paddingVertical: 16,
  },
  totalAmount: {
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  metricText: {
    fontWeight: '700',
    marginTop: 2,
  },
});
