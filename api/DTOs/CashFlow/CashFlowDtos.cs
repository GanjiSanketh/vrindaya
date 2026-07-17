namespace Vrindaya.Api.DTOs.CashFlow;

public class CashFlowDashboardResponse
{
    public CashFlowSummary Summary { get; set; } = new();
    public List<CashFlowMonthlySeries> MonthlySeries { get; set; } = [];
    public List<CashFlowYearlySeries> YearlySeries { get; set; } = [];
}

public class CashFlowSummary
{
    public double MoneyIn { get; set; }
    public double MoneyOut { get; set; }
    public double PendingSettlements { get; set; }
    public double PendingExpenses { get; set; }
    public double CashBalance { get; set; }
}

public class CashFlowMonthlySeries
{
    public string Period { get; set; } = string.Empty;
    public double MoneyIn { get; set; }
    public double MoneyOut { get; set; }
    public double NetFlow { get; set; }
}

public class CashFlowYearlySeries
{
    public string Period { get; set; } = string.Empty;
    public double MoneyIn { get; set; }
    public double MoneyOut { get; set; }
    public double NetFlow { get; set; }
}
