# 🌐 Cloud Backend REST API Specification - MoneyWise

This document provides the technical guidelines and official API contract for building a cloud backend service (using Node.js/Express, Python/FastAPI, Go, Laravel, or BaaS such as Supabase) to integrate with the **MoneyWise** mobile application.

---

## 📋 API Endpoints Summary

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Server availability & connectivity health check | Required |
| `POST` | `/api/v1/sync` | Two-way batch sync (Push local changes & Pull server updates) | Required |
| `GET` | `/api/v1/expenses` | Fetch historical/archived expenses on-demand | Required |
| `GET` | `/api/v1/expenses/:id` | Fetch single expense details with custom fields | Optional |

---

## 🔒 Security & Authentication Standard

All requests sent from the mobile application include standard authentication headers:
```http
Authorization: Bearer <API_KEY_OR_TOKEN>
Content-Type: application/json
Accept: application/json
```
If the token is invalid or missing, the server **must** return:
- **HTTP Status**: `401 Unauthorized`
- **Body**: `{"error": "Unauthorized", "message": "Invalid API Key or Bearer token"}`

---

## 1. `GET /api/v1/health` (Health Check)
Used by the mobile application to verify whether the `Cloud Base URL` entered in Settings is reachable and operational.

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

## 2. `POST /api/v1/sync` (Two-Way Batch Synchronization)
The primary endpoint for pushing local offline changes (inserts, updates, soft-deletes) and pulling remote updates in a single round-trip.

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
      "name": "Housing & Utilities",
      "icon": "home",
      "color": "#3F51B5",
      "created_at": 1724800000000
    }
  ],
  "expenses": [
    {
      "id": "exp_1724819000_abc",
      "title": "Monthly Rent",
      "category_id": "cat_kos",
      "total_amount": 1417500,
      "date": "2026-08-01",
      "notes": "Paid via bank transfer",
      "is_deleted": 0,
      "updated_at": 1724819000000,
      "created_at": 1724819000000
    }
  ],
  "expense_items": [
    {
      "id": "item_1724819000_1",
      "expense_id": "exp_1724819000_abc",
      "field_name": "Electricity Usage",
      "field_value": "145",
      "field_type": "number",
      "unit": "kWh",
      "order_index": 0
    },
    {
      "id": "item_1724819000_2",
      "expense_id": "exp_1724819000_abc",
      "field_name": "Electricity Bill",
      "field_value": "217500",
      "field_type": "currency",
      "unit": null,
      "order_index": 1
    }
  ]
}
```

### Server-Side Business Logic:
1. Validate token in headers.
2. Open a `DATABASE TRANSACTION`.
3. **Upsert Categories**: Insert new categories or update existing ones.
4. **Upsert / Soft-Delete Expenses**:
   - If `is_deleted === 1`, mark as deleted in the cloud database: `UPDATE expenses SET is_deleted = 1 WHERE id = ?`.
   - If `is_deleted === 0`, execute an `UPSERT` on the `expenses` table.
5. **Sync Custom Fields**:
   - Clear existing items for the incoming expense IDs: `DELETE FROM expense_items WHERE expense_id = ?`.
   - Insert new records into `expense_items`.
6. **Fetch Server Updates (Pull)**:
   - Query records where `updated_at > last_synced_at` to send back changes from other devices or server updates.
7. `COMMIT TRANSACTION`.

### Response `200 OK`:
```json
{
  "status": "success",
  "message": "Synchronization completed successfully",
  "synced_at": 1724819550000,
  "pulled_data": {
    "categories": [],
    "expenses": [],
    "expense_items": []
  }
}
```

---

## 3. `GET /api/v1/expenses` (On-Demand Historical Archive)
Called when the user browses records older than the device's local retention period (e.g. data older than 1 year). The app downloads historical data and caches it into local SQLite for instant future access.

### Query Parameters:
- `start_date` (optional): `YYYY-MM-DD` format (e.g. `2024-01-01`)
- `end_date` (optional): `YYYY-MM-DD` format (e.g. `2024-12-31`)
- `category_id` (optional): Category ID filter
- `search` (optional): Text search for title or notes
- `limit` (optional, default: 50): Number of records per page
- `offset` (optional, default: 0): Pagination offset

### Request Example:
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
      "title": "August Rent 2024",
      "category_id": "cat_kos",
      "category_name": "Housing & Utilities",
      "category_icon": "home",
      "category_color": "#3F51B5",
      "total_amount": 1350000,
      "date": "2024-08-01",
      "notes": "Archived rent record",
      "is_deleted": 0,
      "updated_at": 1724800000000,
      "created_at": 1724800000000,
      "items": [
        {
          "id": "item_old_1",
          "expense_id": "exp_1690000000_xyz",
          "field_name": "Electricity Usage",
          "field_value": "110",
          "field_type": "number",
          "unit": "kWh",
          "order_index": 0
        },
        {
          "id": "item_old_2",
          "expense_id": "exp_1690000000_xyz",
          "field_name": "Electricity Bill",
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

## 4. `GET /api/v1/expenses/:id` (Single Expense Details)
Used to retrieve complete details and custom fields of a single expense if not present in local SQLite.

### Response `200 OK`:
```json
{
  "status": "success",
  "data": {
    "id": "exp_1724819000_abc",
    "title": "Monthly Rent",
    "category_id": "cat_kos",
    "total_amount": 1417500,
    "date": "2026-08-01",
    "notes": "Paid",
    "items": [
      {
        "id": "item_1",
        "expense_id": "exp_1724819000_abc",
        "field_name": "Electricity Usage",
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

## 🗄️ Database DDL Schema (PostgreSQL / Supabase / MySQL)

If you are setting up your own backend database, the following DDL statements define the matching schema:

```sql
-- 1. Categories Table
CREATE TABLE categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'tag-outline',
  color VARCHAR(20) NOT NULL DEFAULT '#3F51B5',
  created_at BIGINT NOT NULL
);

-- 2. Master Expenses Table
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

-- 3. Dynamic Custom Field Items Table
CREATE TABLE expense_items (
  id VARCHAR(64) PRIMARY KEY,
  expense_id VARCHAR(64) REFERENCES expenses(id) ON DELETE CASCADE,
  field_name VARCHAR(150) NOT NULL,
  field_value TEXT NOT NULL,
  field_type VARCHAR(20) NOT NULL DEFAULT 'number', -- 'number', 'currency', 'text'
  unit VARCHAR(30),
  order_index INT DEFAULT 0
);

-- Indexes for optimal performance
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_updated_at ON expenses(updated_at);
CREATE INDEX idx_expenses_is_deleted ON expenses(is_deleted);
CREATE INDEX idx_expense_items_expense_id ON expense_items(expense_id);
```
