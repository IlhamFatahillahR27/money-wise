import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, ProgressBar, Avatar, useTheme } from 'react-native-paper';
import { CategorySummary } from '@/types/expense';
import { formatRupiah } from '@/utils/currency';

interface CategoryBreakdownProps {
  categories: CategorySummary[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const theme = useTheme();

  if (categories.length === 0) {
    return null;
  }

  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Title
        title="Distribusi Pengeluaran Per Kategori"
        titleStyle={styles.cardTitle}
      />
      <Card.Content>
        {categories.map((cat) => {
          const progressValue = Math.min(Math.max(cat.percentage / 100, 0), 1);

          return (
            <View key={cat.category_id} style={styles.catItem}>
              <View style={styles.topRow}>
                <View style={styles.catTitleCol}>
                  <Avatar.Icon
                    size={30}
                    icon={cat.category_icon || 'tag-outline'}
                    style={[styles.avatar, { backgroundColor: cat.category_color + '25' }]}
                    color={cat.category_color}
                  />
                  <Text variant="bodyMedium" style={styles.catName}>
                    {cat.category_name}
                  </Text>
                </View>

                <View style={styles.amountCol}>
                  <Text variant="bodyMedium" style={styles.amountText}>
                    {formatRupiah(cat.total_amount)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    {cat.percentage}% ({cat.transaction_count}x)
                  </Text>
                </View>
              </View>

              <ProgressBar
                progress={progressValue}
                color={cat.category_color}
                style={styles.progressBar}
              />
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  catItem: {
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 10,
  },
  catName: {
    fontWeight: '700',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '800',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});
