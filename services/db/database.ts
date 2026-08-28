import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Mengambil instance database SQLite lokal.
 * Menggunakan Promise singleton agar inisialisasi tabel dan seed data
 * dijamin selesai 100% sebelum query apa pun dijalankan (mencegah race condition).
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase().catch((error) => {
      // Jika terjadi kegagalan, reset dbPromise agar pemanggilan berikutnya bisa mencoba kembali
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('moneywise.db');

  // 1. Eksekusi PRAGMA dan pembuatan seluruh tabel sekaligus dalam satu batch
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_synced INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      is_synced INTEGER DEFAULT 0,
      synced_at INTEGER,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS expense_items (
      id TEXT PRIMARY KEY NOT NULL,
      expense_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT NOT NULL,
      field_type TEXT NOT NULL,
      unit TEXT,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_title ON expenses(title);
    CREATE INDEX IF NOT EXISTS idx_expenses_is_deleted ON expenses(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_items_expense_id ON expense_items(expense_id);
    CREATE INDEX IF NOT EXISTS idx_items_field_name ON expense_items(field_name);
  `);

  // 2. Isi Kategori Default jika masih kosong
  const categoryCountResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories;'
  );

  if (!categoryCountResult || categoryCountResult.count === 0) {
    const defaultCategories = [
      { id: 'cat_kos', name: 'Tempat Tinggal', icon: 'home', color: '#3F51B5' },
      { id: 'cat_food', name: 'Makanan & Minuman', icon: 'food', color: '#FF9800' },
      { id: 'cat_transport', name: 'Transportasi', icon: 'car', color: '#009688' },
      { id: 'cat_bills', name: 'Utilitas & Tagihan', icon: 'flash', color: '#FFC107' },
      { id: 'cat_groceries', name: 'Belanja Kebutuhan', icon: 'cart', color: '#4CAF50' },
      { id: 'cat_entertainment', name: 'Hiburan & Hobi', icon: 'gamepad-variant', color: '#E91E63' },
      { id: 'cat_health', name: 'Kesehatan', icon: 'medical-bag', color: '#F44336' },
      { id: 'cat_other', name: 'Lain-lain', icon: 'dots-horizontal-circle', color: '#9E9E9E' },
    ];

    const now = Date.now();
    for (const cat of defaultCategories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, icon, color, is_synced, created_at) VALUES (?, ?, ?, ?, 0, ?);',
        [cat.id, cat.name, cat.icon, cat.color, now]
      );
    }
  }

  return db;
}
