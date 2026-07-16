using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class ProductValidationService : IProductValidationService
{
    private readonly IProductRepository _repository;

    public ProductValidationService(IProductRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> SlugExistsAsync(string slug, string? excludeId, CancellationToken cancellationToken)
    {
        var count = await _repository.CountBySlugAsync(slug, cancellationToken);
        return await ResolveExistsAsync(count, excludeId, slug, doc => doc.Slug, cancellationToken);
    }

    public async Task<bool> SkuExistsAsync(string sku, string? excludeId, CancellationToken cancellationToken)
    {
        var count = await _repository.CountBySkuAsync(sku, cancellationToken);
        return await ResolveExistsAsync(count, excludeId, sku, doc => doc.Sku, cancellationToken);
    }

    /// <summary>
    /// count==0 -> no match, never a duplicate. count>1 -> always a real
    /// duplicate regardless of excludeId. count==1 -> only a duplicate if
    /// that one match isn't the product being edited.
    /// </summary>
    private async Task<bool> ResolveExistsAsync(
        int count, string? excludeId, string value, Func<ProductDocument, string> selector, CancellationToken cancellationToken)
    {
        if (count == 0) return false;
        if (string.IsNullOrWhiteSpace(excludeId)) return true;
        if (count > 1) return true;

        var existing = await _repository.GetByIdAsync(excludeId, cancellationToken);
        return existing == null || selector(existing) != value;
    }
}
