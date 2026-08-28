export type CustomFieldType = 'number' | 'currency' | 'text';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_synced: number;
  created_at: number;
}

export interface ExpenseCustomField {
  id: string;
  expense_id: string;
  field_name: string;
  field_value: string;
  field_type: CustomFieldType;
  unit?: string | null;
  order_index: number;
}

export interface Expense {
  id: string;
  title: string;
  category_id: string;
  total_amount: number;
  date: string; // ISO format 'YYYY-MM-DD'
  notes?: string | null;
  is_synced: number;
  synced_at?: number | null;
  updated_at: number;
  is_deleted: number;
  created_at: number;
}

export interface ExpenseWithDetails extends Expense {
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  items: ExpenseCustomField[];
}

export type TrendDirection = 'INCREASED' | 'DECREASED' | 'UNCHANGED' | 'NEW';

export interface FieldComparison {
  field_name: string;
  field_type: CustomFieldType;
  unit?: string | null;
  previous_value: string | null;
  current_value: string;
  numeric_diff: number | null;
  percentage_change: number | null;
  trend: TrendDirection;
}

export interface ExpenseComparison {
  current_expense: ExpenseWithDetails;
  previous_expense: ExpenseWithDetails;
  total_diff: number;
  total_percentage_change: number;
  total_trend: TrendDirection;
  field_comparisons: FieldComparison[];
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

export interface PeriodicSummary {
  total_expense: number;
  daily_average: number;
  highest_expense: number;
  transaction_count: number;
  categories_breakdown: CategorySummary[];
}

export type PeriodType = 'week' | 'month' | 'year' | 'all';

export type RetentionPeriod = '1_month' | '3_months' | '6_months' | '1_year' | 'all';

export interface CloudSyncPayload {
  last_synced_at: number;
  categories: Category[];
  expenses: Expense[];
  expense_items: ExpenseCustomField[];
}

export interface CloudSyncResponse {
  status: string;
  message?: string;
  synced_at: number;
  pulled_data?: {
    categories: Category[];
    expenses: Expense[];
    expense_items: ExpenseCustomField[];
  };
}
