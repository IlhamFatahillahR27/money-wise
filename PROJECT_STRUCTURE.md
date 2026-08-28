# 🌳 Struktur Proyek `money-wise`

Dokumen ini menjelaskan struktur pohon direktori, susunan file, dan arsitektur proyek aplikasi mobile **MoneyWise** (Aplikasi Pencatatan & Analisis Pengeluaran Pribadi Offline-First) yang dibangun menggunakan **Expo SDK 54**, **React Native 0.81**, **Expo Router v6**, **React Native Paper v5**, dan **SQLite (`expo-sqlite`)**.

---

## 1. Visualisasi Struktur Tree

```text
money-wise/
├── .claude/
│   └── settings.json                     # Pengaturan lingkungan Claude Code
├── .vscode/
│   ├── extensions.json                   # Rekomendasi ekstensi editor VS Code
│   └── settings.json                     # Konfigurasi editor VS Code
├── app/                                  # Direktori utama Expo Router (File-based Routing)
│   ├── (tabs)/                           # Route Group navigasi Bottom Tab Bar
│   │   ├── _layout.tsx                   # Konfigurasi Bottom Tab Navigator (Dashboard & Riwayat)
│   │   ├── explore.tsx                   # Layar Riwayat Pengeluaran (Search, Filter, Ekspor Excel)
│   │   └── index.tsx                     # Layar Utama Dashboard Finansial (Statistik & Analisis Periodik)
│   ├── expense/                          # Rute dinamis transaksi pengeluaran
│   │   └── [id].tsx                      # Layar Detail Transaksi & Analisis Komparasi Head-to-Head
│   ├── _layout.tsx                       # Root Layout: Provider Paper/Navigation, Stack, & Init SQLite
│   ├── modal.tsx                         # Modal Layar Tambah Pengeluaran Baru
│   └── settings.tsx                      # Layar Pengaturan (Ekspor Excel, Cloud Base URL & Sinkronisasi)
├── assets/                               # File asset statis
│   └── images/                           # Asset grafis, logo, dan ikon aplikasi
│       ├── android-icon-background.png   # Background Android adaptive icon
│       ├── android-icon-foreground.png   # Foreground Android adaptive icon
│       ├── android-icon-monochrome.png   # Ikon monokrom Android
│       ├── favicon.png                   # Favicon Web
│       ├── icon.png                      # Ikon utama aplikasi
│       ├── partial-react-logo.png        # Grafis dekorasi logo
│       ├── react-logo.png                # Logo React
│       ├── react-logo@2x.png             # Logo resolusi 2x
│       ├── react-logo@3x.png             # Logo resolusi 3x
│       └── splash-icon.png               # Ikon Splash screen aplikasi
├── components/                           # Komponen UI modular dan reusable
│   ├── dashboard/                        # Komponen khusus layar Dashboard
│   │   ├── category-breakdown.tsx        # Visualisasi progress bar distribusi pengeluaran per kategori
│   │   ├── period-selector.tsx           # Pemilih filter periode (7 Hari, Bulan Ini, Tahun Ini, Semua)
│   │   └── stat-card.tsx                 # Kartu metrik total, rata-rata harian, pengeluaran terbesar
│   ├── expense/                          # Komponen khusus transaksi & form pengeluaran
│   │   ├── category-picker.tsx           # Pemilih kategori dengan kemampuan inline auto-create
│   │   ├── comparison-card.tsx           # Kartu komparasi head-to-head (perubahan total & delta per-item)
│   │   ├── custom-field-input.tsx        # Baris dinamis input custom fields (Angka, Rupiah, Teks, Satuan)
│   │   ├── expense-card.tsx              # Kartu ringkasan transaksi pengeluaran pada list
│   │   └── expense-form.tsx              # Form input utama dengan auto-template dan format ribuan
│   ├── ui/                               # Komponen UI primitif / pembantu
│   │   ├── collapsible.tsx               # Accordion/collapsible animasi
│   │   ├── icon-symbol.ios.tsx           # Ikon native iOS (SF Symbols)
│   │   └── icon-symbol.tsx               # Ikon multi-platform (MaterialIcons)
│   ├── external-link.tsx                 # Pembuka hyperlink eksternal/browser
│   ├── haptic-tab.tsx                    # Tombol tab bar dengan haptic feedback
│   ├── hello-wave.tsx                    # Komponen animasi lambaian tangan
│   ├── parallax-scroll-view.tsx          # ScrollView dengan header efek parallax
│   ├── themed-text.tsx                   # Komponen teks adaptif tema Light/Dark
│   └── themed-view.tsx                   # Komponen view adaptif tema Light/Dark
├── constants/                            # Nilai konstanta & desain sistem
│   └── theme.ts                          # Skema warna tema & tipografi font
├── hooks/                                # Custom React hooks
│   ├── use-color-scheme.ts               # Hook deteksi dark/light mode native
│   ├── use-color-scheme.web.ts           # Hook deteksi dark/light mode Web
│   └── use-theme-color.ts                # Helper pengambilan warna tema
├── scripts/                              # Script otomasi dan utilitas development
│   └── reset-project.js                  # Script utilitas reset template
├── services/                             # Business logic & Data layer
│   ├── analytics/                        # Logika komputasi & analitik
│   │   └── comparison-engine.ts          # Mesin kalkulasi perbandingan head-to-head transaksi
│   ├── cloud/                            # Integrasi cloud & sinkronisasi
│   │   └── cloud-sync-service.ts         # Layanan sinkronisasi batch, tes koneksi, dan manajemen retensi
│   ├── db/                               # Manajemen basis data lokal (SQLite)
│   │   ├── category-repository.ts        # Operasi data kategori & fungsi findOrCreateCategory
│   │   ├── database.ts                   # Inisialisasi koneksi SQLite, DDL tabel, & Promise singleton
│   │   └── expense-repository.ts         # CRUD transaksi ACID, pencarian serupa, & agregasi periodik
│   └── export/                           # Layanan ekspor berkas
│       └── excel-export.ts               # Ekspor data ke format Excel (.xlsx) 100% offline via SheetJS
├── types/                                # Definisi TypeScript interface & type
│   └── expense.ts                        # Tipe data transaksi, custom field, kategori, & komparasi
├── utils/                                # Fungsi pembantu / utilitas umum
│   └── currency.ts                       # Format Rupiah, format ribuan bertitik, tanggal, & terbilang singkat
├── .gitignore                            # Daftar file/folder yang dikecualikan dari version control
├── AGENTS.md                             # Pedoman referensi dokumen Expo SDK 54 untuk AI
├── app.json                              # Konfigurasi aplikasi Expo (metadata, plugins, icon, permissions)
├── CLAUDE.md                             # Referensi instruksi AI Claude
├── CLOUD_API.md                          # Spesifikasi REST API Backend Cloud (Endpoints, Auth, SQL DDL)
├── eslint.config.js                      # Konfigurasi linter ESLint 9 (Flat Config)
├── expo-env.d.ts                         # Deklarasi tipe ambient Expo
├── package.json                          # Manifest dependensi project dan npm scripts
├── package-lock.json                     # Lockfile pohon dependensi npm
├── README.md                             # Dokumentasi pengantar dan panduan lengkap proyek
└── tsconfig.json                         # Konfigurasi compiler TypeScript & path aliases (@/*)
```

---

## 2. Penjelasan Per Lapisan Arsitektur

### 🗄️ Lapisan Data & Layanan (`services/`)
- **`services/db/database.ts`**: Menginisialisasi basis data SQLite lokal (`moneywise.db`) dengan mekanisme **Promise Singleton** untuk mencegah *race condition* saat *cold start*, mengaktifkan mode `WAL`, dan membuat tabel `categories`, `expenses`, `expense_items`, serta `app_settings`.
- **`services/db/expense-repository.ts`**: Menangani transaksi database secara ACID (membuat pengeluaran sekaligus detail custom fields-nya), melakukan *soft-delete*, serta menghitung statistik periodik (*total expense*, *daily average*, *highest expense*, *category breakdown*).
- **`services/db/category-repository.ts`**: Mengelola kategori dan menyediakan fungsi `findOrCreateCategory(name)` yang otomatis membuat kategori baru jika belum pernah ada.
- **`services/analytics/comparison-engine.ts`**: Menghitung selisih nominal transaksi dan delta numerik per-field (kenaikan/penurunan pemakaian dan biaya).
- **`services/export/excel-export.ts`**: Menghasilkan berkas `.xlsx` secara offline dan membuka *share sheet* perangkat via `expo-sharing`.

### 📱 Lapisan UI & Komponen (`components/` & `app/`)
- **`app/(tabs)/index.tsx` (Dashboard)**: Menampilkan kartu metrik keuangan periodik, visualisasi pembagian kategori, 5 pengeluaran terkini, dan shortcut pencatatan baru.
- **`app/(tabs)/explore.tsx` (Riwayat)**: Layar penelusuran riwayat pengeluaran dengan search bar instan, filter chip kategori, dan tombol cepat ekspor Excel.
- **`app/expense/[id].tsx` (Detail & Komparasi)**: Menampilkan rincian lengkap transaksi, seluruh custom field, dan perbandingan otomatis dengan transaksi serupa sebelumnya.
- **`app/modal.tsx` & `components/expense/expense-form.tsx`**: Form input pengeluaran yang dilengkapi deteksi *auto-template*, pemisah ribuan otomatis, konfirmasi teks terbilang, dan keyboard-safe scrolling.
- **`app/settings.tsx` (Pengaturan)**: Menu ekspor Excel mandiri dan konfigurasi `Cloud Base URL` untuk sinkronisasi di masa mendatang.
