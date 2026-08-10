using Google.Cloud.Firestore;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Interfaces;

namespace Vrindaya.Api.Services.Products;

public class ProductVariantRepository : IProductVariantRepository
{
    private const string ProductsCollection = "products";
    private const string VariantsCollection = "variants";

    // SKUs are stable lookup data (rarely change, validated on every variant
    // create/update) so the full-catalog scan SkuExistsAsync used to do is
    // replaced by a cached lowercase-sku → variant-id map. This is deliberately
    // NOT cached under the "products" prefix (product edits needn't rebuild it);
    // it is invalidated explicitly by the variant write methods below. Variant
    // documents themselves (inventory + pricing) are never cached.
    private const string SkuMapCacheKey = "variant-skus:map";
    private static readonly CacheEntryOptions SkuMapCacheOptions = new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30) };

    private readonly IFirebaseService _firebaseService;
    private readonly ICacheService _cache;
    private readonly ILogger<ProductVariantRepository> _logger;
    private readonly IRequestScopedCache _requestCache;

    public ProductVariantRepository(IFirebaseService firebaseService, ICacheService cache, ILogger<ProductVariantRepository> logger, IRequestScopedCache requestCache)
    {
        _firebaseService = firebaseService;
        _cache = cache;
        _logger = logger;
        _requestCache = requestCache;
    }

    private FirestoreDb Db => _firebaseService.GetFirestoreDb();

    private CollectionReference VariantCol(string productId) =>
        Db.Collection(ProductsCollection).Document(productId).Collection(VariantsCollection);

    public async Task<List<(string Id, ProductVariantDocument Data)>> GetVariantsAsync(string productId, CancellationToken ct = default)
    {
        // Whole-subcollection load goes through the request-scoped cache (keyed
        // by the nested path products/{productId}/variants) so multiple reads of
        // the same product's variants within one request share one Firestore
        // load. The snapshot is unordered; displayOrder ordering is applied here
        // so behavior matches the previous OrderBy("displayOrder") query.
        var snapshot = await _requestCache.GetWholeCollectionSnapshotAsync(VariantCol(productId).Path, ct);

        var variants = new List<(string Id, ProductVariantDocument Data)>();
        foreach (var doc in snapshot.Documents)
        {
            var variant = DeserializeVariantDocument(doc);
            if (variant != null)
                variants.Add((doc.Id, variant));
            else
                _logger.LogWarning("Skipping variant document {VariantId} in product {ProductId} — deserialization failed", doc.Id, productId);
        }
        return variants.OrderBy(v => v.Data.DisplayOrder).ToList();
    }

    /// <summary>
    /// Exactly the fields the dashboard (and the BI layer that reuses its raw
    /// snapshot) reads from each variant — a Firestore field-mask projection so
    /// the image gallery, MRP, flipkart URLs and timestamps are never
    /// transferred. "images.primary" keeps only the primary image slot (and
    /// still deserializes legacy string-URL primaries). Anything absent is left
    /// at its default value; displayOrder is kept so ordering matches the full
    /// read.
    /// </summary>
    private static readonly string[] DashboardVariantFields =
    [
        "isActive", "displayOrder", "sizes",
        "purchaseCost", "packagingCost", "flipkartCommission", "shippingCharges",
        "marketingCost", "otherCharges", "sellingPrice", "colourName",
        "images.primary",
    ];

    public async Task<List<(string Id, ProductVariantDocument Data)>> GetDashboardVariantsAsync(string productId, CancellationToken ct = default)
    {
        var snapshot = await _requestCache.GetWholeCollectionSnapshotAsync(VariantCol(productId).Path, DashboardVariantFields, ct);

        var variants = new List<(string Id, ProductVariantDocument Data)>();
        foreach (var doc in snapshot.Documents)
        {
            var variant = DeserializeVariantDocument(doc);
            if (variant != null)
                variants.Add((doc.Id, variant));
            else
                _logger.LogWarning("Skipping variant document {VariantId} in product {ProductId} — deserialization failed", doc.Id, productId);
        }
        return variants.OrderBy(v => v.Data.DisplayOrder).ToList();
    }

    public async Task<ProductVariantDocument?> GetVariantAsync(string variantId, CancellationToken ct = default)
    {
        var doc = await Db.GetDocument(variantId).GetSnapshotAsync(ct);
        if (doc?.Exists != true) return null;

        var variant = DeserializeVariantDocument(doc);
        if (variant == null)
            _logger.LogWarning("Failed to deserialize variant document {VariantId}", variantId);
        return variant;
    }

    public async Task<string> CreateVariantAsync(string productId, ProductVariantDocument variant, CancellationToken ct = default)
    {
        var docRef = VariantCol(productId).Document();
        variant.CreatedAt = DateTime.UtcNow;
        variant.UpdatedAt = DateTime.UtcNow;
        await docRef.CreateAsync(variant, ct);
        InvalidateSkuMap();
        InvalidateVariants(productId);
        return docRef.Id;
    }

    public async Task CreateVariantWithIdAsync(string productId, string variantId, ProductVariantDocument variant, CancellationToken ct = default)
    {
        variant.CreatedAt = DateTime.UtcNow;
        variant.UpdatedAt = DateTime.UtcNow;
        await VariantCol(productId).Document(variantId).CreateAsync(variant, ct);
        InvalidateSkuMap();
        InvalidateVariants(productId);
    }

    public async Task UpdateVariantAsync(string variantId, ProductVariantDocument variant, CancellationToken ct = default)
    {
        variant.UpdatedAt = DateTime.UtcNow;
        await Db.GetDocument(variantId).SetAsync(variant, SetOptions.Overwrite, ct);
        InvalidateSkuMap();
        InvalidateVariants(ExtractProductId(variantId));
    }

    public async Task DeleteVariantAsync(string variantId, CancellationToken ct = default)
    {
        await Db.GetDocument(variantId).DeleteAsync(null, ct);
        InvalidateSkuMap();
        InvalidateVariants(ExtractProductId(variantId));
    }

    public async Task<bool> SkuExistsAsync(string sku, string? excludeVariantId = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(sku))
        {
            return false;
        }

        var skuToVariantIds = await GetSkuToVariantIdsAsync(ct);
        if (!skuToVariantIds.TryGetValue(sku, out var holders))
        {
            return false;
        }

        if (excludeVariantId == null)
        {
            return true;
        }

        return holders.Any(vid => vid != excludeVariantId);
    }

    /// <summary>
    /// Builds (once per 30 min) a case-insensitive map of variant SKU → the ids
    /// of every variant holding it, replacing the previous all-products ×
    /// all-variants scan this ran on every create/update. Behavior is preserved:
    /// a sku exists if any variant other than the caller's excluded one holds it.
    /// Invalidated by the variant write methods below.
    /// </summary>
    private async Task<IReadOnlyDictionary<string, List<string>>> GetSkuToVariantIdsAsync(CancellationToken ct)
    {
        return await _cache.GetOrCreateAsync(
            SkuMapCacheKey,
            async token =>
            {
                var map = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

                var allProducts = await _requestCache.GetWholeCollectionSnapshotAsync(ProductsCollection, token);
                foreach (var prodDoc in allProducts.Documents)
                {
                    var variants = await prodDoc.Reference.Collection(VariantsCollection).GetSnapshotAsync(token);
                    foreach (var varDoc in variants.Documents)
                    {
                        var data = DeserializeVariantDocument(varDoc);
                        if (data == null || string.IsNullOrWhiteSpace(data.Sku)) continue;

                        if (!map.TryGetValue(data.Sku, out var list))
                        {
                            list = [];
                            map[data.Sku] = list;
                        }
                        list.Add(varDoc.Id);
                    }
                }

                return (IReadOnlyDictionary<string, List<string>>)map;
            },
            SkuMapCacheOptions,
            ct) ?? new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
    }

    private void InvalidateSkuMap()
    {
        _cache.Remove(SkuMapCacheKey);
    }

    /// <summary>Drops the request-scoped variants snapshot for a product after a variant write.</summary>
    private void InvalidateVariants(string productId)
    {
        _requestCache.Invalidate(VariantCol(productId).Path);
    }

    /// <summary>Extracts the product id from a Firestore path like "products/{productId}/variants/{variantId}".</summary>
    private static string ExtractProductId(string variantPath)
    {
        var parts = variantPath.Split('/');
        return parts.Length >= 4 ? parts[1]
            : throw new ArgumentException($"Invalid variant path: {variantPath}", nameof(variantPath));
    }

    public async Task DeleteAllVariantsAsync(string productId, CancellationToken ct = default)
    {
        var snapshot = await VariantCol(productId).GetSnapshotAsync(ct);
        foreach (var doc in snapshot.Documents)
        {
            await doc.Reference.DeleteAsync(null, ct);
        }
        InvalidateSkuMap();
        InvalidateVariants(productId);
    }

    public async Task<List<string>> GetVariantIdsAsync(string productId, CancellationToken ct = default)
    {
        var snapshot = await _requestCache.GetWholeCollectionSnapshotAsync(VariantCol(productId).Path, ct);
        return snapshot.Documents.Select(d => d.Id).ToList();
    }

    public async Task<ProductVariantDocument?> GetFirstActiveVariantAsync(string productId, CancellationToken ct = default)
    {
        var snapshot = await VariantCol(productId)
            .OrderBy("displayOrder")
            .Limit(1)
            .GetSnapshotAsync(ct);

        var doc = snapshot.Documents.FirstOrDefault();
        if (doc?.Exists != true) return null;

        var variant = DeserializeVariantDocument(doc);
        if (variant == null)
            _logger.LogWarning("Failed to deserialize first variant for product {ProductId}", productId);
        return variant?.IsActive == true ? variant : null;
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

    /// <summary>
    /// Iterates every variant across all products, upgrading documents that still
    /// use the old image schema (string URLs) to the current object schema
    /// ({ url, publicId, width, height, alt }). Naturally idempotent — documents
    /// already using the new schema are skipped.
    /// </summary>
    public async Task MigrateAllVariantsImagesAsync(CancellationToken ct = default)
    {
        var allProducts = await Db.Collection(ProductsCollection).GetSnapshotAsync(ct);
        int migrated = 0, skipped = 0, failed = 0;

        foreach (var prodDoc in allProducts.Documents)
        {
            var variants = await prodDoc.Reference.Collection(VariantsCollection).GetSnapshotAsync(ct);

            foreach (var varDoc in variants.Documents)
            {
                try
                {
                    var dict = varDoc.ToDictionary();
                    if (dict == null)
                    {
                        skipped++;
                        continue;
                    }

                    if (!NeedsImageMigration(dict))
                    {
                        skipped++;
                        continue;
                    }

                    var updated = DeserializeVariantDocument(varDoc);
                    if (updated == null)
                    {
                        _logger.LogWarning("Migration: could not deserialize variant {VariantId} in product {ProductId}", varDoc.Id, prodDoc.Id);
                        failed++;
                        continue;
                    }

                    await varDoc.Reference.SetAsync(updated, SetOptions.Overwrite, ct);
                    _logger.LogInformation("Migration: upgraded images for variant {VariantId} in product {ProductId}", varDoc.Id, prodDoc.Id);
                    migrated++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Migration: failed for variant {VariantId} in product {ProductId}", varDoc.Id, prodDoc.Id);
                    failed++;
                }
            }
        }

        _logger.LogInformation(
            "Variant image migration complete: migrated={Migrated}, skipped={Skipped}, failed={Failed}",
            migrated, skipped, failed);
    }

    /// <summary>
    /// Checks whether any image slot in the raw Firestore dictionary uses the
    /// old schema (string URL instead of an object with url/publicId/width/height/alt).
    /// </summary>
    private static bool NeedsImageMigration(IReadOnlyDictionary<string, object> docDict)
    {
        if (!docDict.TryGetValue("images", out var imagesObj) || imagesObj is not IReadOnlyDictionary<string, object> imagesDict)
            return false;

        foreach (var slot in ImageSlots)
        {
            if (imagesDict.TryGetValue(slot, out var value) && value is string)
                return true;
        }

        // Check gallery for string entries
        if (imagesDict.TryGetValue("gallery", out var galleryValue) && galleryValue is IList<object> galleryList)
        {
            if (galleryList.Any(item => item is string))
                return true;
        }

        return false;
    }

    // ── Backward-compatible deserialization ────────────────────────────────

    private static readonly string[] ImageSlots = ["primary", "front", "back", "left", "right", "closeup"];

    /// <summary>
    /// Safely converts a Firestore snapshot to <see cref="ProductVariantDocument"/>,
    /// supporting both the old schema (string URLs for image slots) and the current
    /// schema (VariantImageSlotDocument objects). Returns null if the document cannot
    /// be deserialized (instead of throwing).
    /// </summary>
    private static ProductVariantDocument? DeserializeVariantDocument(DocumentSnapshot doc)
    {
        if (!doc.Exists) return null;

        try
        {
            var dict = doc.ToDictionary();
            if (dict == null) return null;

            return new ProductVariantDocument
            {
                ColourName = dict.GetValueOrDefault("colourName") as string ?? string.Empty,
                ColourHex = dict.GetValueOrDefault("colourHex") as string,
                Sku = dict.GetValueOrDefault("sku") as string ?? string.Empty,
                SellingPrice = ToDouble(dict, "sellingPrice"),
                Mrp = ToDouble(dict, "mrp"),
                PurchaseCost = ToDouble(dict, "purchaseCost"),
                PackagingCost = ToDouble(dict, "packagingCost"),
                FlipkartCommission = ToDouble(dict, "flipkartCommission"),
                ShippingCharges = ToDouble(dict, "shippingCharges"),
                MarketingCost = ToDouble(dict, "marketingCost"),
                OtherCharges = ToDouble(dict, "otherCharges"),
                DesiredProfit = ToDouble(dict, "desiredProfit"),
                FlipkartUrl = dict.GetValueOrDefault("flipkartUrl") as string,
                DisplayOrder = ToInt(dict, "displayOrder"),
                IsActive = ToBool(dict, "isActive", true),
                IsFeatured = ToBool(dict, "isFeatured"),
                IsBestSeller = ToBool(dict, "isBestSeller"),
                IsNewArrival = ToBool(dict, "isNewArrival"),
                Images = DeserializeImages(dict.GetValueOrDefault("images") as IDictionary<string, object>),
                Sizes = DeserializeSizes(dict.GetValueOrDefault("sizes") as IList<object>),
                CreatedAt = ToDateTime(dict, "createdAt"),
                UpdatedAt = ToDateTime(dict, "updatedAt"),
            };
        }
        catch
        {
            return null;
        }
    }

    private static VariantImagesDocument DeserializeImages(IDictionary<string, object>? imagesDict)
    {
        if (imagesDict == null) return new VariantImagesDocument();

        return new VariantImagesDocument
        {
            Primary = DeserializeImageSlot(imagesDict, "primary"),
            Front = DeserializeImageSlot(imagesDict, "front"),
            Back = DeserializeImageSlot(imagesDict, "back"),
            Left = DeserializeImageSlot(imagesDict, "left"),
            Right = DeserializeImageSlot(imagesDict, "right"),
            Closeup = DeserializeImageSlot(imagesDict, "closeup"),
            Gallery = DeserializeGallery(imagesDict.TryGetValue("gallery", out var g) ? g : null),
        };
    }

    /// <summary>
    /// Reads one image slot, handling both the old schema (string URL →
    /// VariantImageSlotDocument with just Url set) and the new schema
    /// (IDictionary&lt;string, object&gt; → full VariantImageSlotDocument).
    /// </summary>
    private static VariantImageSlotDocument? DeserializeImageSlot(IDictionary<string, object> imagesDict, string slot)
    {
        if (!imagesDict.TryGetValue(slot, out var value) || value == null)
            return null;

        // Old schema: the value is a plain URL string
        if (value is string url)
        {
            return new VariantImageSlotDocument { Url = url, PublicId = string.Empty };
        }

        // New schema: the value is a map with url, publicId, width, height, alt
        if (value is IDictionary<string, object> slotDict)
        {
            return new VariantImageSlotDocument
            {
                Url = DictString(slotDict, "url"),
                PublicId = DictString(slotDict, "publicId"),
                Width = DictInt(slotDict, "width"),
                Height = DictInt(slotDict, "height"),
                Alt = DictString(slotDict, "alt"),
            };
        }

        return null;
    }

    /// <summary>
    /// Reads the gallery array, handling both the old schema (string URLs)
    /// and the new schema (object maps).
    /// </summary>
    private static List<VariantImageSlotDocument> DeserializeGallery(object? galleryValue)
    {
        if (galleryValue is not IList<object> galleryList) return [];

        var result = new List<VariantImageSlotDocument>(galleryList.Count);
        foreach (var item in galleryList)
        {
            if (item is string url)
            {
                result.Add(new VariantImageSlotDocument { Url = url, PublicId = string.Empty });
            }
            else if (item is IDictionary<string, object> slotDict)
            {
                result.Add(new VariantImageSlotDocument
                {
                    Url = DictString(slotDict, "url"),
                    PublicId = DictString(slotDict, "publicId"),
                    Width = DictInt(slotDict, "width"),
                    Height = DictInt(slotDict, "height"),
                    Alt = DictString(slotDict, "alt"),
                });
            }
        }
        return result;
    }

    private static List<VariantSizeDocument> DeserializeSizes(IList<object>? sizesList)
    {
        if (sizesList == null) return [];

        var result = new List<VariantSizeDocument>(sizesList.Count);
        foreach (var item in sizesList)
        {
            if (item is IDictionary<string, object> sizeDict)
            {
                result.Add(new VariantSizeDocument
                {
                    Size = DictString(sizeDict, "size"),
                    Stock = DictLong(sizeDict, "stock"),
                });
            }
        }
        return result;
    }

    // ── IDictionary<string, object> helpers (nested Firestore maps) ──────

    private static string DictString(IDictionary<string, object> dict, string key)
        => dict.TryGetValue(key, out var val) && val is string s ? s : string.Empty;

    private static int DictInt(IDictionary<string, object> dict, string key)
    {
        if (!dict.TryGetValue(key, out var val) || val == null) return 0;
        if (val is long l) return (int)l;
        if (val is int i) return i;
        if (val is double d) return (int)d;
        return 0;
    }

    private static long DictLong(IDictionary<string, object> dict, string key)
    {
        if (!dict.TryGetValue(key, out var val) || val == null) return 0L;
        if (val is long l) return l;
        if (val is int i) return i;
        if (val is double d) return (long)d;
        return 0L;
    }

    // ── Type conversion helpers (Firestore raw values → C# types) ────────

    private static double? ToDouble(IReadOnlyDictionary<string, object> dict, string key)
    {
        if (!dict.TryGetValue(key, out var value) || value == null) return null;
        if (value is double d) return d;
        if (value is long l) return l;
        if (value is int i) return i;
        return null;
    }

    private static int ToInt(IReadOnlyDictionary<string, object> dict, string key)
    {
        if (!dict.TryGetValue(key, out var value) || value == null) return 0;
        if (value is long l) return (int)l;
        if (value is int i) return i;
        if (value is double d) return (int)d;
        return 0;
    }

    private static long ToLong(IReadOnlyDictionary<string, object> dict, string key)
    {
        if (!dict.TryGetValue(key, out var value) || value == null) return 0L;
        if (value is long l) return l;
        if (value is int i) return i;
        if (value is double d) return (long)d;
        return 0L;
    }

    private static bool ToBool(IReadOnlyDictionary<string, object> dict, string key, bool defaultValue = false)
    {
        if (!dict.TryGetValue(key, out var value) || value == null) return defaultValue;
        if (value is bool b) return b;
        return defaultValue;
    }

    private static DateTime ToDateTime(IReadOnlyDictionary<string, object> dict, string key)
    {
        if (!dict.TryGetValue(key, out var value) || value == null) return DateTime.UtcNow;
        if (value is DateTime dt) return dt;
        if (value is Timestamp ts) return ts.ToDateTime();
        return DateTime.UtcNow;
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
