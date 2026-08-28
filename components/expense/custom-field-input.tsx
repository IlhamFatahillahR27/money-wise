import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Card,
  TextInput,
  SegmentedButtons,
  IconButton,
  Button,
  Text,
  useTheme,
} from 'react-native-paper';
import { CustomFieldType, ExpenseCustomField } from '@/types/expense';
import { formatThousand, parseIndoNumber, terbilangSingkat } from '@/utils/currency';

export type CustomFieldDraft = Omit<ExpenseCustomField, 'id' | 'expense_id'>;

interface CustomFieldInputListProps {
  fields: CustomFieldDraft[];
  onChangeFields: (fields: CustomFieldDraft[]) => void;
}

export function CustomFieldInputList({ fields, onChangeFields }: CustomFieldInputListProps) {
  const theme = useTheme();

  function handleAddField() {
    const newField: CustomFieldDraft = {
      field_name: '',
      field_value: '',
      field_type: 'number',
      unit: '',
      order_index: fields.length,
    };
    onChangeFields([...fields, newField]);
  }

  function handleRemoveField(index: number) {
    const updated = fields.filter((_, i) => i !== index);
    // update order_index
    const reordered = updated.map((f, i) => ({ ...f, order_index: i }));
    onChangeFields(reordered);
  }

  function handleUpdateField<K extends keyof CustomFieldDraft>(
    index: number,
    key: K,
    value: CustomFieldDraft[K]
  ) {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    onChangeFields(updated);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text variant="titleSmall" style={styles.title}>
            Rincian Item / Custom Fields
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Tambahkan rincian khusus (e.g. kWh, tarif listrik, jumlah barang)
          </Text>
        </View>
        <Button
          mode="contained-tonal"
          icon="plus"
          compact
          onPress={handleAddField}
          style={styles.addButton}>
          Tambah
        </Button>
      </View>

      {fields.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Belum ada rincian custom field. Klik tombol &quot;Tambah&quot; di atas untuk mencatat rincian pengeluaran ini.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        fields.map((field, index) => (
          <Card key={index} mode="outlined" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* Baris Atas: Judul Field & Tombol Hapus */}
              <View style={styles.rowTop}>
                <TextInput
                  label={`Nama Rincian #${index + 1}`}
                  placeholder="e.g. kWh Digunakan, Tarif Listrik, Sewa"
                  value={field.field_name}
                  onChangeText={(val) => handleUpdateField(index, 'field_name', val)}
                  mode="outlined"
                  dense
                  style={styles.flexInput}
                />
                <IconButton
                  icon="trash-can-outline"
                  iconColor={theme.colors.error}
                  size={22}
                  onPress={() => handleRemoveField(index)}
                />
              </View>

              {/* Tipe Nilai (Angka / Mata Uang / Teks) */}
              <View style={styles.rowType}>
                <SegmentedButtons
                  value={field.field_type}
                  onValueChange={(val) => handleUpdateField(index, 'field_type', val as CustomFieldType)}
                  density="small"
                  buttons={[
                    { value: 'number', label: 'Angka' },
                    { value: 'currency', label: 'Rupiah (Rp)' },
                    { value: 'text', label: 'Teks' },
                  ]}
                />
              </View>

              {/* Baris Bawah: Input Nilai & Satuan (Opsional) */}
              <View style={styles.rowBottom}>
                <TextInput
                  label="Nilai"
                  placeholder={
                    field.field_type === 'currency'
                      ? '150.000'
                      : field.field_type === 'number'
                      ? '120'
                      : 'Keterangan'
                  }
                  value={field.field_value}
                  onChangeText={(val) => {
                    const formatted = field.field_type === 'currency' ? formatThousand(val) : val;
                    handleUpdateField(index, 'field_value', formatted);
                  }}
                  keyboardType={field.field_type === 'text' ? 'default' : 'numeric'}
                  left={field.field_type === 'currency' ? <TextInput.Affix text="Rp " /> : undefined}
                  mode="outlined"
                  dense
                  style={styles.flexInput}
                />

                {field.field_type !== 'text' && (
                  <TextInput
                    label="Satuan (opsional)"
                    placeholder="kWh, kg, dll"
                    value={field.unit || ''}
                    onChangeText={(val) => handleUpdateField(index, 'unit', val)}
                    mode="outlined"
                    dense
                    style={styles.unitInput}
                  />
                )}
              </View>

              {/* Helper pembacaan angka nol untuk tipe currency */}
              {field.field_type === 'currency' && parseIndoNumber(field.field_value) > 0 && (
                <Text variant="bodySmall" style={styles.currencyHelper}>
                  Terbaca: Rp {field.field_value} ({terbilangSingkat(parseIndoNumber(field.field_value))})
                </Text>
              )}
            </Card.Content>
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontWeight: '700',
  },
  addButton: {
    borderRadius: 8,
  },
  emptyCard: {
    borderRadius: 12,
    marginVertical: 4,
  },
  emptyContent: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  card: {
    marginBottom: 10,
    borderRadius: 12,
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowType: {
    marginVertical: 2,
  },
  rowBottom: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
  },
  unitInput: {
    width: 130,
  },
  currencyHelper: {
    color: '#0a7ea4',
    fontWeight: '600',
    marginTop: 2,
  },
});
