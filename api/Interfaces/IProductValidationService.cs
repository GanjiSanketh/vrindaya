namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Firestore has no unique-constraint primitive — slug/SKU uniqueness is
/// an app-layer, query-based check (Query.Count(), no document reads
/// billed), same approach the prior Angular ProductRepository used
/// (existsBySlug/existsBySku via getCountFromServer).
/// </summary>
public interface IProductValidationService
{
    /// <summary>True if a DIFFERENT product already has this slug. Excludes the product's own id when editing.</summary>
    Task<bool> SlugExistsAsync(string slug, string? excludeId, CancellationToken cancellationToken);

    /// <summary>True if a DIFFERENT product already has this SKU. Excludes the product's own id when editing.</summary>
    Task<bool> SkuExistsAsync(string sku, string? excludeId, CancellationToken cancellationToken);
}
