import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
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
import { formatThousand, parseIndoNumber, terbilangSingkat, formatRupiah } from '@/utils/currency';
import {
  evaluateArithmeticExpression,
  hasArithmeticOperator,
  sanitizeArithmeticInput,
  formatCalculationResult,
} from '@/utils/calculator';

export type CustomFieldDraft = Omit<ExpenseCustomField, 'id' | 'expense_id'>;

interface CustomFieldInputListProps {
  fields: CustomFieldDraft[];
  onChangeFields: (fields: CustomFieldDraft[]) => void;
  totalAmount?: string;
}

export function CustomFieldInputList({
  fields,
  onChangeFields,
  totalAmount,
}: CustomFieldInputListProps) {
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

  function handleFieldValueChange(index: number, val: string) {
    const field = fields[index];
    if (field.field_type === 'text') {
      handleUpdateField(index, 'field_value', val);
      return;
    }

    const clean = sanitizeArithmeticInput(val);

    // Jika user mengetik '=', langsung evaluasi sekarang
    if (clean.includes('=')) {
      const expr = clean.replace(/=/g, '');
      const evaluated = evaluateArithmeticExpression(expr);
      if (evaluated !== null) {
        const finalVal = formatCalculationResult(evaluated, field.field_type);
        handleUpdateField(index, 'field_value', finalVal);
        return;
      }
    }

    if (hasArithmeticOperator(clean)) {
      handleUpdateField(index, 'field_value', clean);
    } else {
      const formatted = field.field_type === 'currency' ? formatThousand(clean) : clean;
      handleUpdateField(index, 'field_value', formatted);
    }
  }

  function handleFieldValueBlur(index: number) {
    const field = fields[index];
    if (field.field_type === 'text') return;

    if (hasArithmeticOperator(field.field_value)) {
      const evaluated = evaluateArithmeticExpression(field.field_value);
      if (evaluated !== null) {
        const finalVal = formatCalculationResult(evaluated, field.field_type);
        handleUpdateField(index, 'field_value', finalVal);
      }
    }
  }

  function handleAppendFieldOperator(index: number, op: string) {
    const field = fields[index];
    const current = field.field_value.trim();
    if (!current) return;
    let nextVal = current;
    if (/[+\-*xX×/:\u00F7]$/.test(current)) {
      nextVal = current.slice(0, -1) + op;
    } else {
      nextVal = current + op;
    }
    handleUpdateField(index, 'field_value', nextVal);
  }

  function handleApplyFieldArithmetic(index: number, result: number) {
    const field = fields[index];
    const finalVal = formatCalculationResult(result, field.field_type);
    handleUpdateField(index, 'field_value', finalVal);
  }

  function handleInsertReference(index: number, insertValue: string) {
    const field = fields[index];
    if (!field) return;

    const current = (field.field_value || '').trim();

    let nextVal = '';
    if (!current) {
      nextVal = insertValue;
    } else if (/[+\-*xX×/:\u00F7(]$/.test(current)) {
      nextVal = current + insertValue;
    } else {
      // Jika belum ada operator di akhir, gantikan nilainya
      nextVal = insertValue;
    }

    handleFieldValueChange(index, nextVal);
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
        fields.map((field, index) => {
          const isFieldArithmetic =
            field.field_type !== 'text' && hasArithmeticOperator(field.field_value);
          const fieldArithmeticResult = isFieldArithmetic
            ? evaluateArithmeticExpression(field.field_value)
            : null;

          // 1. Kumpulkan referensi nilai yang tersedia (Total utama & rincian lainnya)
          const availableRefs: { id: string; label: string; value: string }[] = [];
          const totalNum = parseIndoNumber(totalAmount || '');
          if (totalNum > 0) {
            availableRefs.push({
              id: 'total',
              label: `Total: ${formatThousand(totalNum)}`,
              value: formatThousand(totalNum),
            });
          }

          fields.forEach((otherF, otherIdx) => {
            if (otherIdx === index || otherF.field_type === 'text') return;
            const otherVal = (otherF.field_value || '').trim();
            if (!otherVal) return;

            const evaluated =
              evaluateArithmeticExpression(otherVal) ?? parseIndoNumber(otherVal);
            if (evaluated !== null && !isNaN(evaluated) && evaluated !== 0) {
              const title = otherF.field_name.trim() || `Item #${otherIdx + 1}`;
              const formattedVal =
                otherF.field_type === 'currency'
                  ? formatThousand(evaluated)
                  : String(evaluated);
              availableRefs.push({
                id: `field-${otherIdx}`,
                label: `${title}: ${formattedVal}`,
                value: formattedVal,
              });
            }
          });

          // 2. Hitung sisa saldo dari Total (Auto-Balance) khusus untuk field bertipe currency
          let remainingBalance: number | null = null;
          if (totalNum > 0 && field.field_type === 'currency') {
            const sumOtherCurrency = fields
              .filter((f, idx) => idx !== index && f.field_type === 'currency')
              .reduce((acc, f) => {
                const val =
                  evaluateArithmeticExpression(f.field_value) ??
                  parseIndoNumber(f.field_value);
                return acc + (isNaN(val) ? 0 : val);
              }, 0);
            remainingBalance = totalNum - sumOtherCurrency;
          }

          return (
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
                        ? '150.000 atau e.g. 1000*59'
                        : field.field_type === 'number'
                        ? '120 atau e.g. 50*2'
                        : 'Keterangan'
                    }
                    value={field.field_value}
                    onChangeText={(val) => handleFieldValueChange(index, val)}
                    onBlur={() => handleFieldValueBlur(index)}
                    onSubmitEditing={() => handleFieldValueBlur(index)}
                    keyboardType="default"
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

                {/* Quick Operator Bar untuk custom fields numeric/currency */}
                {field.field_type !== 'text' && (
                  <View style={styles.operatorRow}>
                    <Text variant="labelSmall" style={[styles.operatorLabel, { color: theme.dark ? '#94A3B8' : '#475569' }]}>
                      Kalkulator:
                    </Text>
                    {['+', '-', '*', '/'].map((op) => {
                      const displayLabel = op === '*' ? '×' : op === '/' ? '÷' : op;
                      return (
                        <TouchableOpacity
                          key={op}
                          activeOpacity={0.7}
                          style={[
                            styles.calcBtn,
                            {
                              backgroundColor: theme.dark ? '#334155' : '#E2E8F0',
                              borderColor: theme.dark ? '#475569' : '#CBD5E1',
                            },
                          ]}
                          onPress={() => handleAppendFieldOperator(index, op)}>
                          <Text style={[styles.calcBtnText, { color: theme.dark ? '#F8FAFC' : '#0F172A' }]}>
                            {displayLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {fieldArithmeticResult !== null && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.calcBtnEqual, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleApplyFieldArithmetic(index, fieldArithmeticResult)}>
                        <Text style={styles.calcBtnEqualText}>= Hitung</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Sisipkan Referensi Nilai dari Total / Rincian Lain */}
                {field.field_type !== 'text' && availableRefs.length > 0 && (
                  <View style={styles.refRow}>
                    <Text
                      variant="labelSmall"
                      style={[styles.refLabel, { color: theme.dark ? '#94A3B8' : '#475569' }]}>
                      Sisipkan:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      contentContainerStyle={styles.refScroll}>
                      {availableRefs.map((ref) => (
                        <TouchableOpacity
                          key={ref.id}
                          activeOpacity={0.7}
                          style={[
                            styles.refChip,
                            {
                              backgroundColor: theme.dark ? '#1E293B' : '#EFF6FF',
                              borderColor: theme.dark ? '#334155' : '#BFDBFE',
                            },
                          ]}
                          onPress={() => handleInsertReference(index, ref.value)}>
                          <Text
                            style={[
                              styles.refChipText,
                              { color: theme.dark ? '#38BDF8' : '#0284C7' },
                            ]}>
                            {ref.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Tombol Cepat: Isi Sisa Total (Auto-Balance) khusus tipe Currency */}
                {field.field_type === 'currency' && remainingBalance !== null && (
                  <View style={styles.balanceContainer}>
                    {parseIndoNumber(field.field_value) !== remainingBalance && remainingBalance > 0 ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[
                          styles.autoBalanceBtn,
                          {
                            backgroundColor: theme.dark ? '#064E3B' : '#ECFDF5',
                            borderColor: theme.dark ? '#059669' : '#A7F3D0',
                          },
                        ]}
                        onPress={() =>
                          handleUpdateField(index, 'field_value', formatThousand(remainingBalance!))
                        }>
                        <Text
                          style={[
                            styles.autoBalanceText,
                            { color: theme.dark ? '#6EE7B7' : '#047857' },
                          ]}>
                          ⚡ Isi Sisa Total: {formatRupiah(remainingBalance)}
                        </Text>
                      </TouchableOpacity>
                    ) : parseIndoNumber(field.field_value) === remainingBalance && remainingBalance > 0 ? (
                      <View style={styles.balancedBadge}>
                        <Text style={styles.balancedText}>
                          ✓ Pas dengan sisa Total ({formatRupiah(remainingBalance)})
                        </Text>
                      </View>
                    ) : remainingBalance < 0 ? (
                      <Text style={styles.overBalanceText}>
                        ⚠️ Melebihi Total sebesar {formatRupiah(Math.abs(remainingBalance))}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Live Preview Hasil Kalkulasi jika sedang mengetik operasi aritmatika */}
                {isFieldArithmetic && fieldArithmeticResult !== null && (
                  <TouchableOpacity
                    onPress={() => handleApplyFieldArithmetic(index, fieldArithmeticResult)}
                    style={styles.mathPreviewBadge}>
                    <Text variant="bodySmall" style={styles.mathPreviewText}>
                      💡 Hasil: {field.field_type === 'currency' ? formatRupiah(fieldArithmeticResult) : fieldArithmeticResult} — Ketuk untuk terapkan
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Helper pembacaan angka nol untuk tipe currency */}
                {!isFieldArithmetic && field.field_type === 'currency' && parseIndoNumber(field.field_value) > 0 && (
                  <Text variant="bodySmall" style={styles.currencyHelper}>
                    Terbaca: Rp {field.field_value} ({terbilangSingkat(parseIndoNumber(field.field_value))})
                  </Text>
                )}
              </Card.Content>
            </Card>
          );
        })
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
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  operatorLabel: {
    fontWeight: '700',
    marginRight: 2,
  },
  calcBtn: {
    minWidth: 38,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  calcBtnEqual: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnEqualText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  mathPreviewBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  mathPreviewText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    marginBottom: 4,
  },
  refLabel: {
    fontWeight: '700',
    marginRight: 2,
  },
  refScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  refChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  refChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  balanceContainer: {
    marginVertical: 3,
  },
  autoBalanceBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  autoBalanceText: {
    fontWeight: '700',
    fontSize: 12.5,
  },
  balancedBadge: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  balancedText: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 12,
  },
  overBalanceText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
});
