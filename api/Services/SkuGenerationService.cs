using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services;

public class SkuGenerationService : ISkuGenerationService
{
    private const string RegistryCollection = "skuRegistry";
    private const string VariantsCollection = "inventoryVariants";
    private const int MaxAttempts = 100;

    private readonly IFirebaseService _firebaseService;
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;

    public SkuGenerationService(
        IFirebaseService firebaseService,
        IProductRepository productRepository,
        ICategoryRepository categoryRepository)
    {
        _firebaseService = firebaseService;
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
    }

    public async Task<string> GenerateSkuAsync(string productId, string color, string size, CancellationToken cancellationToken)
    {
        var product = await _productRepository.GetByIdAsync(productId, cancellationToken)
            ?? throw new Common.Exceptions.NotFoundException("Product", productId);

        var categorySlug = product.Category;
        var categories = await _categoryRepository.GetAllAsync(cancellationToken);
        var category = categories.FirstOrDefault(c => c.Id == categorySlug).Data;

        var code = category?.Code ?? "XX";
        var baseSku = $"VRD-{code}-{Normalize(color)}-{Normalize(size)}".ToUpperInvariant();

        for (var i = 0; i < MaxAttempts; i++)
        {
            var candidate = i == 0 ? baseSku : $"{baseSku}-{i}";
            if (await IsSkuAvailableAsync(candidate, cancellationToken))
            {
                await RegisterSkuAsync(candidate, cancellationToken);
                return candidate;
            }
        }

        throw new Common.Exceptions.RequestValidationException(
            $"Unable to generate a unique SKU after {MaxAttempts} attempts for product '{product.Name}'.");
    }

    public async Task<bool> IsSkuAvailableAsync(string sku, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();

        // Check skuRegistry
        var registryDoc = await db.Collection(RegistryCollection).Document(sku).GetSnapshotAsync(cancellationToken);
        if (registryDoc.Exists) return false;

        // Check inventoryVariants
        var variants = await db.Collection(VariantsCollection)
            .WhereEqualTo("sku", sku)
            .Limit(1)
            .GetSnapshotAsync(cancellationToken);

        return variants.Count == 0;
    }

    public async Task RegisterSkuAsync(string sku, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(RegistryCollection).Document(sku).SetAsync(new { sku, createdAt = DateTime.UtcNow }, cancellationToken: cancellationToken);
    }

    private static string Normalize(string value)
    {
        return System.Text.RegularExpressions.Regex.Replace(value.Trim().ToUpperInvariant(), "[^A-Z0-9]+", "");
    }
}
