import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ExpenseWithDetails } from '@/types/expense';
import { formatTanggalIndo } from '@/utils/currency';

export class ExcelExportService {
  /**
   * Mengonversi daftar pengeluaran beserta rincian custom fields ke format workbook Excel (.xlsx)
   * dan memicu native share sheet ponsel (bisa simpan ke File lokal / kirim WhatsApp / Email).
   */
  static async exportToExcel(expenses: ExpenseWithDetails[]): Promise<string> {
    if (expenses.length === 0) {
      throw new Error('Tidak ada data pengeluaran untuk diekspor.');
    }

    // 1. Siapkan Baris Data (Array of Arrays)
    const headerRow = [
      'No',
      'Tanggal',
      'Judul Pengeluaran',
      'Kategori',
      'Total Pengeluaran (Rp)',
      'Rincian Custom Fields',
      'Catatan',
    ];

    const dataRows = expenses.map((exp, index) => {
      // Gabungkan rincian custom fields menjadi 1 string yang rapi
      const itemsDetailStr = exp.items
        .map((it) => `${it.field_name}: ${it.field_value}${it.unit ? ' ' + it.unit : ''}`)
        .join(' | ');

      return [
        index + 1,
        exp.date,
        exp.title,
        exp.category_name || 'Umum',
        exp.total_amount,
        itemsDetailStr || '-',
        exp.notes || '-',
      ];
    });

    const worksheetData = [headerRow, ...dataRows];

    // 2. Buat Worksheet & Workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Atur lebar kolom agar rapi saat dibuka di Excel
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // Tanggal
      { wch: 25 }, // Judul
      { wch: 18 }, // Kategori
      { wch: 22 }, // Total Rp
      { wch: 45 }, // Rincian Fields
      { wch: 30 }, // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pengeluaran');

    // 3. Tulis Workbook ke format Base64 binary
    const base64Data = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx',
    });

    // 4. Simpan ke sistem file lokal ponsel
    const fileName = `MoneyWise_Pengeluaran_${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 5. Buka Native Share Sheet ponsel
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Simpan atau Bagikan File Excel Pengeluaran',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }

    return fileUri;
  }
}
