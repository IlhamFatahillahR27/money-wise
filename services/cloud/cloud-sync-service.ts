import { getDatabase } from '@/services/db/database';
import { ExpenseRepository } from '@/services/db/expense-repository';
import { RetentionPeriod, CloudSyncResponse, ExpenseWithDetails, Expense, ExpenseCustomField } from '@/types/expense';

export interface CloudConfig {
  cloud_base_url: string;
  cloud_api_key: string;
  retention_period: RetentionPeriod;
  last_synced_at: number;
}

export class CloudSyncService {
  /**
   * Mengambil pengaturan koneksi cloud & retensi dari database SQLite lokal.
   */
  static async getConfig(): Promise<CloudConfig> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings;'
    );

    const configMap = new Map(rows.map((r) => [r.key, r.value]));

    return {
      cloud_base_url: configMap.get('cloud_base_url') || '',
      cloud_api_key: configMap.get('cloud_api_key') || '',
      retention_period: (configMap.get('retention_period') as RetentionPeriod) || '1_year',
      last_synced_at: parseInt(configMap.get('last_synced_at') || '0', 10),
    };
  }

  /**
   * Menyimpan pengaturan koneksi cloud & retensi ke SQLite lokal.
   */
  static async saveConfig(config: Partial<CloudConfig>): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      for (const [k, v] of Object.entries(config)) {
        if (v !== undefined) {
          await db.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
            [k, String(v)]
          );
        }
      }
    });
  }

  /**
   * Menguji apakah Cloud Base URL aktif dan dapat dihubungi via endpoint /api/v1/health.
   */
  static async testConnection(baseUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      return { success: false, message: 'Cloud Base URL tidak boleh kosong.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 detik timeout

      const res = await fetch(`${cleanUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 200) {
        return { success: true, message: 'Koneksi ke backend cloud berhasil! (HTTP 200 OK)' };
      } else if (res.status === 401) {
        return { success: false, message: 'API Key ditolak oleh server (401 Unauthorized).' };
      } else {
        return { success: false, message: `Server merespon dengan status: HTTP ${res.status}` };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Koneksi timeout (server tidak merespon dalam 7 detik).' };
      }
      return { success: false, message: `Gagal menghubungi server: ${err.message || 'Periksa URL dan jaringan'}` };
    }
  }

  /**
   * Menjalankan sinkronisasi penuh (Push perubahan lokal & Pull perubahan dari server).
   * Sekaligus membersihkan data lokal yang melewati batas retensi (hanya yang sudah tersinkron).
   */
  static async sync(): Promise<{ success: boolean; message: string; purgedCount: number }> {
    const config = await this.getConfig();
    const cleanUrl = config.cloud_base_url.trim().replace(/\/+$/, '');

    if (!cleanUrl) {
      return { success: false, message: 'Cloud Base URL belum dikonfigurasi di Pengaturan.', purgedCount: 0 };
    }

    // 1. Kumpulkan data lokal yang belum tersinkron
    const payload = await ExpenseRepository.getUnsyncedData(config.last_synced_at);

    try {
      const res = await fetch(`${cleanUrl}/api/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.cloud_api_key.trim()}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server merespon error: HTTP ${res.status}`);
      }

      const data: CloudSyncResponse = await res.json();
      const serverSyncedAt = data.synced_at || Date.now();

      // 2. Tandai data lokal yang baru saja dikirim sebagai 'is_synced = 1'
      const pushedExpenseIds = payload.expenses.map((e) => e.id);
      const pushedCategoryIds = payload.categories.map((c) => c.id);
      await ExpenseRepository.markAsSynced(pushedExpenseIds, pushedCategoryIds, serverSyncedAt);

      // 3. Simpan data yang ditarik dari server ke SQLite lokal (Cache)
      if (data.pulled_data) {
        await ExpenseRepository.upsertExpensesFromCloud(
          data.pulled_data.expenses || [],
          data.pulled_data.expense_items || [],
          data.pulled_data.categories || []
        );
      }

      // 4. Update waktu terakhir sinkronisasi
      await this.saveConfig({ last_synced_at: serverSyncedAt });

      // 5. Bersihkan data lokal yang melewati retensi (hanya yang sudah tersinkron ke cloud)
      const purged = await ExpenseRepository.purgeOldSyncedExpenses(config.retention_period);

      return {
        success: true,
        message: 'Sinkronisasi dengan cloud berhasil!',
        purgedCount: purged,
      };
    } catch (err: any) {
      console.error('Error saat sinkronisasi cloud:', err);
      return {
        success: false,
        message: err.message || 'Gagal menyinkronkan data dengan cloud.',
        purgedCount: 0,
      };
    }
  }

  /**
   * Mengambil data historis lama dari cloud on-demand
   * dan langsung menyimpannya ke SQLite lokal agar saat dibuka lagi tidak perlu unduh ulang.
   */
  static async fetchHistoricalExpenses(
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; data: ExpenseWithDetails[] }> {
    const config = await this.getConfig();
    const cleanUrl = config.cloud_base_url.trim().replace(/\/+$/, '');

    if (!cleanUrl) {
      return { success: false, data: [] };
    }

    try {
      const url = `${cleanUrl}/api/v1/expenses?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.cloud_api_key.trim()}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) return { success: false, data: [] };

      const json = await res.json();
      const itemsList: (ExpenseWithDetails & { items?: ExpenseCustomField[] })[] = json.data || [];

      // Ekstrak expenses dan expense_items terpisah untuk dimasukkan ke SQLite
      const flatExpenses: Expense[] = [];
      const flatItems: ExpenseCustomField[] = [];

      for (const item of itemsList) {
        flatExpenses.push({
          id: item.id,
          title: item.title,
          category_id: item.category_id,
          total_amount: item.total_amount,
          date: item.date,
          notes: item.notes,
          is_synced: 1,
          synced_at: Date.now(),
          updated_at: item.updated_at || Date.now(),
          is_deleted: 0,
          created_at: item.created_at || Date.now(),
        });

        if (item.items && Array.isArray(item.items)) {
          flatItems.push(...item.items);
        }
      }

      // Cache ke SQLite lokal
      await ExpenseRepository.upsertExpensesFromCloud(flatExpenses, flatItems);

      return { success: true, data: itemsList };
    } catch (err) {
      console.error('Gagal mengambil data historis dari cloud:', err);
      return { success: false, data: [] };
    }
  }
}
