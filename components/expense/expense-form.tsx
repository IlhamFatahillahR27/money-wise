import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Banner,
  Snackbar,
  useTheme,
  Text,
} from 'react-native-paper';
import { router } from 'expo-router';
import { Category, ExpenseWithDetails } from '@/types/expense';
import { CategoryPicker } from './category-picker';
import { CustomFieldDraft, CustomFieldInputList } from './custom-field-input';
import { ExpenseRepository } from '@/services/db/expense-repository';
import {
  formatThousand,
  parseIndoNumber,
  terbilangSingkat,
  formatRupiah,
} from '@/utils/currency';
import {
  evaluateArithmeticExpression,
  hasArithmeticOperator,
  sanitizeArithmeticInput,
  formatCalculationResult,
} from '@/utils/calculator';

interface ExpenseFormProps {
  initialExpense?: ExpenseWithDetails;
  onSuccess?: () => void;
}

export function ExpenseForm({ initialExpense, onSuccess }: ExpenseFormProps) {
  const theme = useTheme();

  const [title, setTitle] = useState(initialExpense?.title || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialExpense?.category_id || ''
  );
  const [totalAmount, setTotalAmount] = useState(
    initialExpense ? formatThousand(initialExpense.total_amount) : ''
  );
  const [date, setDate] = useState(
    initialExpense?.date || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(initialExpense?.notes || '');
  const [fields, setFields] = useState<CustomFieldDraft[]>(
    initialExpense?.items.map((it) => ({
      field_name: it.field_name,
      field_value: it.field_value,
      field_type: it.field_type,
      unit: it.unit,
      order_index: it.order_index,
    })) || []
  );

  // Template suggestion state
  const [previousExpense, setPreviousExpense] = useState<ExpenseWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Saat selesai mengetik judul, cari apakah ada pencatatan serupa sebelumnya
  async function checkPreviousTemplate(enteredTitle: string) {
    if (initialExpense || !enteredTitle.trim()) return;

    try {
      const prev = await ExpenseRepository.getLatestExpenseByTitle(enteredTitle.trim());
      if (prev && prev.items.length > 0) {
        setPreviousExpense(prev);
      } else {
        setPreviousExpense(null);
      }
    } catch {
      setPreviousExpense(null);
    }
  }

  function handleApplyTemplate() {
    if (!previousExpense) return;

    // Terapkan kategori dari template jika belum diubah
    if (previousExpense.category_id) {
      setSelectedCategoryId(previousExpense.category_id);
    }

    // Salin struktur custom field dari catatan sebelumnya
    const templatedFields: CustomFieldDraft[] = previousExpense.items.map((it, idx) => ({
      field_name: it.field_name,
      field_value: it.field_value, // nilai sebelumnya sebagai referensi
      field_type: it.field_type,
      unit: it.unit,
      order_index: idx,
    }));

    setFields(templatedFields);
    setPreviousExpense(null); // sembunyikan banner
  }

  // Menghitung total otomatis dari sub-rincian yang bertipe 'currency'
  function handleCalculateFromFields() {
    const currencyFields = fields.filter((f) => f.field_type === 'currency');
    if (currencyFields.length === 0) {
      setErrorMsg('Tidak ada rincian field bertipe Rupiah untuk dihitung.');
      return;
    }

    const sum = currencyFields.reduce((acc, curr) => {
      return acc + parseIndoNumber(curr.field_value);
    }, 0);

    setTotalAmount(formatThousand(sum));
  }

  function handleTotalAmountChange(val: string) {
    const clean = sanitizeArithmeticInput(val);

    // Jika user mengetik '=', langsung evaluasi hasil sekarang
    if (clean.includes('=')) {
      const expr = clean.replace(/=/g, '');
      const evaluated = evaluateArithmeticExpression(expr);
      if (evaluated !== null && evaluated >= 0) {
        setTotalAmount(formatThousand(evaluated));
        return;
      }
    }

    if (hasArithmeticOperator(clean)) {
      setTotalAmount(clean);
    } else {
      setTotalAmount(formatThousand(clean));
    }
  }

  function handleTotalAmountBlur() {
    if (hasArithmeticOperator(totalAmount)) {
      const evaluated = evaluateArithmeticExpression(totalAmount);
      if (evaluated !== null && evaluated >= 0) {
        setTotalAmount(formatThousand(evaluated));
      }
    }
  }

  function handleAppendTotalOperator(op: string) {
    const current = totalAmount.trim();
    if (!current) return;
    if (/[+\-*xX×/:\u00F7]$/.test(current)) {
      setTotalAmount(current.slice(0, -1) + op);
    } else {
      setTotalAmount(current + op);
    }
  }

  function handleApplyTotalArithmetic() {
    const evaluated = evaluateArithmeticExpression(totalAmount);
    if (evaluated !== null && evaluated >= 0) {
      setTotalAmount(formatThousand(evaluated));
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setErrorMsg('Judul pengeluaran wajib diisi.');
      return;
    }
    if (!selectedCategoryId) {
      setErrorMsg('Silakan pilih kategori pengeluaran.');
      return;
    }

    // Evaluasi jika kolom total masih memuat ekspresi aritmatika
    let finalTotalStr = totalAmount;
    if (hasArithmeticOperator(finalTotalStr)) {
      const evaluated = evaluateArithmeticExpression(finalTotalStr);
      if (evaluated !== null && evaluated > 0) {
        finalTotalStr = evaluated.toString();
        setTotalAmount(formatThousand(evaluated));
      } else {
        setErrorMsg('Perhitungan pada total nominal belum selesai atau tidak valid.');
        return;
      }
    }

    const amountNum = parseIndoNumber(finalTotalStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Total nominal pengeluaran harus lebih dari 0.');
      return;
    }
    if (!date.trim()) {
      setErrorMsg('Tanggal transaksi wajib diisi (YYYY-MM-DD).');
      return;
    }

    try {
      setIsSubmitting(true);

      // Evaluasi rincian custom fields jika masih ada ekspresi matematika yang belum terhitung
      const evaluatedFields = fields.map((f) => {
        if (f.field_type !== 'text' && hasArithmeticOperator(f.field_value)) {
          const evaluated = evaluateArithmeticExpression(f.field_value);
          if (evaluated !== null) {
            return {
              ...f,
              field_value: formatCalculationResult(evaluated, f.field_type),
            };
          }
        }
        return f;
      });

      // Bersihkan fields yang memiliki nama kosong
      const validFields = evaluatedFields.filter((f) => f.field_name.trim().length > 0);

      await ExpenseRepository.createExpense(
        {
          title: title.trim(),
          category_id: selectedCategoryId,
          total_amount: amountNum,
          date: date.trim(),
          notes: notes.trim() || null,
        },
        validFields
      );

      if (onSuccess) {
        onSuccess();
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error('Error menyimpan pengeluaran:', error);
      setErrorMsg('Gagal menyimpan pengeluaran: ' + (error?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isArithmetic = hasArithmeticOperator(totalAmount);
  const arithmeticResult = isArithmetic ? evaluateArithmeticExpression(totalAmount) : null;
  const parsedTotalAmount = parseIndoNumber(totalAmount);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={true}>
        {/* Banner Auto-Template jika ada pengeluaran serupa sebelumnya */}
        {previousExpense && (
          <Banner
            visible={true}
            actions={[
              {
                label: 'Gunakan Rincian Ini',
                onPress: handleApplyTemplate,
              },
              {
                label: 'Abaikan',
                onPress: () => setPreviousExpense(null),
              },
            ]}
            icon="lightbulb-on-outline"
            style={styles.banner}>
            Ditemukan catatan sebelumnya: &quot;{previousExpense.title}&quot; dengan{' '}
            {previousExpense.items.length} rincian field. Ingin gunakan rincian yang sama?
          </Banner>
        )}

        {/* Input Judul Pengeluaran */}
        <TextInput
          label="Judul Pengeluaran *"
          placeholder="e.g. Kos Bulanan, Belanja Mingguan"
          value={title}
          onChangeText={setTitle}
          onBlur={() => checkPreviousTemplate(title)}
          mode="outlined"
          style={styles.input}
        />

        {/* Pemilih Kategori (Dukungan Auto-Create) */}
        <CategoryPicker
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(cat: Category) => setSelectedCategoryId(cat.id)}
        />

        {/* Input Total Pengeluaran & Helper Hitung */}
        <View style={styles.amountContainer}>
          <TextInput
            label="Total Nominal Pengeluaran (Rp) *"
            placeholder="0 atau e.g. 1000*59"
            value={totalAmount}
            onChangeText={handleTotalAmountChange}
            onBlur={handleTotalAmountBlur}
            onSubmitEditing={handleTotalAmountBlur}
            keyboardType="default"
            left={<TextInput.Affix text="Rp " />}
            mode="outlined"
            style={[styles.input, { flex: 1 }]}
          />
          {fields.some((f) => f.field_type === 'currency') && (
            <Button
              mode="text"
              icon="calculator"
              onPress={handleCalculateFromFields}
              style={styles.calcButton}>
              Hitung dari Rincian
            </Button>
          )}
        </View>

        {/* Quick Operator Bar untuk input Total */}
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
                onPress={() => handleAppendTotalOperator(op)}>
                <Text style={[styles.calcBtnText, { color: theme.dark ? '#F8FAFC' : '#0F172A' }]}>
                  {displayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
          {arithmeticResult !== null && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.calcBtnEqual, { backgroundColor: theme.colors.primary }]}
              onPress={handleApplyTotalArithmetic}>
              <Text style={styles.calcBtnEqualText}>= Hitung</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Live Preview Hasil Kalkulasi jika sedang mengetik operasi aritmatika */}
        {isArithmetic && arithmeticResult !== null && (
          <TouchableOpacity onPress={handleApplyTotalArithmetic} style={styles.mathPreviewBadge}>
            <Text variant="bodySmall" style={styles.mathPreviewText}>
              💡 Hasil Hitung: {formatRupiah(arithmeticResult)} ({terbilangSingkat(arithmeticResult)}) — Ketuk untuk terapkan
            </Text>
          </TouchableOpacity>
        )}

        {/* Helper teks terbilang rupiah jika bukan ekspresi matematika aktif */}
        {!isArithmetic && parsedTotalAmount > 0 && (
          <Text variant="bodySmall" style={styles.amountHelper}>
            💰 Terbaca: {formatRupiah(parsedTotalAmount)} ({terbilangSingkat(parsedTotalAmount)})
          </Text>
        )}

        {/* Input Tanggal Transaksi */}
        <TextInput
          label="Tanggal (YYYY-MM-DD) *"
          value={date}
          onChangeText={setDate}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="calendar" />}
        />

        {/* Dynamic Custom Fields */}
        <CustomFieldInputList fields={fields} onChangeFields={setFields} />

        {/* Catatan Tambahan */}
        <TextInput
          label="Catatan Tambahan (Opsional)"
          placeholder="e.g. Dibayar via transfer BCA"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        {/* Tombol Simpan */}
        <Button
          mode="contained"
          icon="check"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}>
          Simpan Pengeluaran
        </Button>
      </ScrollView>

      {/* Notifikasi Error */}
      <Snackbar
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg('')}
        duration={3500}
        action={{
          label: 'Tutup',
          onPress: () => setErrorMsg(''),
        }}>
        {errorMsg}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 280, // Ruang lega agar input catatan & tombol simpan tidak tertutup keyboard di Android
  },
  banner: {
    marginBottom: 12,
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
  },
  amountContainer: {
    marginBottom: 4,
  },
  amountHelper: {
    color: '#0a7ea4',
    fontWeight: '700',
    marginTop: -2,
    marginBottom: 10,
  },
  calcButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 10,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    marginTop: 2,
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
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  mathPreviewText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
});
