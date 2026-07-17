using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Reports;

public class ReportQuery
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? CategoryId { get; set; }
    public string? SupplierId { get; set; }
    public string? ProductId { get; set; }
    public string? CollectionId { get; set; }
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; }
    [Range(1, int.MaxValue)] public int Page { get; set; } = 1;
    [Range(1, 200)] public int PageSize { get; set; } = 20;
}

public class InventoryValuationRow
{
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? Category { get; set; }
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public long CurrentStock { get; set; }
    public double AverageCost { get; set; }
    public double StockValue { get; set; }
    public double? SellingPrice { get; set; }
    public double? ProfitMargin { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class StockSummaryRow
{
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? Category { get; set; }
    public int VariantCount { get; set; }
    public long TotalStock { get; set; }
    public long ReservedStock { get; set; }
    public long SoldStock { get; set; }
    public long ReturnedStock { get; set; }
    public long DamagedStock { get; set; }
    public double AverageCost { get; set; }
    public double TotalValue { get; set; }
}

public class SupplierReportRow
{
    public string? SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public int TotalPurchases { get; set; }
    public double TotalAmount { get; set; }
    public int TotalItems { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
}

public class PurchaseReportRow
{
    public string EntryId { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Supplier { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
    public long Quantity { get; set; }
    public double PurchasePrice { get; set; }
    public double Discount { get; set; }
    public double Gst { get; set; }
    public double Total { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class DeadStockRow
{
    public string VariantId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public long CurrentStock { get; set; }
    public double StockValue { get; set; }
    public DateTime? LastMovementDate { get; set; }
    public int DaysSinceLastMovement { get; set; }
}

public class LowStockReportRow
{
    public string VariantId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public long CurrentStock { get; set; }
    public long ReservedStock { get; set; }
    public long LowStockThreshold { get; set; }
    public long CriticalStockThreshold { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class MovementReportRow
{
    public string MovementId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ProductName { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty;
    public long Quantity { get; set; }
    public long Delta { get; set; }
    public string? Reason { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}

public class ReportErrorResponse
{
    public string Message { get; set; } = string.Empty;
}
