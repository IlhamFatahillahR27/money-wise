import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { ExpenseComparison } from '@/types/expense';
import { formatRupiah, formatTanggalIndo, parseIndoNumber } from '@/utils/currency';

interface ComparisonCardProps {
  comparison: ExpenseComparison;
}

export function ComparisonCard({ comparison }: ComparisonCardProps) {
  const theme = useTheme();
  const { current_expense, previous_expense, total_diff, total_percentage_change, field_comparisons } =
    comparison;

  const isTotalIncreased = total_diff > 0;
  const isTotalDecreased = total_diff < 0;

  // Warna indikator: Jika pengeluaran naik = merah (boros/naik biaya), jika turun = hijau (hemat)
  const totalTrendColor = isTotalIncreased
    ? theme.colors.error
    : isTotalDecreased
    ? '#4CAF50'
    : theme.colors.outline;

  const totalTrendIcon = isTotalIncreased
    ? 'arrow-up-bold'
    : isTotalDecreased
    ? 'arrow-down-bold'
    : 'minus';

  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Title
        title="Analisis Komparasi Head-to-Head"
        subtitle={`Dibandingkan dengan catatan: "${previous_expense.title}" (${formatTanggalIndo(
          previous_expense.date
        )})`}
        left={(props) => (
          <Chip
            {...props}
            compact
            icon="compare"
            style={{ backgroundColor: theme.colors.primaryContainer }}>
            Diff
          </Chip>
        )}
        titleStyle={styles.cardTitle}
      />
      <Card.Content>
        {/* Ringkasan Perubahan Total Biaya Global */}
        <View style={[styles.summaryBox, { backgroundColor: totalTrendColor + '12' }]}>
          <View style={styles.summaryRow}>
            <View>
              <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                Perubahan Total Biaya
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: totalTrendColor }}>
                {isTotalIncreased ? '+' : ''}
                {formatRupiah(total_diff)} ({isTotalIncreased ? '+' : ''}
                {total_percentage_change}%)
              </Text>
            </View>
            <Chip
              icon={totalTrendIcon}
              compact
              style={{ backgroundColor: totalTrendColor + '25' }}
              textStyle={{ color: totalTrendColor, fontWeight: '700' }}>
              {isTotalIncreased ? 'Naik' : isTotalDecreased ? 'Turun' : 'Sama'}
            </Chip>
          </View>

          <View style={styles.historyCompareRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Lalu: {formatRupiah(previous_expense.total_amount)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              ➔
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              Kini: {formatRupiah(current_expense.total_amount)}
            </Text>
          </View>
        </View>

        {/* Perbandingan Rincian Per-Field */}
        {field_comparisons.length > 0 && (
          <View style={styles.fieldsSection}>
            <Text variant="titleSmall" style={styles.fieldsHeading}>
              Rincian Perubahan Item / Custom Field:
            </Text>

            {field_comparisons.map((fc, idx) => {
              const isIncreased = fc.trend === 'INCREASED';
              const isDecreased = fc.trend === 'DECREASED';
              const isNew = fc.trend === 'NEW';

              const itemColor = isIncreased
                ? theme.colors.error
                : isDecreased
                ? '#4CAF50'
                : isNew
                ? theme.colors.primary
                : theme.colors.outline;

              const formatVal = (val: string | null) => {
                if (!val) return '-';
                if (fc.field_type === 'currency') {
                  return formatRupiah(parseIndoNumber(val));
                }
                return `${val}${fc.unit ? ' ' + fc.unit : ''}`;
              };

              return (
                <View key={idx} style={styles.fieldItemRow}>
                  <View style={styles.fieldItemInfo}>
                    <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                      {fc.field_name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      {isNew
                        ? 'Item baru ditambahkan'
                        : `${formatVal(fc.previous_value)}  ➔  ${formatVal(fc.current_value)}`}
                    </Text>
                  </View>

                  <View style={styles.fieldItemBadge}>
                    {fc.numeric_diff !== null && fc.percentage_change !== null ? (
                      <Chip
                        compact
                        icon={isIncreased ? 'arrow-up' : isDecreased ? 'arrow-down' : 'minus'}
                        style={{ backgroundColor: itemColor + '20' }}
                        textStyle={{ color: itemColor, fontWeight: '700', fontSize: 11 }}>
                        {isIncreased ? '+' : ''}
                        {fc.field_type === 'currency'
                          ? formatRupiah(fc.numeric_diff)
                          : `${fc.numeric_diff}${fc.unit ? ' ' + fc.unit : ''}`}{' '}
                        ({isIncreased ? '+' : ''}
                        {fc.percentage_change}%)
                      </Chip>
                    ) : (
                      <Chip
                        compact
                        style={{ backgroundColor: itemColor + '20' }}
                        textStyle={{ color: itemColor, fontWeight: '700', fontSize: 11 }}>
                        {isNew ? 'Baru' : 'Tetap'}
                      </Chip>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 12,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  fieldsSection: {
    marginTop: 4,
  },
  fieldsHeading: {
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  fieldItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  fieldItemBadge: {
    alignItems: 'flex-end',
  },
});
