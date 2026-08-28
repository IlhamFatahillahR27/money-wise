import {
  Category,
  CategorySummary,
  CloudSyncPayload,
  Expense,
  ExpenseCustomField,
  ExpenseWithDetails,
  PeriodicSummary,
  RetentionPeriod,
} from '@/types/expense';
import { getDatabase } from './database';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export interface ExpenseFilter {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
  categoryId?: string;
  searchQuery?: string;
}

export class ExpenseRepository {
  /**
   * Menyimpan pengeluaran baru beserta seluruh custom fields-nya dalam 1 transaksi ACID.
   */
  static async createExpense(
    data: {
      title: string;
      category_id: string;
      total_amount: number;
      date: string;
      notes?: string | null;
    },
    items: Omit<ExpenseCustomField, 'id' | 'expense_id'>[] = []
  ): Promise<ExpenseWithDetails> {
    const db = await getDatabase();
    const expenseId = generateId('exp');
    const now = Date.now();

    const newExpense: Expense = {
      id: expenseId,
      title: data.title.trim(),
      category_id: data.category_id,
      total_amount: data.total_amount,
      date: data.date,
      notes: data.notes?.trim() || null,
      is_synced: 0,
      synced_at: null,
      updated_at: now,
      is_deleted: 0,
      created_at: now,
    };

    const createdItems: ExpenseCustomField[] = items.map((item, index) => ({
      id: generateId('item'),
      expense_id: expenseId,
      field_name: item.field_name.trim(),
      field_value: item.field_value.trim(),
      field_type: item.field_type,
      unit: item.unit ? item.unit.trim() : null,
      order_index: item.order_index ?? index,
    }));

    await db.withTransactionAsync(async () => {
      // 1. Simpan Master Expense
      await db.runAsync(
        `INSERT INTO expenses (
          id, title, category_id, total_amount, date, notes,
          is_synced, synced_at, updated_at, is_deleted, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newExpense.id,
          newExpense.title,
          newExpense.category_id,
          newExpense.total_amount,
          newExpense.date,
          newExpense.notes ?? null,
          newExpense.is_synced,
          newExpense.synced_at ?? null,
          newExpense.updated_at,
          newExpense.is_deleted,
          newExpense.created_at,
        ]
      );

      // 2. Simpan Custom Fields
      for (const item of createdItems) {
        await db.runAsync(
          `INSERT INTO expense_items (
            id, expense_id, field_name, field_value, field_type, unit, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            item.id,
            item.expense_id,
            item.field_name,
            item.field_value,
            item.field_type,
            item.unit ?? null,
            item.order_index,
          ]
        );
      }
    });

    const detailed = await this.getExpenseById(expenseId);
    if (!detailed) {
      throw new Error('Gagal mengambil data pengeluaran yang baru dibuat');
    }
    return detailed;
  }

  /**
   * Mengambil satu data pengeluaran lengkap dengan kategori dan seluruh custom fields-nya.
   */
  static async getExpenseById(id: string): Promise<ExpenseWithDetails | null> {
    const db = await getDatabase();

    const expenseRow = await db.getFirstAsync<
      Expense & { category_name: string; category_icon: string; category_color: string }
    >(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.id = ? AND e.is_deleted = 0;`,
      [id]
    );

    if (!expenseRow) {
      return null;
    }

    const items = await db.getAllAsync<ExpenseCustomField>(
      `SELECT * FROM expense_items WHERE expense_id = ? ORDER BY order_index ASC;`,
      [id]
    );

    return {
      ...expenseRow,
      items,
    };
  }

  /**
   * Mengambil daftar seluruh pengeluaran dengan filter tanggal, kategori, dan pencarian teks.
   */
  static async getExpenses(filter?: ExpenseFilter): Promise<ExpenseWithDetails[]> {
    const db = await getDatabase();
    let query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.is_deleted = 0
    `;
    const params: any[] = [];

    if (filter?.startDate) {
      query += ` AND e.date >= ?`;
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      query += ` AND e.date <= ?`;
      params.push(filter.endDate);
    }
    if (filter?.categoryId) {
      query += ` AND e.category_id = ?`;
      params.push(filter.categoryId);
    }
    if (filter?.searchQuery) {
      query += ` AND (e.title LIKE ? OR e.notes LIKE ?)`;
      const searchPattern = `%${filter.searchQuery.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY e.date DESC, e.created_at DESC;`;

    const expenseRows = await db.getAllAsync<
      Expense & { category_name: string; category_icon: string; category_color: string }
    >(query, ...params);

    if (expenseRows.length === 0) {
      return [];
    }

    // Ambil semua items untuk transaksi-transaksi ini
    const expenseIds = expenseRows.map((e) => e.id);
    const placeholders = expenseIds.map(() => '?').join(',');
    const allItems = await db.getAllAsync<ExpenseCustomField>(
      `SELECT * FROM expense_items WHERE expense_id IN (${placeholders}) ORDER BY order_index ASC;`,
      ...expenseIds
    );

    // Group items by expense_id
    const itemsMap = new Map<string, ExpenseCustomField[]>();
    for (const item of allItems) {
      if (!itemsMap.has(item.expense_id)) {
        itemsMap.set(item.expense_id, []);
      }
      itemsMap.get(item.expense_id)!.push(item);
    }

    return expenseRows.map((e) => ({
      ...e,
      items: itemsMap.get(e.id) || [],
    }));
  }

  /**
   * Auto-Template: Mengambil pencatatan terakhir dengan judul yang sama/mirip
   * agar pengguna bisa menggunakan rincian fields dan harga historis sebelumnya.
   */
  static async getLatestExpenseByTitle(title: string): Promise<ExpenseWithDetails | null> {
    const cleanTitle = title.trim();
    if (!cleanTitle) return null;

    const db = await getDatabase();
    const row = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM expenses
       WHERE title = ? COLLATE NOCASE AND is_deleted = 0
       ORDER BY date DESC, created_at DESC
       LIMIT 1;`,
      [cleanTitle]
    );

    if (!row) return null;
    return this.getExpenseById(row.id);
  }

  /**
   * Head-to-Head Comparison: Mencari transaksi sejenis sebelumnya (berdasarkan judul atau kategori)
   * yang dicatat sebelum tanggal transaksi saat ini untuk dikomparasikan.
   */
  static async getPreviousSimilarExpense(
    currentExpenseId: string,
    title: string,
    currentDate: string
  ): Promise<ExpenseWithDetails | null> {
    const db = await getDatabase();

    // 1. Coba cari dengan judul yang persis sama sebelum tanggal saat ini
    const sameTitleRow = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM expenses
       WHERE id != ? AND title = ? COLLATE NOCASE AND date <= ? AND is_deleted = 0
       ORDER BY date DESC, created_at DESC
       LIMIT 1;`,
      [currentExpenseId, title.trim(), currentDate]
    );

    if (sameTitleRow) {
      return this.getExpenseById(sameTitleRow.id);
    }

    // 2. Jika tidak ada yang persis sama, cari yang judulnya mirip (LIKE)
    const similarRow = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM expenses
       WHERE id != ? AND title LIKE ? AND date <= ? AND is_deleted = 0
       ORDER BY date DESC, created_at DESC
       LIMIT 1;`,
      [currentExpenseId, `%${title.trim()}%`, currentDate]
    );

    if (similarRow) {
      return this.getExpenseById(similarRow.id);
    }

    return null;
  }

  /**
   * Menghapus transaksi (Soft-Delete secara default agar sinkronisasi cloud aman).
   */
  static async deleteExpense(id: string, hardDelete: boolean = false): Promise<void> {
    const db = await getDatabase();
    if (hardDelete) {
      await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    } else {
      const now = Date.now();
      await db.runAsync(
        'UPDATE expenses SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ?;',
        [now, id]
      );
    }
  }

  /**
   * Mengambil ringkasan periodik (Dashboard):
   * total pengeluaran, rata-rata harian, pengeluaran terbesar, dan distribusi kategori.
   */
  static async getPeriodicSummary(startDate: string, endDate: string): Promise<PeriodicSummary> {
    const db = await getDatabase();

    // 1. Total & Statistik Umum
    const statsRow = await db.getFirstAsync<{
      total_expense: number | null;
      highest_expense: number | null;
      transaction_count: number;
    }>(
      `SELECT
        SUM(total_amount) as total_expense,
        MAX(total_amount) as highest_expense,
        COUNT(*) as transaction_count
       FROM expenses
       WHERE is_deleted = 0 AND date >= ? AND date <= ?;`,
      [startDate, endDate]
    );

    const totalExpense = statsRow?.total_expense || 0;
    const highestExpense = statsRow?.highest_expense || 0;
    const transactionCount = statsRow?.transaction_count || 0;

    // Hitung rata-rata harian berdasarkan rentang tanggal
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
    const dailyAverage = totalExpense > 0 ? Math.round(totalExpense / diffDays) : 0;

    // 2. Breakdown Kategori
    const categoryRows = await db.getAllAsync<{
      category_id: string;
      category_name: string;
      category_icon: string;
      category_color: string;
      total_amount: number;
      transaction_count: number;
    }>(
      `SELECT
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        SUM(e.total_amount) as total_amount,
        COUNT(e.id) as transaction_count
       FROM expenses e
       JOIN categories c ON e.category_id = c.id
       WHERE e.is_deleted = 0 AND e.date >= ? AND e.date <= ?
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total_amount DESC;`,
      [startDate, endDate]
    );

    const categoriesBreakdown: CategorySummary[] = categoryRows.map((row) => ({
      ...row,
      percentage: totalExpense > 0 ? Number(((row.total_amount / totalExpense) * 100).toFixed(1)) : 0,
    }));

    return {
      total_expense: totalExpense,
      daily_average: dailyAverage,
      highest_expense: highestExpense,
      transaction_count: transactionCount,
      categories_breakdown: categoriesBreakdown,
    };
  }

  /**
   * Menghitung tanggal batas (cutoff) berdasarkan pengaturan rentang waktu penyimpanan lokal.
   * Contoh: '1_year' -> tanggal 365 hari yang lalu ('YYYY-MM-DD').
   */
  static getRetentionCutoffDate(retention: RetentionPeriod): string | null {
    if (retention === 'all') return null;

    const now = new Date();
    let daysToSubtract = 365;

    switch (retention) {
      case '1_month':
        daysToSubtract = 30;
        break;
      case '3_months':
        daysToSubtract = 90;
        break;
      case '6_months':
        daysToSubtract = 180;
        break;
      case '1_year':
        daysToSubtract = 365;
        break;
    }

    const cutoffTime = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    const y = cutoffTime.getFullYear();
    const m = String(cutoffTime.getMonth() + 1).padStart(2, '0');
    const d = String(cutoffTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Membersihkan data lama di SQLite lokal yang melebihi batas rentang waktu retensi.
   * HANYA menghapus data yang SUDAH TERSINKRON KE CLOUD (is_synced = 1) agar tidak ada data hilang.
   * Data yang belum tersinkron (is_synced = 0) akan tetap aman di lokal.
   */
  static async purgeOldSyncedExpenses(retention: RetentionPeriod): Promise<number> {
    const cutoffDate = this.getRetentionCutoffDate(retention);
    if (!cutoffDate) return 0;

    const db = await getDatabase();

    const countRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM expenses WHERE is_synced = 1 AND date < ?;',
      [cutoffDate]
    );
    const count = countRow?.count || 0;

    if (count > 0) {
      await db.runAsync(
        'DELETE FROM expenses WHERE is_synced = 1 AND date < ?;',
        [cutoffDate]
      );
    }

    return count;
  }

  /**
   * Mengumpulkan semua data lokal yang belum tersinkronkan ke cloud.
   */
  static async getUnsyncedData(lastSyncedAt: number = 0): Promise<CloudSyncPayload> {
    const db = await getDatabase();

    const unsyncedCategories = await db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE is_synced = 0;'
    );

    const unsyncedExpenses = await db.getAllAsync<Expense>(
      'SELECT * FROM expenses WHERE is_synced = 0;'
    );

    let unsyncedItems: ExpenseCustomField[] = [];
    if (unsyncedExpenses.length > 0) {
      const ids = unsyncedExpenses.map((e) => e.id);
      const placeholders = ids.map(() => '?').join(',');
      unsyncedItems = await db.getAllAsync<ExpenseCustomField>(
        `SELECT * FROM expense_items WHERE expense_id IN (${placeholders}) ORDER BY order_index ASC;`,
        ...ids
      );
    }

    return {
      last_synced_at: lastSyncedAt,
      categories: unsyncedCategories,
      expenses: unsyncedExpenses,
      expense_items: unsyncedItems,
    };
  }

  /**
   * Menandai data lokal yang berhasil dikirim ke cloud sebagai is_synced = 1.
   * Dan menghapus secara permanen baris lokal yang memang sudah di-soft-delete (is_deleted = 1).
   */
  static async markAsSynced(
    expenseIds: string[],
    categoryIds: string[],
    syncedAt: number
  ): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      if (expenseIds.length > 0) {
        const placeholders = expenseIds.map(() => '?').join(',');
        await db.runAsync(
          `UPDATE expenses SET is_synced = 1, synced_at = ? WHERE id IN (${placeholders});`,
          [syncedAt, ...expenseIds]
        );

        // Bersihkan data yang sudah dihapus dan sudah disinkronkan
        await db.runAsync(
          `DELETE FROM expenses WHERE is_deleted = 1 AND id IN (${placeholders});`,
          ...expenseIds
        );
      }

      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => '?').join(',');
        await db.runAsync(
          `UPDATE categories SET is_synced = 1 WHERE id IN (${placeholders});`,
          ...categoryIds
        );
      }
    });
  }

  /**
   * Menyimpan / Meng-cache data yang diunduh dari cloud ke SQLite lokal
   * agar saat berikutnya aplikasi dibuka, data langsung tampil optimal tanpa loading lagi.
   */
  static async upsertExpensesFromCloud(
    expenses: Expense[],
    items: ExpenseCustomField[],
    categories?: Category[]
  ): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // 1. Upsert Kategori
      if (categories && categories.length > 0) {
        for (const cat of categories) {
          await db.runAsync(
            `INSERT OR REPLACE INTO categories (id, name, icon, color, is_synced, created_at)
             VALUES (?, ?, ?, ?, 1, ?);`,
            [cat.id, cat.name, cat.icon, cat.color, cat.created_at]
          );
        }
      }

      // 2. Upsert Expenses
      for (const exp of expenses) {
        if (exp.is_deleted === 1) {
          await db.runAsync('DELETE FROM expenses WHERE id = ?;', [exp.id]);
          continue;
        }

        await db.runAsync(
          `INSERT OR REPLACE INTO expenses (
            id, title, category_id, total_amount, date, notes,
            is_synced, synced_at, updated_at, is_deleted, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?);`,
          [
            exp.id,
            exp.title,
            exp.category_id,
            exp.total_amount,
            exp.date,
            exp.notes ?? null,
            exp.synced_at ?? Date.now(),
            exp.updated_at,
            exp.created_at,
          ]
        );
      }

      // 3. Upsert Items
      if (items.length > 0) {
        for (const item of items) {
          await db.runAsync(
            `INSERT OR REPLACE INTO expense_items (
              id, expense_id, field_name, field_value, field_type, unit, order_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
              item.id,
              item.expense_id,
              item.field_name,
              item.field_value,
              item.field_type,
              item.unit ?? null,
              item.order_index,
            ]
          );
        }
      }
    });
  }
}
