import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  Divider,
  List,
  ActivityIndicator,
  Snackbar,
  SegmentedButtons,
} from 'react-native-paper';
import { ExpenseRepository } from '@/services/db/expense-repository';
import { ExcelExportService } from '@/services/export/excel-export';
import { CloudSyncService } from '@/services/cloud/cloud-sync-service';
import { RetentionPeriod } from '@/types/expense';
import { formatTanggalIndo } from '@/utils/currency';

export default function SettingsScreen() {
  const theme = useTheme();

  const [cloudUrl, setCloudUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [retentionPeriod, setRetentionPeriod] = useState<RetentionPeriod>('1_year');
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const config = await CloudSyncService.getConfig();
      setCloudUrl(config.cloud_base_url);
      setApiKey(config.cloud_api_key);
      setRetentionPeriod(config.retention_period);
      setLastSyncedAt(config.last_synced_at);
    } catch (error) {
      console.error('Gagal memuat pengaturan:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    try {
      setSaving(true);
      await CloudSyncService.saveConfig({
        cloud_base_url: cloudUrl.trim(),
        cloud_api_key: apiKey.trim(),
        retention_period: retentionPeriod,
      });

      setMsg('Pengaturan berhasil disimpan ke penyimpanan lokal.');
    } catch (error: any) {
      setMsg('Gagal menyimpan pengaturan: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!cloudUrl.trim()) {
      Alert.alert('URL Kosong', 'Silakan masukkan Cloud Base URL terlebih dahulu.');
      return;
    }

    try {
      setTesting(true);
      const result = await CloudSyncService.testConnection(cloudUrl, apiKey);
      Alert.alert(result.success ? 'Koneksi Berhasil' : 'Koneksi Gagal', result.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleManualSync() {
    if (!cloudUrl.trim()) {
      Alert.alert(
        'Cloud URL Belum Diisi',
        'Silakan isi alamat Cloud Base URL Anda terlebih dahulu untuk memulai sinkronisasi.'
      );
      return;
    }

    try {
      setSyncing(true);
      // Simpan pengaturan terlebih dahulu
      await CloudSyncService.saveConfig({
        cloud_base_url: cloudUrl.trim(),
        cloud_api_key: apiKey.trim(),
        retention_period: retentionPeriod,
      });

      const res = await CloudSyncService.sync();
      if (res.success) {
        setLastSyncedAt(Date.now());
        Alert.alert(
          'Sinkronisasi Sukses',
          `${res.message}\n${
            res.purgedCount > 0
              ? `\n🧹 ${res.purgedCount} catatan lama di ponsel dibersihkan sesuai retensi.`
              : ''
          }`
        );
      } else {
        Alert.alert('Gagal Sinkronisasi', res.message);
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handlePurgeOldData() {
    if (retentionPeriod === 'all') {
      Alert.alert(
        'Retensi Selamanya',
        'Pengaturan retensi Anda disetel ke "Semua (Selamanya)", tidak ada data yang dibersihkan.'
      );
      return;
    }

    Alert.alert(
      'Konfirmasi Pembersihan',
      'Data transaksi yang lebih lama dari rentang waktu retensi akan dihapus dari memori ponsel untuk menghemat ruang.\n\nCatatan: HANYA data yang SUDAH TERSINKRON KE CLOUD yang akan dibersihkan. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Bersihkan Sekarang',
          style: 'destructive',
          onPress: async () => {
            try {
              setPurging(true);
              const purged = await ExpenseRepository.purgeOldSyncedExpenses(retentionPeriod);
              Alert.alert(
                'Pembersihan Selesai',
                purged > 0
                  ? `Berhasil membersihkan ${purged} transaksi lama dari memori ponsel Anda.`
                  : 'Tidak ada data lama yang memenuhi syarat pembersihan (semua data masih dalam rentang waktu atau belum tersinkron).'
              );
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setPurging(false);
            }
          },
        },
      ]
    );
  }

  async function handleExportAllToExcel() {
    try {
      setExporting(true);
      const allExpenses = await ExpenseRepository.getExpenses();
      if (allExpenses.length === 0) {
        Alert.alert('Data Kosong', 'Belum ada data pengeluaran yang dapat diekspor.');
        return;
      }

      await ExcelExportService.exportToExcel(allExpenses);
      setMsg('File Excel berhasil dibuat.');
    } catch (error: any) {
      Alert.alert('Gagal Ekspor', error.message || 'Terjadi kesalahan saat membuat file Excel.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}>
      {/* Seksi 1: Rentang Waktu Penyimpanan di Lokal (Retention) */}
      <Card mode="outlined" style={styles.card}>
        <Card.Title
          title="Rentang Waktu Penyimpanan Lokal"
          subtitle="Berapa lama data disimpan di ponsel"
          left={(props) => <List.Icon {...props} icon="database-clock-outline" color="#0288D1" />}
          titleStyle={{ fontWeight: '700' }}
        />
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 12 }}>
            Pilih durasi penyimpanan catatan di ponsel Anda. Data yang lebih lama dari rentang ini akan otomatis dibersihkan dari ponsel setelah tersimpan di cloud, dan dapat ditarik kembali sewaktu-waktu saat dibutuhkan.
          </Text>

          <SegmentedButtons
            value={retentionPeriod}
            onValueChange={(val) => setRetentionPeriod(val as RetentionPeriod)}
            density="small"
            style={styles.segmented}
            buttons={[
              { value: '1_month', label: '1 Bln' },
              { value: '3_months', label: '3 Bln' },
              { value: '6_months', label: '6 Bln' },
              { value: '1_year', label: '1 Thn' },
              { value: 'all', label: 'Semua' },
            ]}
          />

          <View style={styles.retentionActionRow}>
            <Button
              mode="contained-tonal"
              icon="broom"
              loading={purging}
              disabled={purging || retentionPeriod === 'all'}
              onPress={handlePurgeOldData}
              style={{ flex: 1 }}>
              Bersihkan Data Lama di HP
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Seksi 2: Pengaturan Cloud Sync */}
      <Card mode="outlined" style={styles.card}>
        <Card.Title
          title="Pengaturan Cloud Sync"
          subtitle="Sinkronisasi & cadangan ke server pribadi / Supabase"
          left={(props) => <List.Icon {...props} icon="cloud-sync-outline" color={theme.colors.primary} />}
          titleStyle={{ fontWeight: '700' }}
        />
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 14 }}>
            Saat terhubung, aplikasi dapat mengambil data dari cloud dan menyimpannya di SQLite lokal agar tetap cepat dan bisa dibuka tanpa internet.
          </Text>

          <TextInput
            label="Cloud Base URL"
            placeholder="https://api.pribadi-anda.com atau Supabase URL"
            value={cloudUrl}
            onChangeText={setCloudUrl}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="web" />}
          />

          <TextInput
            label="API Key / Token (Opsional)"
            placeholder="Bearer token atau Supabase anon key"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="key" />}
          />

          {lastSyncedAt > 0 && (
            <Text variant="labelSmall" style={{ color: '#2E7D32', marginBottom: 10, fontWeight: '600' }}>
              ✓ Terakhir disinkronkan: {new Date(lastSyncedAt).toLocaleString('id-ID')}
            </Text>
          )}

          <View style={styles.cloudButtonGrid}>
            <Button
              mode="outlined"
              icon="lan-check"
              loading={testing}
              disabled={testing}
              onPress={handleTestConnection}
              style={{ flex: 1 }}>
              Uji Koneksi
            </Button>

            <Button
              mode="contained-tonal"
              icon="content-save"
              loading={saving}
              disabled={saving}
              onPress={handleSaveSettings}
              style={{ flex: 1 }}>
              Simpan
            </Button>
          </View>

          <Button
            mode="contained"
            icon="sync"
            loading={syncing}
            disabled={syncing}
            onPress={handleManualSync}
            style={{ marginTop: 10, borderRadius: 10 }}>
            Sinkronkan Sekarang
          </Button>
        </Card.Content>
      </Card>

      {/* Seksi 3: Ekspor Excel */}
      <Card mode="elevated" style={styles.card}>
        <Card.Title
          title="Ekspor Data ke Excel"
          subtitle="File spreadsheet .xlsx 100% offline"
          left={(props) => <List.Icon {...props} icon="file-excel-box" color="#2E7D32" />}
          titleStyle={{ fontWeight: '700' }}
        />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 12 }}>
            Ekspor seluruh catatan pengeluaran beserta rincian custom fields ke dalam format spreadsheet Excel (.xlsx) tanpa membutuhkan koneksi internet.
          </Text>
          <Button
            mode="contained"
            icon="download"
            loading={exporting}
            disabled={exporting}
            buttonColor="#2E7D32"
            onPress={handleExportAllToExcel}
            style={{ borderRadius: 10 }}>
            Ekspor Seluruh Data ke Excel (.xlsx)
          </Button>
        </Card.Content>
      </Card>

      {/* Info Aplikasi */}
      <Card mode="outlined" style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>
            MoneyWise v1.0.0
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Arsitektur Local-First dengan SQLite, Custom Fields, Komparasi Riwayat, dan Sinkronisasi Cloud Hibrida.
          </Text>
        </Card.Content>
      </Card>

      <Snackbar visible={!!msg} onDismiss={() => setMsg('')} duration={3000}>
        {msg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 14,
    borderRadius: 16,
  },
  segmented: {
    marginBottom: 12,
  },
  retentionActionRow: {
    marginTop: 4,
  },
  input: {
    marginBottom: 12,
  },
  cloudButtonGrid: {
    flexDirection: 'row',
    gap: 8,
  },
});
