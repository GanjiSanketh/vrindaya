namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Generates and registers auto-incrementing, never-reused SKUs in the
/// format VRD-{categoryCode}-{color}-{size} with uniqueness guaranteed by a
/// Firestore skuRegistry collection. Once registered, a SKU value is never
/// released — even if the variant is deleted — satisfying the never-reused
/// requirement.
/// </summary>
public interface ISkuGenerationService
{
    /// <summary>Generates a unique SKU for the given product, color, and size.</summary>
    Task<string> GenerateSkuAsync(string productId, string color, string size, CancellationToken cancellationToken);

    /// <summary>Checks whether a SKU value is currently unused (not in the registry and not on any existing variant).</summary>
    Task<bool> IsSkuAvailableAsync(string sku, CancellationToken cancellationToken);

    /// <summary>Registers a SKU in the skuRegistry so it can never be regenerated.</summary>
    Task RegisterSkuAsync(string sku, CancellationToken cancellationToken);
}
