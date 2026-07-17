export const EXPENSE_PAYMENT_STATUSES = ['Paid', 'Pending', 'Cancelled'] as const;

export const EXPENSE_CATEGORIES = [
  'Advertisement', 'Packaging', 'Transportation', 'Courier', 'Office', 'Salary',
  'Internet', 'Electricity', 'Software', 'Marketplace', 'Photography', 'Miscellaneous',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Advertisement: 'Advertisement',
  Packaging: 'Packaging',
  Transportation: 'Transportation',
  Courier: 'Courier',
  Office: 'Office',
  Salary: 'Salary',
  Internet: 'Internet',
  Electricity: 'Electricity',
  Software: 'Software',
  Marketplace: 'Marketplace',
  Photography: 'Photography',
  Miscellaneous: 'Miscellaneous',
};

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseCategory: string;
  expenseType: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  gst: number;
  paymentMethod: string | null;
  referenceNumber: string | null;
  invoiceNumber: string | null;
  expenseDate: string;
  notes: string | null;
  paymentStatus: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  expenseCategory: string;
  expenseType: string;
  vendor?: string;
  description?: string;
  amount: number;
  gst: number;
  paymentMethod?: string;
  referenceNumber?: string;
  invoiceNumber?: string;
  expenseDate: string;
  notes?: string;
  paymentStatus: string;
}

export type UpdateExpenseRequest = CreateExpenseRequest;

export interface ExpenseSummary {
  period: string;
  totalAmount: number;
  totalGst: number;
  count: number;
  categoryBreakdown: ExpenseCategorySummary[];
}

export interface ExpenseCategorySummary {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}
