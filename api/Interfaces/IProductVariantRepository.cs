using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IProductVariantRepository
{
    Task<List<(string Id, ProductVariantDocument Data)>> GetVariantsAsync(string productId, CancellationToken ct = default);
    Task<ProductVariantDocument?> GetVariantAsync(string variantId, CancellationToken ct = default);
    Task<string> CreateVariantAsync(string productId, ProductVariantDocument variant, CancellationToken ct = default);
    Task CreateVariantWithIdAsync(string productId, string variantId, ProductVariantDocument variant, CancellationToken ct = default);
    Task UpdateVariantAsync(string variantId, ProductVariantDocument variant, CancellationToken ct = default);
    Task DeleteVariantAsync(string variantId, CancellationToken ct = default);
    Task DeleteAllVariantsAsync(string productId, CancellationToken ct = default);
    Task<List<string>> GetVariantIdsAsync(string productId, CancellationToken ct = default);
    Task<bool> SkuExistsAsync(string sku, string? excludeVariantId = null, CancellationToken ct = default);
    Task<bool> HasVariantsAsync(string productId, CancellationToken ct = default);
    Task<ProductVariantDocument?> GetFirstActiveVariantAsync(string productId, CancellationToken ct = default);
    Task<string> GenerateIdAsync();
    Task MigrateAllVariantsImagesAsync(CancellationToken ct = default);
}
