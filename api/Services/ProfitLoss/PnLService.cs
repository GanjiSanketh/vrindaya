using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.ProfitLoss;
using Vrindaya.Api.DTOs.Profitability;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.ProfitLoss;

public class PnLService : IPnLService
{
    private readonly IRevenueRepository _revenueRepository;
    private readonly IExpenseRepository _expenseRepository;
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IProfitabilityService _profitabilityService;
    private readonly IProductRepository _productRepository;
    private readonly IPurchaseEntryRepository _purchaseEntryRepository;
    private readonly IPurchaseItemRepository _purchaseItemRepository;

    public PnLService(
        IRevenueRepository revenueRepository,
        IExpenseRepository expenseRepository,
        IInventoryVariantRepository variantRepository,
        IProfitabilityService profitabilityService,
        IProductRepository productRepository,
        IPurchaseEntryRepository purchaseEntryRepository,
        IPurchaseItemRepository purchaseItemRepository)
    {
        _revenueRepository = revenueRepository;
        _expenseRepository = expenseRepository;
        _variantRepository = variantRepository;
        _profitabilityService = profitabilityService;
        _productRepository = productRepository;
        _purchaseEntryRepository = purchaseEntryRepository;
        _purchaseItemRepository = purchaseItemRepository;
    }

    public async Task<PnLDashboardResponse> GetDashboardAsync(int year, int? month, CancellationToken ct)
    {
        // Load all data sources in parallel
        var revenuesTask = _revenueRepository.GetAllUnpagedAsync(ct);
        var expensesTask = _expenseRepository.GetAllUnpagedAsync(ct);
        var variantsTask = _variantRepository.GetAllUnpagedAsync(ct);
        var productsTask = _productRepository.GetAllUnpagedAsync(ct);
        var purchaseEntriesTask = _purchaseEntryRepository.GetAllUnpagedAsync(ct);
        var purchaseItemsTask = _purchaseItemRepository.GetAllUnpagedAsync(ct);

        await Task.WhenAll(revenuesTask, expensesTask, variantsTask, productsTask, purchaseEntriesTask, purchaseItemsTask);

        var allRevenues = revenuesTask.Result;
        var allExpenses = expensesTask.Result;
        var allVariants = variantsTask.Result;
        var allProducts = productsTask.Result;
        var allPurchaseEntries = purchaseEntriesTask.Result;
        var allPurchaseItems = purchaseItemsTask.Result;

        // Filter by period
        var periodRevenues = FilterRevenues(allRevenues, year, month);
        var periodExpenses = FilterExpenses(allExpenses, year, month);

        // Get profitability data
        var profitabilityResult = await _profitabilityService.GetProfitabilityAsync(
            new ProfitabilityQuery { PageSize = 999999 }, ct);
        var profitabilityItems = profitabilityResult.Items;

        // Build product lookup (id -> category)
        var productCategories = allProducts.ToDictionary(p => p.Id, p => p.Data.Category ?? "Uncategorized");

        // ── Summary ──────────────────────────────────────────────
        var totalRevenue = Math.Round(periodRevenues.Sum(r => r.Data.Amount), 2);
        var totalExpenses = Math.Round(periodExpenses.Sum(e => e.Data.Amount), 2);

        var inventoryInvestment = Math.Round(allVariants.Sum(v =>
            v.Data.AveragePurchaseCost * v.Data.CurrentStock), 2);
        var inventoryValue = Math.Round(allVariants.Sum(v =>
            v.Data.CurrentStock * (v.Data.PurchaseCost > 0 ? v.Data.PurchaseCost : v.Data.AveragePurchaseCost)), 2);

        var expectedProfit = Math.Round(profitabilityItems.Sum(p => p.ExpectedProfit), 2);
        var realizedProfit = Math.Round(profitabilityItems.Where(p => p.NetProfit > 0).Sum(p => p.NetProfit), 2);

        var summary = new PnLSummary
        {
            TotalRevenue = totalRevenue,
            TotalExpenses = totalExpenses,
            GrossProfit = Math.Round(totalRevenue - totalExpenses, 2),
            NetProfit = Math.Round(totalRevenue - totalExpenses, 2),
            InventoryInvestment = inventoryInvestment,
            InventoryValue = inventoryValue,
            ExpectedProfit = expectedProfit,
            RealizedProfit = realizedProfit,
        };

        // ── Cost Breakdown ───────────────────────────────────────
        var costs = new PnLCostBreakdown
        {
            PackagingCost = Math.Round(periodExpenses
                .Where(e => e.Data.ExpenseCategory == ExpenseCategory.Packaging)
                .Sum(e => e.Data.Amount), 2),
            AdvertisementCost = Math.Round(periodExpenses
                .Where(e => e.Data.ExpenseCategory == ExpenseCategory.Advertisement)
                .Sum(e => e.Data.Amount), 2),
            MarketplaceCharges = Math.Round(periodExpenses
                .Where(e => e.Data.ExpenseCategory == ExpenseCategory.Marketplace)
                .Sum(e => e.Data.Amount), 2),
            TransportationCost = Math.Round(periodExpenses
                .Where(e => e.Data.ExpenseCategory == ExpenseCategory.Transportation
                         || e.Data.ExpenseCategory == ExpenseCategory.Courier)
                .Sum(e => e.Data.Amount), 2),
        };

        // ── Monthly Series (last 12 months up to requested period) ─
        var monthlySeries = BuildMonthlySeries(allRevenues, allExpenses, year, month);

        // ── Yearly Series ────────────────────────────────────────
        var yearlySeries = BuildYearlySeries(allRevenues, allExpenses);

        // ── Category-wise Profit ─────────────────────────────────
        var categoryBreakdown = BuildCategoryBreakdown(profitabilityItems, productCategories);

        // ── Supplier-wise Breakdow ───────────────────────────────
        var supplierBreakdown = BuildSupplierBreakdown(allPurchaseEntries, allPurchaseItems);

        // ── Marketplace-wise Profit ──────────────────────────────
        var marketplaceBreakdown = BuildMarketplaceBreakdown(profitabilityItems);

        return new PnLDashboardResponse
        {
            Summary = summary,
            Costs = costs,
            MonthlySeries = monthlySeries,
            YearlySeries = yearlySeries,
            CategoryBreakdown = categoryBreakdown,
            SupplierBreakdown = supplierBreakdown,
            MarketplaceBreakdown = marketplaceBreakdown,
        };
    }

    // ── Filter helpers ──────────────────────────────────────────────

    private static List<(string Id, RevenueDocument Data)> FilterRevenues(
        List<(string Id, RevenueDocument Data)> revenues, int year, int? month)
    {
        return revenues.Where(r =>
            r.Data.SettlementDate.Year == year &&
            (!month.HasValue || r.Data.SettlementDate.Month == month.Value))
            .ToList();
    }

    private static List<(string Id, ExpenseDocument Data)> FilterExpenses(
        List<(string Id, ExpenseDocument Data)> expenses, int year, int? month)
    {
        return expenses.Where(e =>
            e.Data.ExpenseDate.Year == year &&
            (!month.HasValue || e.Data.ExpenseDate.Month == month.Value))
            .ToList();
    }

    // ── Monthly Series ──────────────────────────────────────────────

    private static List<PnLMonthlySeries> BuildMonthlySeries(
        List<(string Id, RevenueDocument Data)> allRevenues,
        List<(string Id, ExpenseDocument Data)> allExpenses,
        int year, int? month)
    {
        // Determine the range: last 12 months ending at (year, month)
        int endYear = year;
        int endMonth = month ?? 12;

        var series = new List<PnLMonthlySeries>();
        for (int i = 0; i < 12; i++)
        {
            int m = endMonth - i;
            int y = endYear;
            while (m < 1) { m += 12; y--; }

            var period = $"{y}-{m:D2}";
            var rev = Math.Round(allRevenues
                .Where(r => r.Data.SettlementDate.Year == y && r.Data.SettlementDate.Month == m)
                .Sum(r => r.Data.Amount), 2);
            var exp = Math.Round(allExpenses
                .Where(e => e.Data.ExpenseDate.Year == y && e.Data.ExpenseDate.Month == m)
                .Sum(e => e.Data.Amount), 2);

            series.Add(new PnLMonthlySeries
            {
                Period = period,
                Revenue = rev,
                Expenses = exp,
                NetProfit = Math.Round(rev - exp, 2),
            });
        }

        series.Reverse(); // chronological order
        return series;
    }

    // ── Yearly Series ───────────────────────────────────────────────

    private static List<PnLYearlySeries> BuildYearlySeries(
        List<(string Id, RevenueDocument Data)> allRevenues,
        List<(string Id, ExpenseDocument Data)> allExpenses)
    {
        var years = allRevenues
            .Select(r => r.Data.SettlementDate.Year)
            .Concat(allExpenses.Select(e => e.Data.ExpenseDate.Year))
            .Distinct()
            .OrderBy(y => y)
            .ToList();

        return years.Select(y =>
        {
            var rev = Math.Round(allRevenues
                .Where(r => r.Data.SettlementDate.Year == y)
                .Sum(r => r.Data.Amount), 2);
            var exp = Math.Round(allExpenses
                .Where(e => e.Data.ExpenseDate.Year == y)
                .Sum(e => e.Data.Amount), 2);
            return new PnLYearlySeries
            {
                Period = y.ToString(),
                Revenue = rev,
                Expenses = exp,
                NetProfit = Math.Round(rev - exp, 2),
            };
        }).ToList();
    }

    // ── Category Breakdown ─────────────────────────────────────────

    private static List<PnLCategoryBreakdown> BuildCategoryBreakdown(
        List<ProductProfitabilityResponse> profitabilityItems,
        Dictionary<string, string> productCategories)
    {
        return profitabilityItems
            .GroupBy(p => productCategories.GetValueOrDefault(p.ProductId, "Uncategorized"))
            .Select(g => new PnLCategoryBreakdown
            {
                Category = g.Key,
                Revenue = Math.Round(g.Sum(p => p.ExpectedRevenue), 2),
                Cost = Math.Round(g.Sum(p => p.TotalCost), 2),
                Profit = Math.Round(g.Sum(p => p.NetProfit), 2),
                Count = g.Count(),
            })
            .OrderByDescending(c => c.Profit)
            .ToList();
    }

    // ── Supplier Breakdown ─────────────────────────────────────────

    private static List<PnLSupplierBreakdown> BuildSupplierBreakdown(
        List<(string Id, PurchaseEntryDocument Data)> purchaseEntries,
        List<(string Id, PurchaseItemDocument Data)> purchaseItems)
    {
        // Build set of Confirmed purchase entry IDs
        var confirmedEntryIds = purchaseEntries
            .Where(e => e.Data.Status == "Confirmed")
            .Select(e => e.Id)
            .ToHashSet();

        // Group Confirmed items by supplier
        // Build a lookup of entry ID -> supplier name
        var entrySupplierMap = purchaseEntries
            .Where(e => e.Data.Status == "Confirmed")
            .ToDictionary(e => e.Id, e => e.Data.Supplier);

        var supplierGroups = purchaseItems
            .Where(i => i.Data.Status == "Confirmed" && confirmedEntryIds.Contains(i.Data.PurchaseEntryId))
            .GroupBy(i => i.Data.SupplierId ?? "Unknown");

        return supplierGroups.Select(g =>
        {
            var firstEntryId = g.First().Data.PurchaseEntryId;
            var supplierName = entrySupplierMap.TryGetValue(firstEntryId, out var name) ? name : "Unknown";
            return new PnLSupplierBreakdown
            {
                SupplierId = g.Key,
                SupplierName = supplierName,
                TotalPurchases = Math.Round(g.Sum(i => i.Data.Total), 2),
                PurchaseCount = g.Count(),
            };
        })
        .OrderByDescending(s => s.TotalPurchases)
        .ToList();
    }

    // ── Marketplace Breakdown ──────────────────────────────────────

    private static List<PnLMarketplaceBreakdown> BuildMarketplaceBreakdown(
        List<ProductProfitabilityResponse> profitabilityItems)
    {
        return profitabilityItems
            .GroupBy(p => p.Marketplace)
            .Select(g =>
            {
                var totalRevenue = g.Sum(p => p.ExpectedRevenue);
                var totalCost = g.Sum(p => p.TotalCost);
                var totalProfit = g.Sum(p => p.NetProfit);
                return new PnLMarketplaceBreakdown
                {
                    Marketplace = g.Key,
                    Revenue = Math.Round(totalRevenue, 2),
                    Cost = Math.Round(totalCost, 2),
                    Profit = Math.Round(totalProfit, 2),
                    Margin = totalRevenue > 0 ? Math.Round(totalProfit / totalRevenue * 100, 1) : 0,
                    ListingCount = g.Count(),
                };
            })
            .OrderByDescending(m => m.Profit)
            .ToList();
    }
}
