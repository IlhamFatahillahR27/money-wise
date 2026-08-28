import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { PeriodType } from '@/types/expense';

interface PeriodSelectorProps {
  selectedPeriod: PeriodType;
  onSelectPeriod: (period: PeriodType) => void;
}

export function PeriodSelector({ selectedPeriod, onSelectPeriod }: PeriodSelectorProps) {
  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={selectedPeriod}
        onValueChange={(val) => onSelectPeriod(val as PeriodType)}
        density="medium"
        buttons={[
          { value: 'week', label: 'Minggu Ini' },
          { value: 'month', label: 'Bulan Ini' },
          { value: 'year', label: 'Tahun Ini' },
          { value: 'all', label: 'Semua' },
        ]}
      />
    </View>
  );
}

/**
 * Utility helper untuk menghitung tanggal mulai dan akhir berdasarkan PeriodType
 */
export function getPeriodDateRange(period: PeriodType): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (period === 'week') {
    // 7 hari ke belakang dari hari ini
    const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const wYear = weekAgo.getFullYear();
    const wMonth = String(weekAgo.getMonth() + 1).padStart(2, '0');
    const wDay = String(weekAgo.getDate()).padStart(2, '0');
    return {
      startDate: `${wYear}-${wMonth}-${wDay}`,
      endDate: todayStr,
    };
  }

  if (period === 'month') {
    // Dari tanggal 1 bulan ini sampai hari terakhir bulan ini
    const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).getDate();
    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`,
    };
  }

  if (period === 'year') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  // 'all'
  return {
    startDate: '2000-01-01',
    endDate: '2099-12-31',
  };
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
});
