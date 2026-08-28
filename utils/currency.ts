/**
 * Format angka ke format Rupiah Indonesia (IDR).
 * Contoh: 1500000 -> "Rp 1.500.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format input string menjadi ribuan dengan pemisah titik (.).
 * Contoh: "1500000" -> "1.500.000"
 */
export function formatThousand(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  if (!clean) return '';
  const num = parseInt(clean, 10);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Menghilangkan titik pemisah ribuan agar siap disimpan sebagai angka.
 * Contoh: "1.500.000" -> "1500000"
 */
export function cleanThousand(val: string): string {
  if (!val) return '';
  return val.replace(/[^0-9]/g, '');
}

/**
 * Mem-parsing angka format Indonesia ke number murni.
 * Mendukung format ribuan bertitik "150.000" dan desimal berkoma "25,5" atau "25.5".
 */
export function parseIndoNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const str = val.trim();
  if (!str) return 0;

  // Jika mengandung koma sebagai desimal (e.g. "25,5")
  if (str.includes(',') && !str.includes('.')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }

  // Jika mengandung titik pemisah ribuan (e.g. "150.000" atau "1.500.000")
  if (str.includes('.')) {
    // Cek apakah ada koma desimal di belakang titik (e.g. "1.500,50")
    if (str.includes(',')) {
      const normalized = str.replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized) || 0;
    }
    // Jika hanya titik, di Indonesia dianggap pemisah ribuan
    const clean = str.replace(/\./g, '');
    return parseFloat(clean) || 0;
  }

  const clean = str.replace(/[^0-9.-]/g, '');
  return parseFloat(clean) || 0;
}

/**
 * Menghasilkan terbilang singkat dalam Bahasa Indonesia untuk membantu pengguna
 * membaca jumlah nol besar dengan cepat.
 * Contoh: 1500000 -> "1,5 Juta", 50000 -> "50 Ribu", 2500000000 -> "2,5 Miliar"
 */
export function terbilangSingkat(num: number): string {
  if (isNaN(num) || num <= 0) return '';
  if (num >= 1_000_000_000) {
    const val = (num / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',');
    return `${val} Miliar`;
  }
  if (num >= 1_000_000) {
    const val = (num / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',');
    return `${val} Juta`;
  }
  if (num >= 1_000) {
    const val = (num / 1_000).toFixed(0);
    return `${val} Ribu`;
  }
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format tanggal ISO ('YYYY-MM-DD') ke format tanggal Indonesia.
 * Contoh: "2026-08-28" -> "28 Agu 2026"
 */
export function formatTanggalIndo(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}
