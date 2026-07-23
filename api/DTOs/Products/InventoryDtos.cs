namespace Vrindaya.Api.DTOs.Products;

public class InventoryProductResponse
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }
    public List<InventoryVariantResponse> Variants { get; set; } = [];
}

public class InventoryVariantResponse
{
    public string VariantId { get; set; } = string.Empty;
    public string ColourName { get; set; } = string.Empty;
    public string? ColourHex { get; set; }
    public List<InventorySizeResponse> Sizes { get; set; } = [];
}

public class InventorySizeResponse
{
    public string Size { get; set; } = string.Empty;
    public long Stock { get; set; }
}

public class BulkStockUpdateRequest
{
    public List<StockUpdateItem> Updates { get; set; } = [];
}

public class StockUpdateItem
{
    public string ProductId { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public List<StockSizeItem> Sizes { get; set; } = [];
}

public class StockSizeItem
{
    public string Size { get; set; } = string.Empty;
    public long Stock { get; set; }
}
