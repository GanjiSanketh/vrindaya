export interface CashFlowDashboard {
  summary: CashFlowSummary;
  monthlySeries: CashFlowMonthlySeries[];
  yearlySeries: CashFlowYearlySeries[];
}

export interface CashFlowSummary {
  moneyIn: number;
  moneyOut: number;
  pendingSettlements: number;
  pendingExpenses: number;
  cashBalance: number;
}

export interface CashFlowMonthlySeries {
  period: string;
  moneyIn: number;
  moneyOut: number;
  netFlow: number;
}

export interface CashFlowYearlySeries {
  period: string;
  moneyIn: number;
  moneyOut: number;
  netFlow: number;
}
