using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Revenues;

public class RevenueResponse
{
    public string Id { get; set; } = string.Empty;
    public string RevenueNumber { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string? Reference { get; set; }
    public DateTime SettlementDate { get; set; }
    public double ExpectedSettlement { get; set; }
    public double? ActualSettlement { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Notes { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateRevenueRequest
{
    [Required]
    [AllowedValues(Constants.RevenueSource.Flipkart, Constants.RevenueSource.Website,
        Constants.RevenueSource.Manual, Constants.RevenueSource.Instagram)]
    public string Source { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public double Amount { get; set; }

    [MaxLength(200)]
    public string? Reference { get; set; }

    public DateTime SettlementDate { get; set; } = DateTime.UtcNow;

    [Range(0, double.MaxValue)]
    public double ExpectedSettlement { get; set; }

    [Range(0, double.MaxValue)]
    public double? ActualSettlement { get; set; }

    [Required]
    [AllowedValues(Constants.RevenueStatus.Paid, Constants.RevenueStatus.Pending,
        Constants.RevenueStatus.Failed)]
    public string Status { get; set; } = Constants.RevenueStatus.Pending;

    public string? ProductId { get; set; }

    [MaxLength(300)]
    public string? ProductName { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateRevenueRequest : CreateRevenueRequest
{
}

public class RevenueSummaryResponse
{
    public string Period { get; set; } = string.Empty;
    public double TotalAmount { get; set; }
    public double TotalExpected { get; set; }
    public double TotalActual { get; set; }
    public double PendingAmount { get; set; }
    public int Count { get; set; }
    public List<RevenueSourceSummary> SourceBreakdown { get; set; } = [];
    public List<RevenueStatusSummary> StatusBreakdown { get; set; } = [];
}

public class RevenueSourceSummary
{
    public string Source { get; set; } = string.Empty;
    public double Amount { get; set; }
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class RevenueStatusSummary
{
    public string Status { get; set; } = string.Empty;
    public double Amount { get; set; }
    public int Count { get; set; }
}
