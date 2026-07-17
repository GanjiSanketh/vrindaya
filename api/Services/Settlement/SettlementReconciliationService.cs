using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Settlement;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Settlement;

public class SettlementReconciliationService : ISettlementReconciliationService
{
    private readonly IRevenueRepository _revenueRepository;
    private readonly double _thresholdPercent = 1.0; // 1 % tolerance before flagging as mismatch

    public SettlementReconciliationService(IRevenueRepository revenueRepository)
    {
        _revenueRepository = revenueRepository;
    }

    public async Task<SettlementReconciliationResponse> GetReconciliationAsync(
        string? source, string? type, int? year, int? month, CancellationToken ct)
    {
        var allRevenues = await _revenueRepository.GetAllUnpagedAsync(ct);

        // Filter by period
        var filtered = allRevenues.Where(r =>
            (!year.HasValue || r.Data.SettlementDate.Year == year.Value) &&
            (!month.HasValue || r.Data.SettlementDate.Month == month.Value) &&
            (string.IsNullOrWhiteSpace(source) || r.Data.Source == source))
            .ToList();

        var now = DateTime.UtcNow;

        // Detect discrepancies
        var discrepancies = new List<SettlementDiscrepancy>();
        int matchedCount = 0;

        foreach (var (id, rev) in filtered)
        {
            var isMissingPayment = rev.Status == RevenueStatus.Pending
                && rev.SettlementDate < now
                && (!rev.ActualSettlement.HasValue || rev.ActualSettlement == 0);

            var isDelayed = rev.Status == RevenueStatus.Pending
                && rev.SettlementDate < now.AddDays(-7);

            var actual = rev.ActualSettlement ?? 0;
            var expected = rev.ExpectedSettlement;
            var diff = Math.Abs(expected - actual);
            var pctDiff = expected > 0 ? diff / expected * 100 : 0;

            var isCommissionMismatch = (rev.Status == RevenueStatus.Paid || actual > 0)
                && pctDiff > _thresholdPercent;

            var isUnexpectedCharges = actual > 0 && expected > 0
                && actual < expected
                && (expected - actual) / expected * 100 > 5.0;

            if (isCommissionMismatch)
            {
                var direction = actual > expected ? "overpaid" : "underpaid";
                discrepancies.Add(new SettlementDiscrepancy
                {
                    RevenueId = id,
                    RevenueNumber = rev.RevenueNumber,
                    Source = rev.Source,
                    Type = "CommissionMismatch",
                    Label = "Commission Mismatch",
                    ExpectedAmount = expected,
                    ActualAmount = actual,
                    Difference = Math.Round(actual - expected, 2),
                    Description = $"Expected {FormatInr(expected)}, actual {FormatInr(actual)} — {direction} by {FormatInr(Math.Abs(actual - expected))}",
                    SettlementDate = rev.SettlementDate,
                    Status = rev.Status,
                });
            }

            if (isUnexpectedCharges)
            {
                discrepancies.Add(new SettlementDiscrepancy
                {
                    RevenueId = id,
                    RevenueNumber = rev.RevenueNumber,
                    Source = rev.Source,
                    Type = "UnexpectedCharges",
                    Label = "Unexpected Charges",
                    ExpectedAmount = expected,
                    ActualAmount = actual,
                    Difference = Math.Round(actual - expected, 2),
                    Description = $"Expected {FormatInr(expected)}, received {FormatInr(actual)} — {FormatInr(expected - actual)} in unexplained deductions",
                    SettlementDate = rev.SettlementDate,
                    Status = rev.Status,
                });
            }

            if (isMissingPayment)
            {
                discrepancies.Add(new SettlementDiscrepancy
                {
                    RevenueId = id,
                    RevenueNumber = rev.RevenueNumber,
                    Source = rev.Source,
                    Type = "MissingPayment",
                    Label = "Missing Payment",
                    ExpectedAmount = expected,
                    ActualAmount = 0,
                    Difference = Math.Round(-expected, 2),
                    Description = $"Payment of {FormatInr(expected)} from {rev.Source} is past due since {rev.SettlementDate:dd-MMM-yyyy}",
                    SettlementDate = rev.SettlementDate,
                    Status = rev.Status,
                });
            }

            if (isDelayed)
            {
                var daysLate = (now - rev.SettlementDate).Days;
                discrepancies.Add(new SettlementDiscrepancy
                {
                    RevenueId = id,
                    RevenueNumber = rev.RevenueNumber,
                    Source = rev.Source,
                    Type = "SettlementDelay",
                    Label = "Settlement Delay",
                    ExpectedAmount = expected,
                    ActualAmount = actual,
                    Difference = Math.Round(-expected, 2),
                    Description = $"Settlement from {rev.Source} is {daysLate} days overdue (was due {rev.SettlementDate:dd-MMM-yyyy})",
                    SettlementDate = rev.SettlementDate,
                    Status = rev.Status,
                });
            }

            if (!isMissingPayment && !isDelayed && !isCommissionMismatch)
                matchedCount++;
        }

        // Filter by discrepancy type
        if (!string.IsNullOrWhiteSpace(type))
            discrepancies = discrepancies.Where(d => d.Type == type).ToList();

        // Group by type
        var groups = discrepancies
            .GroupBy(d => d.Type)
            .Select(g =>
            {
                var label = g.First().Label;
                var icon = g.Key switch
                {
                    "MissingPayment" => "bi-exclamation-triangle",
                    "CommissionMismatch" => "bi-arrow-left-right",
                    "UnexpectedCharges" => "bi-shield-exclamation",
                    "SettlementDelay" => "bi-clock-history",
                    _ => "bi-question-circle",
                };
                return new DiscrepancyGroup
                {
                    Type = g.Key,
                    Label = label,
                    Count = g.Count(),
                    Amount = Math.Round(g.Sum(d => Math.Abs(d.Difference)), 2),
                    Icon = icon,
                };
            })
            .OrderByDescending(g => g.Amount)
            .ToList();

        var totalExpected = Math.Round(filtered.Sum(r => r.Data.ExpectedSettlement), 2);
        var totalActual = Math.Round(filtered.Sum(r => r.Data.ActualSettlement ?? 0), 2);

        return new SettlementReconciliationResponse
        {
            Summary = new SettlementSummary
            {
                TotalExpected = totalExpected,
                TotalActual = totalActual,
                TotalDifference = Math.Round(totalExpected - totalActual, 2),
                TotalRecords = filtered.Count,
                MatchedRecords = matchedCount,
                DiscrepancyCount = discrepancies.Count,
                DiscrepancyAmount = Math.Round(discrepancies.Sum(d => Math.Abs(d.Difference)), 2),
            },
            DiscrepancyGroups = groups,
            Discrepancies = discrepancies,
        };
    }

    private static string FormatInr(double amount)
    {
        return $"₹{amount:N0}";
    }
}
