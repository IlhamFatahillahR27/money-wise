import { Category } from '@/types/expense';
import { getDatabase } from './database';

const PALETTE = [
  '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#8BC34A',
  '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#795548',
  '#9C27B0', '#673AB7', '#3F51B5', '#E91E63', '#607D8B',
];

function getRandomColor(): string {
  const index = Math.floor(Math.random() * PALETTE.length);
  return PALETTE[index];
}

function generateId(): string {
  return 'cat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export class CategoryRepository {
  static async getAllCategories(): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Category>(
      'SELECT id, name, icon, color, is_synced, created_at FROM categories ORDER BY name ASC;'
    );
    return rows;
  }

  static async getCategoryById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Category>(
      'SELECT id, name, icon, color, is_synced, created_at FROM categories WHERE id = ?;',
      [id]
    );
    return row || null;
  }

  /**
   * Mencari kategori berdasarkan nama (case-insensitive).
   * Jika belum ada, otomatis membuat dan menyimpannya ke database lokal.
   */
  static async findOrCreateCategory(name: string, customIcon?: string, customColor?: string): Promise<Category> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Nama kategori tidak boleh kosong');
    }

    const db = await getDatabase();

    // 1. Cek apakah kategori sudah ada
    const existing = await db.getFirstAsync<Category>(
      'SELECT id, name, icon, color, is_synced, created_at FROM categories WHERE name = ? COLLATE NOCASE;',
      [cleanName]
    );

    if (existing) {
      return existing;
    }

    // 2. Buat kategori baru jika tidak ditemukan
    const newCategory: Category = {
      id: generateId(),
      name: cleanName,
      icon: customIcon || 'tag-outline',
      color: customColor || getRandomColor(),
      is_synced: 0,
      created_at: Date.now(),
    };

    await db.runAsync(
      'INSERT INTO categories (id, name, icon, color, is_synced, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [
        newCategory.id,
        newCategory.name,
        newCategory.icon,
        newCategory.color,
        newCategory.is_synced,
        newCategory.created_at,
      ]
    );

    return newCategory;
  }
}
