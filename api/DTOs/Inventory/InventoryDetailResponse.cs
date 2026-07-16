using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.DTOs.Inventory;

/// <summary>GET /inventory/{productId} — the full inventory picture for one product.</summary>
public class InventoryDetailResponse
{
    public string ProductId { get; set; } = string.Empty;

    public List<ProductSizeDto> Sizes { get; set; } = [];

    /// <summary>Derived — Sizes filtered to Stock &gt; 0. Not stored separately.</summary>
    public List<ProductSizeDto> AvailableSizes { get; set; } = [];

    public long Stock { get; set; }

    /// <summary>Reserved for future use — always 0 this phase.</summary>
    public long ReservedStock { get; set; }

    public int? LowStockThreshold { get; set; }

    /// <summary>Derived: Stock &lt;= 0.</summary>
    public bool IsOutOfStock { get; set; }

    /// <summary>Derived: LowStockThreshold set, and 0 &lt; Stock &lt;= LowStockThreshold.</summary>
    public bool IsLowStock { get; set; }

    public bool AutoHideWhenOutOfStock { get; set; }

    public DateTime? StockUpdatedAt { get; set; }
}
