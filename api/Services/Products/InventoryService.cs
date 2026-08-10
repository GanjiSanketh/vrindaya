using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class InventoryService : IInventoryService
{
    // Only the aggregated summary statistics are cached (Total Stock / Low
    // Stock Count / Out Of Stock Count). Individual inventory records are
    // deliberately never cached — stock is live data that must always be read
    // fresh — so GetInventoryAsync stays uncached. The summary factory runs at
    // most once per 5 minutes (single-flight via ICacheService), and
    // RemoveByPrefix(CachePrefix) in UpdateStockAsync keeps it fresh after any
    // stock write.
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private const string CachePrefix = "inventory";
    private const string SummaryCacheKey = CachePrefix + ":summary";

    private readonly IProductRepository _productRepo;
    private readonly IProductVariantRepository _variantRepo;
    private readonly ICacheService _cache;
    public InventoryService(
        IProductRepository productRepo,
        IProductVariantRepository variantRepo,
        ICacheService cache)
    {
        _productRepo = productRepo;
        _variantRepo = variantRepo;
        _cache = cache;
    }

    public async Task<List<InventoryProductResponse>> GetInventoryAsync(CancellationToken ct = default)
    {
        var products = await _productRepo.GetAllUnpagedAsync(ct);
        var result = new List<InventoryProductResponse>();

        foreach (var (id, data) in products)
        {
            if (data.Deleted) continue;

            var variants = await _variantRepo.GetVariantsAsync(id, ct);
            var variantResponses = variants
                .Where(v => v.Data.IsActive)
                .Select(v => new InventoryVariantResponse
                {
                    VariantId = v.Id,
                    ColourName = v.Data.ColourName,
                    ColourHex = v.Data.ColourHex,
                    Sizes = v.Data.Sizes
                        .Select(s => new InventorySizeResponse
                        {
                            Size = s.Size,
                            Stock = s.Stock,
                        })
                        .OrderBy(s => s.Size)
                        .ToList(),
                })
                .ToList();

            if (variantResponses.Count == 0) continue;

            result.Add(new InventoryProductResponse
            {
                ProductId = id,
                ProductName = data.Name,
                ProductImage = data.Images?.FirstOrDefault()?.Url,
                Variants = variantResponses,
            });
        }

        return result.OrderBy(p => p.ProductName).ToList();
    }

    public async Task<InventorySummary> GetInventorySummaryAsync(CancellationToken ct = default)
    {
        return await _cache.GetOrCreateAsync(SummaryCacheKey, async (ct) =>
        {
            var products = await _productRepo.GetAllUnpagedAsync(ct);

            var productCount = 0;
            var variantCount = 0;
            long totalStock = 0;
            var lowStockCount = 0;
            var outOfStockCount = 0;

            foreach (var (id, data) in products)
            {
                if (data.Deleted) continue;

                var variants = await _variantRepo.GetVariantsAsync(id, ct);
                var activeVariants = variants.Where(v => v.Data.IsActive).ToList();
                if (activeVariants.Count == 0) continue;

                productCount++;
                variantCount += activeVariants.Count;

                var productStock = activeVariants.Sum(v => v.Data.Sizes.Sum(s => s.Stock));
                totalStock += productStock;

                if (productStock <= 0)
                {
                    outOfStockCount++;
                }
                else if (data.LowStockThreshold is > 0 && productStock <= data.LowStockThreshold)
                {
                    lowStockCount++;
                }
            }

            return new InventorySummary
            {
                ProductCount = productCount,
                VariantCount = variantCount,
                TotalStock = totalStock,
                LowStockCount = lowStockCount,
                OutOfStockCount = outOfStockCount,
            };
        }, new CacheEntryOptions { AbsoluteExpirationRelativeToNow = CacheDuration }, ct);
    }

    public async Task UpdateStockAsync(List<StockUpdateItem> updates, CancellationToken ct = default)
    {
        foreach (var update in updates)
        {
            var variant = await _variantRepo.GetVariantAsync(update.VariantId, ct);
            if (variant == null) continue;

            foreach (var sizeUpdate in update.Sizes)
            {
                var existing = variant.Sizes.FirstOrDefault(s =>
                    s.Size.Equals(sizeUpdate.Size, StringComparison.OrdinalIgnoreCase));
                if (existing != null)
                {
                    existing.Stock = sizeUpdate.Stock;
                }
                else
                {
                    variant.Sizes.Add(new VariantSizeDocument
                    {
                        Size = sizeUpdate.Size,
                        Stock = sizeUpdate.Stock,
                    });
                }
            }

            variant.UpdatedAt = DateTime.UtcNow;
            await _variantRepo.UpdateVariantAsync(update.VariantId, variant, ct);
        }

        var productIds = updates.Select(u => u.ProductId).Distinct();
        foreach (var pid in productIds)
        {
            await SyncProductDenormalizedFields(pid, ct);
        }

        _cache.RemoveByPrefix(CachePrefix);
    }

    private async Task SyncProductDenormalizedFields(string productId, CancellationToken ct)
    {
        var variants = await _variantRepo.GetVariantsAsync(productId, ct);

        var activeVariantCount = 0;
        long totalStock = 0;
        double? lowestPrice = null;
        double? highestPrice = null;

        foreach (var (_, v) in variants)
        {
            if (!v.IsActive) continue;
            activeVariantCount++;
            totalStock += v.Sizes.Sum(s => s.Stock);
            if (v.SellingPrice.HasValue)
            {
                if (lowestPrice is null || v.SellingPrice.Value < lowestPrice) lowestPrice = v.SellingPrice;
                if (highestPrice is null || v.SellingPrice.Value > highestPrice) highestPrice = v.SellingPrice;
            }
        }

        await _productRepo.UpdateAsync(productId, new Dictionary<string, object?>
        {
            ["variantCount"] = activeVariantCount,
            ["totalStock"] = totalStock,
            ["lowestPrice"] = lowestPrice.HasValue ? lowestPrice.Value : Google.Cloud.Firestore.FieldValue.Delete,
            ["highestPrice"] = highestPrice.HasValue ? highestPrice.Value : Google.Cloud.Firestore.FieldValue.Delete,
        }, ct);
    }
}

/// <summary>
/// Lightweight aggregation of inventory statistics, cached for 5 minutes.
/// </summary>
public sealed record InventorySummary
{
    public int ProductCount { get; init; }
    public int VariantCount { get; init; }
    public long TotalStock { get; init; }
    public int LowStockCount { get; init; }
    public int OutOfStockCount { get; init; }
}
