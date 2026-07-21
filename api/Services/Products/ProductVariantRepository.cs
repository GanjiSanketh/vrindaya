using Google.Cloud.Firestore;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class ProductVariantRepository : IProductVariantRepository
{
    private const string ProductsCollection = "products";
    private const string VariantsCollection = "variants";

    private readonly IFirebaseService _firebaseService;

    public ProductVariantRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    private FirestoreDb Db => _firebaseService.GetFirestoreDb();

    private CollectionReference VariantCol(string productId) =>
        Db.Collection(ProductsCollection).Document(productId).Collection(VariantsCollection);

    public async Task<List<(string Id, ProductVariantDocument Data)>> GetVariantsAsync(string productId, CancellationToken ct = default)
    {
        var snapshot = await VariantCol(productId)
            .OrderBy("displayOrder")
            .GetSnapshotAsync(ct);

        var variants = new List<(string, ProductVariantDocument)>();
        foreach (var doc in snapshot.Documents)
        {
            var variant = doc.ConvertTo<ProductVariantDocument>();
            if (variant != null)
                variants.Add((doc.Id, variant));
        }
        return variants;
    }

    public async Task<ProductVariantDocument?> GetVariantAsync(string variantId, CancellationToken ct = default)
    {
        var doc = await Db.GetDocument(variantId).GetSnapshotAsync(ct);
        return doc?.Exists == true ? doc.ConvertTo<ProductVariantDocument>() : null;
    }

    public async Task<string> CreateVariantAsync(string productId, ProductVariantDocument variant, CancellationToken ct = default)
    {
        var docRef = VariantCol(productId).Document();
        variant.CreatedAt = DateTime.UtcNow;
        variant.UpdatedAt = DateTime.UtcNow;
        await docRef.CreateAsync(variant, ct);
        return docRef.Id;
    }

    public async Task UpdateVariantAsync(string variantId, ProductVariantDocument variant, CancellationToken ct = default)
    {
        variant.UpdatedAt = DateTime.UtcNow;
        await Db.GetDocument(variantId).SetAsync(variant, SetOptions.Overwrite, ct);
    }

    public async Task DeleteVariantAsync(string variantId, CancellationToken ct = default)
    {
        await Db.GetDocument(variantId).DeleteAsync(null, ct);
    }

    public async Task<bool> SkuExistsAsync(string sku, string? excludeVariantId = null, CancellationToken ct = default)
    {
        var allProducts = await Db.Collection(ProductsCollection).GetSnapshotAsync(ct);
        foreach (var prodDoc in allProducts.Documents)
        {
            var variants = await prodDoc.Reference.Collection("variants").GetSnapshotAsync(ct);
            foreach (var varDoc in variants.Documents)
            {
                if (varDoc.Id == excludeVariantId) continue;
                var data = varDoc.ConvertTo<ProductVariantDocument>();
                if (data?.Sku.Equals(sku, StringComparison.OrdinalIgnoreCase) == true)
                    return true;
            }
        }
        return false;
    }

    public async Task<bool> HasVariantsAsync(string productId, CancellationToken ct = default)
    {
        var snapshot = await VariantCol(productId).Limit(1).GetSnapshotAsync(ct);
        return snapshot.Documents.Any();
    }

    public Task<string> GenerateIdAsync()
    {
        return Task.FromResult(VariantCol("_").Document().Id);
    }
}

internal static class FirestoreDocumentExtensions
{
    public static DocumentReference GetDocument(this FirestoreDb db, string path)
    {
        var parts = path.Split('/');
        if (parts.Length < 2)
            throw new ArgumentException($"Invalid document path: {path}", nameof(path));

        DocumentReference? docRef = null;
        for (int i = 0; i < parts.Length; i += 2)
        {
            var col = parts[i];
            var doc = parts[i + 1];
            docRef = docRef == null
                ? db.Collection(col).Document(doc)
                : docRef.Collection(col).Document(doc);
        }
        return docRef!;
    }
}
