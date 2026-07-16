namespace Vrindaya.Api.DTOs.Products;

public class PagedProductsResponse
{
    public List<ProductSummaryResponse> Items { get; set; } = [];
    public string? NextCursor { get; set; }
    public int TotalCount { get; set; }
}
