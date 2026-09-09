# 💰 MoneyWise

A modern personal expense tracking and financial analysis mobile application built with **Local-First (Offline-First)** architecture, **Dynamic Custom Fields**, **Inline Auto-Create Category**, **Head-to-Head Comparison Engine**, **Periodic Financial Dashboard**, and **Offline Excel Export (.xlsx)**.

Built with **Expo SDK 57**, **React Native 0.86**, **React Native Paper v5**, **Expo Router v57**, and local **SQLite (`expo-sqlite`)** storage.

---

## ✨ Key Features

### 1. 🗄️ 100% Offline Storage (Local-First)
- All transaction records, item details, and categories are stored locally on your device using **SQLite** (`expo-sqlite`) configured with high-performance `WAL (Write-Ahead Logging)` mode.
- Fully functional anytime, anywhere without requiring an active internet connection.

### 2. 📝 Dynamic Custom Fields (Flexible Item Breakdown)
- In addition to the total amount, each expense entry can have unlimited custom detail fields.
- **Example Use Case**:
  - Expense Entry: **"Monthly Rent & Utilities"**
  - Custom Detail Fields:
    - `Electricity Usage`: `145` (Unit: `kWh`, Type: Number)
    - `Electricity Bill`: `Rp 217,500` (Type: Currency)
    - `Room Rent`: `Rp 1,200,000` (Type: Currency)
- Interactive **"Calculate from Details"** button to automatically sum sub-items into the total expense amount.

### 3. 🏷️ Inline Auto-Create Category
- The category picker includes instant search.
- If an entered category does not yet exist in the database, a **`+ Create new category: "{name}"`** button appears instantly, allowing you to create and save new categories without leaving the form.

### 4. 💡 Auto-Template from History
- When entering an expense title that was previously recorded (e.g., *"Monthly Rent & Utilities"*), the system detects previous records and offers an auto-template banner:
  > *"Previous entry found: Use these detail fields?"*
- Automatically pre-populates all field structures and previous values as reference prices, eliminating the need to type repetitive field names every month.

### 5. 🔢 Thousands Separator & Live Readable Currency
- Amount and currency inputs automatically format with thousands separators as you type (e.g., `1500000` ➔ `1,500,000`).
- Displays an interactive spoken confirmation badge below the input (e.g., `💰 Reading: Rp 1,500,000 (1.5 Million)`), preventing errors when typing numbers with many zeros.

### 6. 🔍 Head-to-Head Comparison Engine (Price & Usage Tracking)
- Automatically matches and compares similar previous transactions on the expense detail screen.
- **Global Comparison**: Overall expense change (nominal difference and percentage change).
- **Field-Level Diff**:
  - Track usage fluctuations: `120 kWh ➔ 145 kWh (+25 kWh / +20.8% 📈)`
  - Track tariff/price changes: `Rp 180,000 ➔ Rp 217,500 (+Rp 37,500 📈)`
  - Visual status indicators: **Red** (increased spending/usage), **Green** (savings/decreased), and **Gray** (unchanged).

### 7. 📊 Periodic Financial Dashboard
- Filter date ranges: **Past 7 Days**, **This Month**, **This Year**, and **All Time**.
- Metric summary cards: Total Spending, Daily Average, Highest Expense, and Transaction Count.
- Progress bar breakdown visualising expenditure distribution per category.
- Quick preview of the 5 most recent transactions with shortcut access.

### 8. 📋 Comprehensive Expense History
- Dedicated history screen with instant search for titles or notes.
- Horizontal category chip filters.
- Dynamic calculation of filtered total amounts.

### 9. 📑 Offline Excel Export (.xlsx)
- Converts all expense entries and their custom fields into a spreadsheet file (`.xlsx`) completely offline using SheetJS (`xlsx`) and `expo-file-system`.
- Triggers the native device share sheet (`expo-sharing`) to save to local files or share via WhatsApp, Google Drive, and Email.

### 10. ☁️ Hybrid Cloud Sync & Local Storage Retention
- **Local Storage Retention**: Choose how long data is kept in device storage (**1 Month**, **3 Months**, **6 Months**, **1 Year**, or **All Time**). Synced older records can be cleaned safely to save device memory.
- **Cloud-Ready Sync**: Synchronize batch data two-way with your private API backend or Supabase.
- **Smart Local Caching**: Data retrieved from the cloud is automatically cached in local SQLite, ensuring instant load times and offline availability for subsequent sessions.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) (React Native 0.81.5) |
| **Routing** | [Expo Router v6](https://docs.expo.dev/router/introduction/) (File-based Routing) |
| **UI Components** | [React Native Paper v5](https://callstack.github.io/react-native-paper/) (Material Design 3) |
| **Database** | [expo-sqlite](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) (Local SQLite with WAL mode) |
| **Excel Export** | [SheetJS (xlsx)](https://docs.sheetjs.com/), `expo-file-system/legacy`, `expo-sharing` |
| **Animation** | `react-native-reanimated` |
| **Language** | TypeScript (~5.9.2) |

---

## 🚀 Getting Started

### 1. Prerequisites
- Ensure [Node.js](https://nodejs.org/) (LTS recommended) is installed on your machine.
- Install the **Expo Go** app on your Android/iOS device from Google Play Store or Apple App Store.

### 2. Install Dependencies
Run the following command in the project directory:
```bash
npm install
```

### 3. Start Development Server
```bash
npx expo start
```

Terminal controls:
- **Scan QR Code** using camera (iOS) or the Expo Go app (Android).
- Press **`a`** to open on Android Emulator.
- Press **`w`** to open in Web browser.
- Press **`r`** to reload the application.
- Press **`c`** to clear the Metro bundler cache if needed.

---

## 📂 Documentation

- 🌳 **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**: Directory tree structure and architectural file breakdown.
- 🌐 **[CLOUD_API.md](./CLOUD_API.md)**: Cloud backend REST API specification (Endpoints, Authentication, and SQL DDL schemas).

---

## 📄 License
Personal project for offline-first expense tracking and financial analysis.
