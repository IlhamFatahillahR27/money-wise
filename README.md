# 💰 MoneyWise

Aplikasi mobile pencatatan dan analisis pengeluaran pribadi modern dengan arsitektur **Local-First (Offline-First)**, **Dynamic Custom Fields**, **Auto-Create Category**, **Mesin Komparasi Head-to-Head**, **Dashboard Finansial Periodik**, dan **Ekspor Excel (.xlsx)**.

Dibangun menggunakan **Expo SDK 54**, **React Native 0.81**, **React Native Paper v5**, **Expo Router v6**, dan basis data lokal **SQLite (`expo-sqlite`)**.

---

## ✨ Fitur Utama

### 1. 🗄️ Penyimpanan 100% Offline (Local-First)
- Seluruh data transaksi, rincian item, dan kategori tersimpan secara lokal di memori ponsel menggunakan **SQLite** (`expo-sqlite`) dengan konfigurasi performa `WAL (Write-Ahead Logging)` mode.
- Aplikasi dapat digunakan kapan saja tanpa memerlukan koneksi internet.

### 2. 📝 Dynamic Custom Fields (Rincian Item Fleksibel)
- Setiap transaksi pengeluaran tidak hanya mencatat nominal total, tetapi dapat ditambahkan rincian item kustom tak terbatas.
- **Contoh Kasus**:
  - Pengeluaran: **"Kos Bulanan"**
  - Rincian Custom Field:
    - `kWh Digunakan`: `145` (Satuan: `kWh`, Tipe: Angka)
    - `Biaya Listrik`: `Rp 217.500` (Tipe: Rupiah)
    - `Biaya Kamar Kos`: `Rp 1.200.000` (Tipe: Rupiah)
- Tombol **"Hitung dari Rincian"** untuk menjumlahkan sub-rincian Rupiah secara otomatis ke total pengeluaran.

### 3. 🏷️ Inline Auto-Create Kategori Baru
- Kolom kategori dilengkapi pencarian teks cerdas.
- Jika nama kategori yang diketik belum pernah terdaftar di database, tombol **`+ Buat kategori baru: "{nama}"`** akan langsung muncul sehingga kategori baru otomatis tersimpan tanpa perlu berpindah layar.

### 4. 💡 Auto-Template dari Riwayat
- Saat mengetik judul pengeluaran yang pernah dicatat sebelumnya (misal: *"Kos Bulanan"*), sistem mendeteksi pencatatan terakhir dan menawarkan banner:
  > *"Ditemukan catatan sebelumnya: Gunakan rincian field ini?"*
- Mengisi otomatis seluruh struktur field dan nilai sebelumnya sebagai referensi harga, sehingga Anda tidak perlu mengetik ulang nama-nama field tiap bulan.

### 5. 🔢 Format Pemisah Ribuan Titik & Live Terbilang
- Kolom nominal total dan rincian Rupiah otomatis memformat angka dengan pemisah titik ribuan saat diketik (contoh: `1500000` ➔ `1.500.000`).
- Dilengkapi teks konfirmasi terbilang interaktif langsung di bawah input (contoh: `💰 Terbaca: Rp 1.500.000 (1,5 Juta)` atau `Rp 50.000 (50 Ribu)`), mencegah kesalahan pengetikan jumlah nol.

### 6. 🔍 Analisis Komparasi Head-to-Head (Price & Usage Tracking)
- Secara otomatis mendeteksi transaksi serupa sebelumnya untuk dibandingkan pada halaman detail transaksi.
- **Komparasi Global**: Perubahan total pengeluaran (kenaikan/penurunan nominal dan persentase).
- **Komparasi Rincian Per-Field**:
  - Mengetahui apakah penggunaan listrik naik: `120 kWh ➔ 145 kWh (+25 kWh / +20.8% 📈)`
  - Mengetahui fluktuasi tarif: `Rp 180.000 ➔ Rp 217.500 (+Rp 37.500 📈)`
  - Indikator warna visual: **Merah** (pengeluaran/pemakaian naik), **Hijau** (hemat/turun), dan **Abu-abu** (tetap).

### 7. 📊 Dashboard Finansial Periodik
- Filter rentang waktu: **7 Hari Terakhir**, **Bulan Ini**, **Tahun Ini**, dan **Semua Waktu**.
- Kartu metrik: Total Pengeluaran, Rata-rata Harian, Pengeluaran Terbesar, dan Jumlah Transaksi.
- Visualisasi progress bar distribusi pengeluaran per kategori.
- Ringkasan 5 pengeluaran terkini dengan shortcut cepat.

### 8. 📋 Riwayat Transaksi Lengkap
- Layar riwayat dengan kolom pencarian instan (*Search Bar*) berdasarkan judul atau catatan.
- Filter horizontal chips berdasarkan kategori.
- Tampilan total pengeluaran terfilter secara dinamis.

### 9. 📑 Ekspor ke Excel (.xlsx) Offline
- Mengonversi data transaksi beserta seluruh rincian custom fields ke file spreadsheet Excel (`.xlsx`) secara offline menggunakan SheetJS (`xlsx`) dan `expo-file-system`.
- Membuka native share sheet ponsel (`expo-sharing`) untuk disimpan ke folder ponsel (*Save to Files*) atau dikirim via WhatsApp, Google Drive, dan Email.

### 10. ☁️ Arsitektur Siap Sinkronisasi Cloud (Cloud-Ready)
- Skema database lokal telah dilengkapi kolom sinkronisasi (`is_synced`, `synced_at`, `updated_at`, `is_deleted`).
- Halaman **Pengaturan & Cloud** menyediakan input `Cloud Base URL` dan tombol *"Sinkronkan Sekarang"* yang siap dihubungkan saat backend API pribadi Anda telah aktif.

---

## 🛠️ Teknologi yang Digunakan

| Komponen | Teknologi |
| :--- | :--- |
| **Framework** | [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) (React Native 0.81.5) |
| **Routing** | [Expo Router v6](https://docs.expo.dev/router/introduction/) (File-based Routing) |
| **UI Components** | [React Native Paper v5](https://callstack.github.io/react-native-paper/) (Material Design 3) |
| **Database** | [expo-sqlite](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) (SQLite lokal dengan WAL mode) |
| **Excel Export** | [SheetJS (xlsx)](https://docs.sheetjs.com/), `expo-file-system/legacy`, `expo-sharing` |
| **Animation** | `react-native-reanimated` |
| **Language** | TypeScript (~5.9.2) |

---

## 🚀 Memulai Aplikasi (Getting Started)

### 1. Prasyarat
- Pastikan telah menginstal [Node.js](https://nodejs.org/) (versi LTS yang disarankan).
- Instal aplikasi **Expo Go** pada ponsel Android/iOS Anda melalui Play Store atau App Store.

### 2. Instalasi Dependensi
Jalankan perintah berikut di direktori proyek:
```bash
npm install
```

### 3. Menjalankan Server Development
```bash
npx expo start
```

Pilihan kontrol di terminal:
- **Scan QR Code** menggunakan kamera (iOS) atau aplikasi Expo Go (Android).
- Tekan **`a`** untuk membuka pada Android Emulator.
- Tekan **`w`** untuk membuka pada browser Web.
- Tekan **`r`** untuk me-reload aplikasi.
- Tekan **`c`** untuk membersihkan cache Metro bundler jika diperlukan.

---

## 📄 Lisensi
Proyek pribadi untuk pencatatan dan pengelolaan keuangan mandiri.
