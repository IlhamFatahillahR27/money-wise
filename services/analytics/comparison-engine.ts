import {
  ExpenseComparison,
  ExpenseWithDetails,
  FieldComparison,
  TrendDirection,
} from '@/types/expense';
import { parseIndoNumber } from '@/utils/currency';

export class ComparisonEngine {
  /**
   * Menghitung perbandingan head-to-head antara transaksi pengeluaran saat ini
   * dengan transaksi pengeluaran sejenis sebelumnya.
   */
  static compare(current: ExpenseWithDetails, previous: ExpenseWithDetails): ExpenseComparison {
    // 1. Perbandingan Total Nominal Transaksi
    const totalDiff = current.total_amount - previous.total_amount;
    const totalPct =
      previous.total_amount > 0
        ? Number(((totalDiff / previous.total_amount) * 100).toFixed(1))
        : 0;

    let totalTrend: TrendDirection = 'UNCHANGED';
    if (totalDiff > 0) totalTrend = 'INCREASED';
    else if (totalDiff < 0) totalTrend = 'DECREASED';

    // 2. Perbandingan Per-Field (Custom Fields)
    const prevItemsMap = new Map<string, typeof previous.items[0]>();
    for (const item of previous.items) {
      prevItemsMap.set(item.field_name.trim().toLowerCase(), item);
    }

    const fieldComparisons: FieldComparison[] = [];

    for (const currentItem of current.items) {
      const fieldKey = currentItem.field_name.trim().toLowerCase();
      const prevItem = prevItemsMap.get(fieldKey);

      if (!prevItem) {
        // Field baru yang sebelumnya tidak ada
        fieldComparisons.push({
          field_name: currentItem.field_name,
          field_type: currentItem.field_type,
          unit: currentItem.unit,
          previous_value: null,
          current_value: currentItem.field_value,
          numeric_diff: null,
          percentage_change: null,
          trend: 'NEW',
        });
        continue;
      }

      // Field ada pada kedua transaksi
      if (currentItem.field_type === 'number' || currentItem.field_type === 'currency') {
        const currentNum = parseIndoNumber(currentItem.field_value);
        const prevNum = parseIndoNumber(prevItem.field_value);
        const diff = currentNum - prevNum;

        let pct: number | null = null;
        if (prevNum !== 0) {
          pct = Number(((diff / Math.abs(prevNum)) * 100).toFixed(1));
        }

        let trend: TrendDirection = 'UNCHANGED';
        if (diff > 0) trend = 'INCREASED';
        else if (diff < 0) trend = 'DECREASED';

        fieldComparisons.push({
          field_name: currentItem.field_name,
          field_type: currentItem.field_type,
          unit: currentItem.unit || prevItem.unit,
          previous_value: prevItem.field_value,
          current_value: currentItem.field_value,
          numeric_diff: Number(diff.toFixed(2)),
          percentage_change: pct,
          trend,
        });
      } else {
        // Field tipe teks
        const isSame = currentItem.field_value.trim().toLowerCase() === prevItem.field_value.trim().toLowerCase();
        fieldComparisons.push({
          field_name: currentItem.field_name,
          field_type: 'text',
          unit: currentItem.unit,
          previous_value: prevItem.field_value,
          current_value: currentItem.field_value,
          numeric_diff: null,
          percentage_change: null,
          trend: isSame ? 'UNCHANGED' : 'NEW',
        });
      }
    }

    return {
      current_expense: current,
      previous_expense: previous,
      total_diff: Number(totalDiff.toFixed(2)),
      total_percentage_change: totalPct,
      total_trend: totalTrend,
      field_comparisons: fieldComparisons,
    };
  }
}
