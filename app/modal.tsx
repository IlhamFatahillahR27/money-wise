import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ExpenseForm } from '@/components/expense/expense-form';
import { useTheme } from 'react-native-paper';

export default function ModalScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ExpenseForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
