namespace Vrindaya.Api.DTOs.Settlement;

public class SettlementReconciliationResponse
{
    public SettlementSummary Summary { get; set; } = new();
    public List<DiscrepancyGroup> DiscrepancyGroups { get; set; } = [];
    public List<SettlementDiscrepancy> Discrepancies { get; set; } = [];
}

public class SettlementSummary
{
    public double TotalExpected { get; set; }
    public double TotalActual { get; set; }
    public double TotalDifference { get; set; }
    public int TotalRecords { get; set; }
    public int MatchedRecords { get; set; }
    public int DiscrepancyCount { get; set; }
    public double DiscrepancyAmount { get; set; }
}

public class DiscrepancyGroup
{
    public string Type { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Amount { get; set; }
    public string Icon { get; set; } = string.Empty;
}

public class SettlementDiscrepancy
{
    public string RevenueId { get; set; } = string.Empty;
    public string RevenueNumber { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public double ExpectedAmount { get; set; }
    public double ActualAmount { get; set; }
    public double Difference { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime SettlementDate { get; set; }
    public string Status { get; set; } = string.Empty;
}
