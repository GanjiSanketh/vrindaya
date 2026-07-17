namespace Vrindaya.Api.DTOs.InventoryManagement;

/// <summary>
/// GET .../inventory-management/dashboard's response — 10 KPI cards + 6
/// chart series, all computed from the same filtered read (see
/// InventoryDashboardQuery). Filter option lists (categories/suppliers/
/// collections) are deliberately not duplicated here — the frontend already
/// has dedicated services for those dropdowns.
/// </summary>
public class InventoryDashboardResponse
{
    // ── Cards — always "as of now", never affected by the Date filter ─────
    public double InventoryValue { get; set; }
    public long CurrentStock { get; set; }
    public int LowStockCount { get; set; }
    public int CriticalStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public int TotalProducts { get; set; }
    public int TotalVariants { get; set; }
    public double ExpectedRevenue { get; set; }
    public double ExpectedProfit { get; set; }

    // ── Cards — scoped to the Date filter window (defaults to last 30 days) ─
    public double TodaysPurchases { get; set; }
    public long TodaysStockAdded { get; set; }

    // ── Charts ──────────────────────────────────────────────────────────────

    /// <summary>Daily net Σ(StockMovement.Delta), within the Date window.</summary>
    public List<TimeSeriesPoint> InventoryTrend { get; set; } = [];

    /// <summary>Per day in the Date window, count of currently Low/Out-of-Stock variants whose most recent stock-decreasing movement fell that day — an approximation; no historical stock snapshots exist to compute this exactly.</summary>
    public List<TimeSeriesPoint> LowStockTrend { get; set; } = [];

    /// <summary>"yyyy-MM" → Σ Confirmed purchase item Total. Respects the Date filter if narrowed, else defaults to the trailing 12 months.</summary>
    public List<NamedValue> PurchasesByMonth { get; set; } = [];

    /// <summary>Category name → Σ SoldStock. Will be empty until Order Management writes Sale movements/SoldStock — wired correctly ahead of that, not dead code.</summary>
    public List<NamedValue> TopSellingCategories { get; set; } = [];

    /// <summary>Supplier company name → Σ Confirmed purchase item Total, all time.</summary>
    public List<NamedValue> SupplierDistribution { get; set; } = [];

    /// <summary>Product name → Σ(CurrentStock × AveragePurchaseCost) across its variants, top 10, all time.</summary>
    public List<NamedValue> TopInventoryValue { get; set; } = [];

    public List<StockMovementResponse> RecentMovements { get; set; } = [];
}

public class TimeSeriesPoint
{
    /// <summary>"yyyy-MM-dd".</summary>
    public string Date { get; set; } = string.Empty;
    public double Value { get; set; }
}

public class NamedValue
{
    public string Name { get; set; } = string.Empty;
    public double Value { get; set; }
}
