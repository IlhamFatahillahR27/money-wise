import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, Avatar, Chip, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { ExpenseWithDetails } from '@/types/expense';
import { formatRupiah, formatTanggalIndo } from '@/utils/currency';

interface ExpenseCardProps {
  expense: ExpenseWithDetails;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const theme = useTheme();

  function handlePress() {
    router.push({
      pathname: '/expense/[id]',
      params: { id: expense.id },
    });
  }

  const categoryColor = expense.category_color || theme.colors.primary;
  const categoryIcon = expense.category_icon || 'tag-outline';

  return (
    <Card mode="elevated" style={styles.card} onPress={handlePress}>
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          {/* Avatar Kategori */}
          <Avatar.Icon
            size={42}
            icon={categoryIcon}
            style={[styles.avatar, { backgroundColor: categoryColor + '20' }]}
            color={categoryColor}
          />

          {/* Info Judul & Tanggal */}
          <View style={styles.infoCol}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
              {expense.title}
            </Text>
            <View style={styles.metaRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {formatTanggalIndo(expense.date)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                •
              </Text>
              <Text variant="bodySmall" style={{ color: categoryColor, fontWeight: '600' }}>
                {expense.category_name || 'Kategori'}
              </Text>
            </View>
          </View>

          {/* Nominal Pengeluaran */}
          <View style={styles.amountCol}>
            <Text variant="titleMedium" style={[styles.amountText, { color: theme.colors.error }]}>
              {formatRupiah(expense.total_amount)}
            </Text>
          </View>
        </View>

        {/* Cuplikan Custom Fields jika ada */}
        {expense.items.length > 0 && (
          <View style={styles.itemsRow}>
            {expense.items.slice(0, 3).map((item) => (
              <Chip key={item.id} compact style={styles.itemChip} textStyle={styles.itemChipText}>
                {item.field_name}:{' '}
                {item.field_type === 'currency'
                  ? formatRupiah(parseFloat(item.field_value) || 0)
                  : `${item.field_value}${item.unit ? ' ' + item.unit : ''}`}
              </Chip>
            ))}
            {expense.items.length > 3 && (
              <Chip compact style={styles.itemChip} textStyle={styles.itemChipText}>
                +{expense.items.length - 3} lainnya
              </Chip>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
  },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '800',
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  itemChip: {
    height: 26,
    borderRadius: 13,
  },
  itemChipText: {
    fontSize: 11,
  },
});
