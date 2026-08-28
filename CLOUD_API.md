# 🌐 Spesifikasi REST API Backend Cloud - MoneyWise

Dokumen ini adalah panduan teknis dan spesifikasi API resmi untuk membangun backend server (menggunakan Node.js/Express, Python/FastAPI, Go, Laravel, atau BaaS seperti Supabase) yang akan dihubungkan dengan aplikasi mobile **MoneyWise**.

---

## 📋 Daftar Rute API (Endpoints)

| Metode | Endpoint | Deskripsi | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Memeriksa ketersediaan & konektivitas server | Wajib |
| `POST` | `/api/v1/sync` | Sinkronisasi batch dua arah (Push data lokal & Pull data baru) | Wajib |
| `GET` | `/api/v1/expenses` | Mengambil data pengeluaran historis (on-demand dari cloud) | Wajib |
| `GET` | `/api/v1/expenses/:id` | Mengambil 1 detail pengeluaran lengkap dengan custom fields | Opsional |

---

## 🔒 Standar Keamanan & Autentikasi

Semua request dari aplikasi mobile ke server menyertakan header otentikasi:
```http
Authorization: Bearer <API_KEY_ATAU_TOKEN>
Content-Type: application/json
Accept: application/json
```
Jika token tidak cocok atau kosong, server **wajib** mengembalikan:
- **HTTP Status**: `401 Unauthorized`
- **Body**: `{"error": "Unauthorized", "message": "API Key tidak valid"}`

---

## 1. `GET /api/v1/health` (Cek Koneksi)
Digunakan oleh aplikasi mobile untuk menguji apakah `Cloud Base URL` yang dimasukkan pengguna di halaman Pengaturan aktif dan dapat dihubungi.

### Response `200 OK`:
```json
{
  "status": "online",
  "app": "MoneyWise Backend",
  "version": "1.0.0",
  "server_time": 1724819500000
}
```

---

## 2. `POST /api/v1/sync` (Sinkronisasi Batch Dua Arah)
Endpoint utama untuk mengunggah perubahan lokal (*push*) dan sekaligus mengunduh pembaruan dari cloud (*pull*).

### Request Headers:
```http
POST /api/v1/sync HTTP/1.1
Authorization: Bearer my_secret_token_123
Content-Type: application/json
```

### Request Body:
```json
{
  "last_synced_at": 1724800000000,
  "categories": [
    {
      "id": "cat_kos",
      "name": "Tempat Tinggal",
      "icon": "home",
      "color": "#3F51B5",
      "created_at": 1724800000000
    }
  ],
  "expenses": [
    {
      "id": "exp_1724819000_abc",
      "title": "Kos Bulanan",
      "category_id": "cat_kos",
      "total_amount": 1417500,
      "date": "2026-08-01",
      "notes": "Lunas via transfer",
      "is_deleted": 0,
      "updated_at": 1724819000000,
      "created_at": 1724819000000
    }
  ],
  "expense_items": [
    {
      "id": "item_1724819000_1",
      "expense_id": "exp_1724819000_abc",
      "field_name": "kWh Digunakan",
      "field_value": "145",
      "field_type": "number",
      "unit": "kWh",
      "order_index": 0
    },
    {
      "id": "item_1724819000_2",
      "expense_id": "exp_1724819000_abc",
      "field_name": "Biaya Listrik",
      "field_value": "217500",
      "field_type": "currency",
      "unit": null,
      "order_index": 1
    }
  ]
}
```

### Alur Kerja di Server:
1. Validasi token di header.
2. Buka `DATABASE TRANSACTION`.
3. **Upsert Kategori**: Simpan atau perbarui data kategori.
4. **Upsert / Soft-Delete Pengeluaran**:
   - Jika `is_deleted === 1`, tandai `is_deleted = 1` di cloud database.
   - Jika `is_deleted === 0`, lakukan `UPSERT` pada tabel `expenses`.
5. **Simpan Custom Fields**:
   - Hapus items lama untuk expense_id yang dikirim: `DELETE FROM expense_items WHERE expense_id = ?`.
   - Masukkan items baru ke `expense_items`.
6. **Ambil Pembaruan Server (Pull)**:
   - Ambil data di server yang memiliki `updated_at > last_synced_at` (jika ada data dari perangkat lain).
7. `COMMIT TRANSACTION`.

### Response `200 OK`:
```json
{
  "status": "success",
  "message": "Sinkronisasi berhasil",
  "synced_at": 1724819550000,
  "pulled_data": {
    "categories": [],
    "expenses": [],
    "expense_items": []
  }
}
```

---

## 3. `GET /api/v1/expenses` (Ambil Data Historis / Arsip Cloud)
Digunakan ketika aplikasi diatur dengan **rentang waktu penyimpanan lokal terbatas** (misal hanya menyimpan 1 tahun di HP). Saat pengguna ingin melihat data lama sebelum rentang waktu tersebut, aplikasi memanggil endpoint ini untuk mengunduh data arsip dari cloud.

### Query Parameters:
- `start_date` (opsional): Format `YYYY-MM-DD` (contoh: `2024-01-01`)
- `end_date` (opsional): Format `YYYY-MM-DD` (contoh: `2024-12-31`)
- `category_id` (opsional): ID kategori
- `search` (opsional): Kata kunci pencarian judul/catatan
- `limit` (opsional, default: 50): Jumlah data per batch
- `offset` (opsional, default: 0): Paginasi data

### Contoh Request:
```http
GET /api/v1/expenses?start_date=2024-01-01&end_date=2024-12-31 HTTP/1.1
Authorization: Bearer my_secret_token_123
```

### Response `200 OK`:
```json
{
  "status": "success",
  "count": 1,
  "data": [
    {
      "id": "exp_1690000000_xyz",
      "title": "Kos Agustus 2024",
      "category_id": "cat_kos",
      "category_name": "Tempat Tinggal",
      "category_icon": "home",
      "category_color": "#3F51B5",
      "total_amount": 1350000,
      "date": "2024-08-01",
      "notes": "Tagihan kos lama",
      "is_deleted": 0,
      "updated_at": 1724800000000,
      "created_at": 1724800000000,
      "items": [
        {
          "id": "item_old_1",
          "expense_id": "exp_1690000000_xyz",
          "field_name": "kWh Digunakan",
          "field_value": "110",
          "field_type": "number",
          "unit": "kWh",
          "order_index": 0
        },
        {
          "id": "item_old_2",
          "expense_id": "exp_1690000000_xyz",
          "field_name": "Biaya Listrik",
          "field_value": "165000",
          "field_type": "currency",
          "unit": null,
          "order_index": 1
        }
      ]
    }
  ]
}
```

---

## 4. `GET /api/v1/expenses/:id` (Detail 1 Transaksi)
Digunakan untuk mengambil data lengkap 1 pengeluaran tertentu jika tidak ditemukan di SQLite lokal.

### Response `200 OK`:
```json
{
  "status": "success",
  "data": {
    "id": "exp_1724819000_abc",
    "title": "Kos Bulanan",
    "category_id": "cat_kos",
    "total_amount": 1417500,
    "date": "2026-08-01",
    "notes": "Lunas",
    "items": [
      {
        "id": "item_1",
        "expense_id": "exp_1724819000_abc",
        "field_name": "kWh Digunakan",
        "field_value": "145",
        "field_type": "number",
        "unit": "kWh",
        "order_index": 0
      }
    ]
  }
}
```

---

## 🗄️ Contoh Skema Database di Server (PostgreSQL / Supabase / MySQL)

Jika Anda membangun backend sendiri, berikut adalah DDL tabel yang cocok persis:

```sql
-- 1. Tabel Kategori
CREATE TABLE categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'tag-outline',
  color VARCHAR(20) NOT NULL DEFAULT '#3F51B5',
  created_at BIGINT NOT NULL
);

-- 2. Tabel Master Pengeluaran
CREATE TABLE expenses (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category_id VARCHAR(64) REFERENCES categories(id),
  total_amount NUMERIC(15, 2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  is_deleted SMALLINT DEFAULT 0,
  updated_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

-- 3. Tabel Detail Custom Fields Dinamis
CREATE TABLE expense_items (
  id VARCHAR(64) PRIMARY KEY,
  expense_id VARCHAR(64) REFERENCES expenses(id) ON DELETE CASCADE,
  field_name VARCHAR(150) NOT NULL,
  field_value TEXT NOT NULL,
  field_type VARCHAR(20) NOT NULL DEFAULT 'number', -- 'number', 'currency', 'text'
  unit VARCHAR(30),
  order_index INT DEFAULT 0
);

-- Indexing untuk query cepat
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_updated_at ON expenses(updated_at);
CREATE INDEX idx_expenses_is_deleted ON expenses(is_deleted);
CREATE INDEX idx_expense_items_expense_id ON expense_items(expense_id);
```
