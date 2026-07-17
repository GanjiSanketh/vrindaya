import { REVENUE_SOURCES } from './revenue.model';

export { REVENUE_SOURCES };

export const DISCREPANCY_TYPES = [
  'MissingPayment',
  'CommissionMismatch',
  'UnexpectedCharges',
  'SettlementDelay',
] as const;

export type DiscrepancyType = typeof DISCREPANCY_TYPES[number];

export const DISCREPANCY_LABELS: Record<DiscrepancyType, string> = {
  MissingPayment: 'Missing Payment',
  CommissionMismatch: 'Commission Mismatch',
  UnexpectedCharges: 'Unexpected Charges',
  SettlementDelay: 'Settlement Delay',
};

export interface SettlementReconciliation {
  summary: SettlementSummary;
  discrepancyGroups: DiscrepancyGroup[];
  discrepancies: SettlementDiscrepancy[];
}

export interface SettlementSummary {
  totalExpected: number;
  totalActual: number;
  totalDifference: number;
  totalRecords: number;
  matchedRecords: number;
  discrepancyCount: number;
  discrepancyAmount: number;
}

export interface DiscrepancyGroup {
  type: string;
  label: string;
  count: number;
  amount: number;
  icon: string;
}

export interface SettlementDiscrepancy {
  revenueId: string;
  revenueNumber: string;
  source: string;
  type: string;
  label: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  description: string;
  settlementDate: string;
  status: string;
}
