export const REVENUE_SOURCES = [
  'Flipkart', 'Website', 'Manual', 'Instagram',
] as const;

export type RevenueSource = typeof REVENUE_SOURCES[number];

export const REVENUE_SOURCE_LABELS: Record<RevenueSource, string> = {
  Flipkart: 'Flipkart',
  Website: 'Website',
  Manual: 'Manual',
  Instagram: 'Instagram',
};

export const REVENUE_STATUSES = ['Paid', 'Pending', 'Failed'] as const;

export type RevenueStatus = typeof REVENUE_STATUSES[number];

export const REVENUE_STATUS_LABELS: Record<RevenueStatus, string> = {
  Paid: 'Paid',
  Pending: 'Pending',
  Failed: 'Failed',
};

export interface Revenue {
  id: string;
  revenueNumber: string;
  source: string;
  amount: number;
  reference: string | null;
  settlementDate: string;
  expectedSettlement: number;
  actualSettlement: number | null;
  status: string;
  productId: string | null;
  productName: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRevenueRequest {
  source: string;
  amount: number;
  reference?: string;
  settlementDate: string;
  expectedSettlement: number;
  actualSettlement?: number;
  status: string;
  productId?: string;
  productName?: string;
  notes?: string;
}

export type UpdateRevenueRequest = CreateRevenueRequest;

export interface RevenueSummary {
  period: string;
  totalAmount: number;
  totalExpected: number;
  totalActual: number;
  pendingAmount: number;
  count: number;
  sourceBreakdown: RevenueSourceSummary[];
  statusBreakdown: RevenueStatusSummary[];
}

export interface RevenueSourceSummary {
  source: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface RevenueStatusSummary {
  status: string;
  amount: number;
  count: number;
}
