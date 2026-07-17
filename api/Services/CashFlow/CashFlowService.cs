using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.CashFlow;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.CashFlow;

public class CashFlowService : ICashFlowService
{
    private readonly IRevenueRepository _revenueRepository;
    private readonly IExpenseRepository _expenseRepository;

    public CashFlowService(IRevenueRepository revenueRepository, IExpenseRepository expenseRepository)
    {
        _revenueRepository = revenueRepository;
        _expenseRepository = expenseRepository;
    }

    public async Task<CashFlowDashboardResponse> GetDashboardAsync(int year, int? month, CancellationToken ct)
    {
        var allRevenues = await _revenueRepository.GetAllUnpagedAsync(ct);
        var allExpenses = await _expenseRepository.GetAllUnpagedAsync(ct);

        // Filter by period
        var periodRevenues = allRevenues.Where(r =>
            r.Data.SettlementDate.Year == year &&
            (!month.HasValue || r.Data.SettlementDate.Month == month.Value)).ToList();

        var periodExpenses = allExpenses.Where(e =>
            e.Data.ExpenseDate.Year == year &&
            (!month.HasValue || e.Data.ExpenseDate.Month == month.Value)).ToList();

        // ── Summary ──────────────────────────────────────────────
        var moneyIn = Math.Round(periodRevenues
            .Where(r => r.Data.Status == RevenueStatus.Paid)
            .Sum(r => r.Data.Amount), 2);

        var moneyOut = Math.Round(periodExpenses
            .Where(e => e.Data.PaymentStatus == ExpensePaymentStatus.Paid)
            .Sum(e => e.Data.Amount), 2);

        var pendingSettlements = Math.Round(periodRevenues
            .Where(r => r.Data.Status == RevenueStatus.Pending)
            .Sum(r => r.Data.Amount), 2);

        var pendingExpenses = Math.Round(periodExpenses
            .Where(e => e.Data.PaymentStatus == ExpensePaymentStatus.Pending)
            .Sum(e => e.Data.Amount), 2);

        var summary = new CashFlowSummary
        {
            MoneyIn = moneyIn,
            MoneyOut = moneyOut,
            PendingSettlements = pendingSettlements,
            PendingExpenses = pendingExpenses,
            CashBalance = Math.Round(moneyIn - moneyOut, 2),
        };

        // ── Monthly Series (last 12 months) ──────────────────────
        int endYear = year;
        int endMonth = month ?? 12;

        var monthlySeries = new List<CashFlowMonthlySeries>();
        for (int i = 0; i < 12; i++)
        {
            int m = endMonth - i;
            int y = endYear;
            while (m < 1) { m += 12; y--; }

            var period = $"{y}-{m:D2}";
            var mi = Math.Round(allRevenues
                .Where(r => r.Data.SettlementDate.Year == y && r.Data.SettlementDate.Month == m && r.Data.Status == RevenueStatus.Paid)
                .Sum(r => r.Data.Amount), 2);
            var mo = Math.Round(allExpenses
                .Where(e => e.Data.ExpenseDate.Year == y && e.Data.ExpenseDate.Month == m && e.Data.PaymentStatus == ExpensePaymentStatus.Paid)
                .Sum(e => e.Data.Amount), 2);

            monthlySeries.Add(new CashFlowMonthlySeries
            {
                Period = period,
                MoneyIn = mi,
                MoneyOut = mo,
                NetFlow = Math.Round(mi - mo, 2),
            });
        }
        monthlySeries.Reverse();

        // ── Yearly Series ────────────────────────────────────────
        var years = allRevenues
            .Select(r => r.Data.SettlementDate.Year)
            .Concat(allExpenses.Select(e => e.Data.ExpenseDate.Year))
            .Distinct()
            .OrderBy(y => y)
            .ToList();

        var yearlySeries = years.Select(y =>
        {
            var mi = Math.Round(allRevenues
                .Where(r => r.Data.SettlementDate.Year == y && r.Data.Status == RevenueStatus.Paid)
                .Sum(r => r.Data.Amount), 2);
            var mo = Math.Round(allExpenses
                .Where(e => e.Data.ExpenseDate.Year == y && e.Data.PaymentStatus == ExpensePaymentStatus.Paid)
                .Sum(e => e.Data.Amount), 2);
            return new CashFlowYearlySeries
            {
                Period = y.ToString(),
                MoneyIn = mi,
                MoneyOut = mo,
                NetFlow = Math.Round(mi - mo, 2),
            };
        }).ToList();

        return new CashFlowDashboardResponse
        {
            Summary = summary,
            MonthlySeries = monthlySeries,
            YearlySeries = yearlySeries,
        };
    }
}
