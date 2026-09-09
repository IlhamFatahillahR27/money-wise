# 🌳 Project Structure: `money-wise`

This document details the complete directory tree structure, file organization, and architectural layers of **MoneyWise** (a Local-First Personal Expense Tracking and Analysis mobile app) built using **Expo SDK 57**, **React Native 0.86**, **Expo Router v57**, **React Native Paper v5**, and **SQLite (`expo-sqlite`)**.

---

## 1. Directory Tree Visualization

```text
money-wise/
├── .claude/
│   └── settings.json                     # Claude Code environment settings
├── .vscode/
│   ├── extensions.json                   # Recommended VS Code extensions
│   └── settings.json                     # VS Code workspace settings
├── app/                                  # Expo Router file-based routes
│   ├── (tabs)/                           # Bottom Tab Navigation route group
│   │   ├── _layout.tsx                   # Bottom Tab Navigator config (Dashboard & History)
│   │   ├── explore.tsx                   # Expense History screen (Search, Category Filters, Excel Export)
│   │   └── index.tsx                     # Main Financial Dashboard (Metrics, Stats, & Periodic Analysis)
│   ├── expense/                          # Dynamic expense routes
│   │   └── [id].tsx                      # Expense Detail & Head-to-Head Comparison screen
│   ├── _layout.tsx                       # Root Layout: Paper & Navigation Providers, Stack, & SQLite Init
│   ├── modal.tsx                         # Modal screen hosting ExpenseForm for new entries
│   └── settings.tsx                      # Settings Screen (Excel Export, Local Retention, Cloud Sync)
├── assets/                               # Static media and image assets
│   └── images/                           # Application icons, graphics, and splash screen
│       ├── android-icon-background.png   # Android adaptive icon background
│       ├── android-icon-foreground.png   # Android adaptive icon foreground
│       ├── android-icon-monochrome.png   # Android monochrome icon
│       ├── favicon.png                   # Web favicon
│       ├── icon.png                      # App primary launcher icon
│       ├── partial-react-logo.png        # Decorative React logo graphic
│       ├── react-logo.png                # React logo
│       ├── react-logo@2x.png             # React logo 2x resolution
│       ├── react-logo@3x.png             # React logo 3x resolution
│       └── splash-icon.png               # App splash screen graphic
├── components/                           # Modular and reusable UI components
│   ├── dashboard/                        # Dashboard-specific components
│   │   ├── category-breakdown.tsx        # Category spending progress bar distribution
│   │   ├── period-selector.tsx           # Period filter buttons (7 Days, Month, Year, All)
│   │   └── stat-card.tsx                 # Metric summary cards (Total, Daily Avg, Max, Count)
│   ├── expense/                          # Expense and form components
│   │   ├── category-picker.tsx           # Category selector with inline auto-create
│   │   ├── comparison-card.tsx           # Head-to-head comparison card (Total diff & item deltas)
│   │   ├── custom-field-input.tsx        # Dynamic custom field rows (Number, Currency, Text, Units)
│   │   ├── expense-card.tsx              # Expense summary card for lists
│   │   └── expense-form.tsx              # Main expense form with auto-template & number formatting
│   ├── ui/                               # Primitive and helper UI components
│   │   ├── animated-splash-screen.tsx    # Smooth animated startup branding & loading splash screen
│   │   ├── collapsible.tsx               # Animated accordion/collapsible component
│   │   ├── icon-symbol.ios.tsx           # Native iOS SF Symbols icon wrapper
│   │   └── icon-symbol.tsx               # Cross-platform MaterialIcons icon wrapper
│   ├── external-link.tsx                 # External web browser link handler
│   ├── haptic-tab.tsx                    # Tab bar button with haptic feedback
│   ├── hello-wave.tsx                    # Waving hand animation component
│   ├── parallax-scroll-view.tsx          # ScrollView with parallax header animation
│   ├── themed-text.tsx                   # Light/Dark adaptive typography component
│   └── themed-view.tsx                   # Light/Dark adaptive container view
├── constants/                            # Constant values & design tokens
│   └── theme.ts                          # App theme colors and typography definitions
├── hooks/                                # Custom React hooks
│   ├── use-color-scheme.ts               # Native device dark/light color scheme hook
│   ├── use-color-scheme.web.ts           # Web dark/light color scheme hook
│   └── use-theme-color.ts                # Theme color resolver helper hook
├── scripts/                              # Development and automation scripts
│   └── reset-project.js                  # Starter template reset utility
├── services/                             # Business logic & Data layer
│   ├── analytics/                        # Analytical computation services
│   │   └── comparison-engine.ts          # Head-to-head expense comparison calculation engine
│   ├── cloud/                            # Cloud integration & sync services
│   │   └── cloud-sync-service.ts         # Two-way batch sync, health check, & retention manager
│   ├── db/                               # Local SQLite database layer
│   │   ├── category-repository.ts        # Category CRUD & findOrCreateCategory helper
│   │   ├── database.ts                   # SQLite connection, DDL schema, & Promise singleton
│   │   └── expense-repository.ts         # ACID expense CRUD, similar record matcher, & summaries
│   └── export/                           # Document export services
│       └── excel-export.ts               # 100% offline Excel (.xlsx) export via SheetJS & Sharing
├── types/                                # TypeScript type definitions & interfaces
│   └── expense.ts                        # Data models for expenses, custom fields, categories, & sync
├── utils/                                # Helper utilities
│   └── currency.ts                       # IDR formatting, thousands separator, & date formatters
├── .gitignore                            # Git version control ignore rules
├── AGENTS.md                             # AI guidance & Expo SDK 54 documentation reference
├── app.json                              # Expo app configuration (plugins, icons, permissions)
├── CLAUDE.md                             # AI Claude instructions reference
├── CLOUD_API.md                          # Cloud Backend REST API Specification (Endpoints & SQL DDL)
├── eslint.config.js                      # ESLint 9 configuration (Flat Config)
├── expo-env.d.ts                         # Ambient Expo TypeScript declarations
├── package.json                          # Project dependency manifest and npm scripts
├── package-lock.json                     # Dependency lockfile
├── README.md                             # Main project documentation & getting started guide
└── tsconfig.json                         # TypeScript compiler configuration & path aliases (@/*)
```

---

## 2. Architectural Layer Breakdown

### 🗄️ Data & Service Layer (`services/`)
- **`services/db/database.ts`**: Initializes the local SQLite database (`moneywise.db`) using a robust **Promise Singleton** pattern to eliminate cold-start race conditions. Configures `WAL` mode and creates `categories`, `expenses`, `expense_items`, and `app_settings` tables in an atomic batch.
- **`services/db/expense-repository.ts`**: Handles ACID transactional operations (saving an expense simultaneously with its dynamic custom fields), soft deletions (`is_deleted`), periodic summary aggregations, and local retention purging.
- **`services/db/category-repository.ts`**: Manages category data and provides `findOrCreateCategory(name)` which auto-creates and persists new categories inline.
- **`services/cloud/cloud-sync-service.ts`**: Orchestrates two-way batch synchronization with cloud endpoints (`/api/v1/sync`), checks server connectivity (`/api/v1/health`), and caches remote entries into local SQLite.
- **`services/analytics/comparison-engine.ts`**: Calculates head-to-head diffs between current and previous similar expenses (total difference and item-by-item delta/percentage trends).
- **`services/export/excel-export.ts`**: Generates `.xlsx` spreadsheets offline and launches the device native share sheet via `expo-sharing`.

### 📱 UI & Component Layer (`components/` & `app/`)
- **`app/(tabs)/index.tsx` (Dashboard)**: Displays periodic financial metrics, category breakdown progress bars, 5 recent transactions, and cloud-sync status indicator.
- **`app/(tabs)/explore.tsx` (History)**: Full transaction history screen with instant search, category chip filters, and direct Excel export shortcut.
- **`app/expense/[id].tsx` (Detail & Comparison)**: Detailed breakdown of an expense entry, its custom fields table, and automated head-to-head comparison against the previous record.
- **`app/modal.tsx` & `components/expense/expense-form.tsx`**: Primary expense input form with automated previous-entry template detection, live thousands formatting, readable currency badges, and keyboard-safe scrolling.
- **`app/settings.tsx` (Settings)**: Local retention duration selector (1 Month to All Time), manual storage cleanup, Cloud Base URL configuration, connection testing, and full database Excel export.
