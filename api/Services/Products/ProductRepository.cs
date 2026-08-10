using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Interfaces;

namespace Vrindaya.Api.Services.Products;

/// <summary>
/// See IProductRepository. Collection name is a literal here deliberately —
/// same reasoning as CampaignDeliveryRepository's collection constants
/// (a Firestore identifier, not cross-cutting app config).
/// </summary>
public class ProductRepository : IProductRepository
{
    private const string Collection = "products";
    private const string CachePrefix = "products";

    // Only stable lookup/statistics data is cached — slug/sku existence counts
    // used for uniqueness validation, plus the count-only product statistics
    // (total/active/featured/categories). Full product documents are
    // deliberately NEVER cached: they embed inventory quantities
    // (Stock/TotalStock/Sizes) and frequently-changing pricing
    // (Price/Pricing/MarketplacePrice), which must always be read live.
    // Invalidation via RemoveByPrefix(CachePrefix) below.
    private static readonly CacheEntryOptions LookupCacheOptions = new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30) };
    private static readonly CacheEntryOptions StatisticsCacheOptions = new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15) };

    private readonly IFirebaseService _firebaseService;
    private readonly ICacheService _cache;
    private readonly IRequestScopedCache _requestCache;

    public ProductRepository(IFirebaseService firebaseService, ICacheService cache, IRequestScopedCache requestCache)
    {
        _firebaseService = firebaseService;
        _cache = cache;
        _requestCache = requestCache;
    }

    public string GenerateId()
    {
        var db = _firebaseService.GetFirestoreDb();
        return db.Collection(Collection).Document().Id;
    }

    /// <summary>
    /// Count-only product statistics, cached separately from any list read so
    /// repeated aggregation calls don't re-read the whole catalog. Key lives
    /// under the "products" prefix, so the RemoveByPrefix(CachePrefix) fired
    /// by every create/update/delete invalidates it along with the lookup
    /// counts — edit operations themselves are never cached.
    /// </summary>
    public async Task<ProductStatistics> GetStatisticsAsync(CancellationToken cancellationToken)
    {
        return await _cache.GetOrCreateAsync(
            $"{CachePrefix}:statistics",
            async ct =>
            {
                // Only count fields are needed (deleted/active/featured/category)
                // — the field-projected dashboard read covers them all and is
                // smaller than the full-document load. When the dashboard ran in
                // the same request it also reuses the already-loaded snapshot.
                var products = await GetDashboardProductsAsync(ct);

                var active = 0;
                var featured = 0;
                var categories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var (_, doc) in products)
                {
                    if (doc.Deleted || !doc.Active) continue;

                    active++;
                    if (doc.Featured) featured++;
                    if (!string.IsNullOrWhiteSpace(doc.Category))
                    {
                        categories.Add(doc.Category);
                    }
                }

                return new ProductStatistics(products.Count, active, featured, categories.Count);
            },
            StatisticsCacheOptions,
            cancellationToken);
    }

    public async Task<List<(string Id, ProductDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        // Whole-collection load goes through the request-scoped cache so a
        // request that reads the products collection more than once (e.g. the
        // dashboard aggregate plus a statistics/sku-map scan) reuses this
        // snapshot instead of querying Firestore again. Writes invalidate it.
        var snapshot = await _requestCache.GetWholeCollectionSnapshotAsync(Collection, cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<ProductDocument>())).ToList();
    }

    /// <summary>
    /// Exactly the fields the dashboard (and the BI layer that reuses its raw
    /// snapshot) reads from each product — a Firestore field-mask projection so
    /// the big blobs (images, seo, marketplace, searchKeywords, descriptions)
    /// are never transferred. Everything the aggregation touches is included;
    /// anything absent is left at its default value.
    /// </summary>
    private static readonly string[] DashboardFields =
    [
        "name", "category", "deleted", "active", "featured", "newArrival", "bestSeller",
        "totalStock", "lowStockThreshold", "createdAt", "thumbnailUrl",
    ];

    public async Task<List<(string Id, ProductDocument Data)>> GetDashboardProductsAsync(CancellationToken cancellationToken)
    {
        var snapshot = await _requestCache.GetWholeCollectionSnapshotAsync(Collection, DashboardFields, cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<ProductDocument>())).ToList();
    }

    public async Task<PagedResult<(string Id, ProductDocument Data)>> GetPagedAsync(ProductQuery query, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        Query baseQuery = db.Collection(Collection);

        baseQuery = query.Deleted.HasValue
            ? BuildAdminFilters(baseQuery, query)
            : BuildPublicFilters(baseQuery, query);

        var totalCountSnapshot = await baseQuery.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        // A range filter forces its own field to be the primary sort —
        // a hard Firestore rule, not a preference — so price/stock win over
        // whatever SortBy the caller asked for.
        var sortField = query.MinPrice.HasValue || query.MaxPrice.HasValue
            ? "price"
            : query.InStockOnly == true
                ? "stock"
                : query.SortBy is "createdAt" or "price" or "name" or "stock" ? query.SortBy : "displayOrder";

        var orderedQuery = query.SortDescending
            ? baseQuery.OrderByDescending(sortField)
            : baseQuery.OrderBy(sortField);

        if (!string.IsNullOrWhiteSpace(query.Cursor))
        {
            var cursorSnapshot = await db.Collection(Collection).Document(query.Cursor).GetSnapshotAsync(cancellationToken);
            if (cursorSnapshot.Exists)
            {
                orderedQuery = orderedQuery.StartAfter(cursorSnapshot);
            }
        }

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var snapshot = await orderedQuery.Limit(pageSize).GetSnapshotAsync(cancellationToken);

        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<ProductDocument>())).ToList();
        var nextCursor = items.Count == pageSize ? items[^1].Id : null;

        return new PagedResult<(string Id, ProductDocument Data)>
        {
            Items = items,
            NextCursor = nextCursor,
            TotalCount = totalCount,
        };
    }

    /// <summary>
    /// The storefront/public-API filter shape — at most one additional
    /// filter beyond ActiveOnly (the public Shop page's Category/Price/
    /// Availability/Featured/BestSeller filter chips, mutually exclusive —
    /// see ProductQuery's doc comment), matching exactly what
    /// firestore.indexes.json's composite indexes cover. Never reached when
    /// query.Deleted is set (see BuildAdminFilters).
    /// </summary>
    private static Query BuildPublicFilters(Query baseQuery, ProductQuery query)
    {
        if (query.ActiveOnly)
        {
            baseQuery = baseQuery.WhereEqualTo("active", true);
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            baseQuery = baseQuery.WhereEqualTo("category", query.Category);
        }
        else if (query.Featured.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("featured", query.Featured.Value);
        }
        else if (query.NewArrival.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("newArrival", query.NewArrival.Value);
        }
        else if (query.BestSeller.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("bestSeller", query.BestSeller.Value);
        }
        else if (query.MinPrice.HasValue || query.MaxPrice.HasValue)
        {
            if (query.MinPrice.HasValue)
            {
                baseQuery = baseQuery.WhereGreaterThanOrEqualTo("price", query.MinPrice.Value);
            }
            if (query.MaxPrice.HasValue)
            {
                baseQuery = baseQuery.WhereLessThanOrEqualTo("price", query.MaxPrice.Value);
            }
        }
        else if (query.InStockOnly == true)
        {
            baseQuery = baseQuery.WhereGreaterThan("totalStock", 0);
        }

        return baseQuery;
    }

    /// <summary>
    /// The admin product list's filter shape — Deleted is always applied
    /// (true for the "Deleted" tab, false otherwise); at most one of
    /// Category/ActiveStatus/Featured/NewArrival/BestSeller/Search/PriceRange
    /// is applied alongside it, in that priority order, matching exactly
    /// what firestore.indexes.json's "admin" composite indexes cover (see
    /// that file's comments). Picking more than one in the admin UI clears
    /// the others rather than combining them — combining would need a
    /// composite index this app deliberately doesn't maintain.
    /// </summary>
    private static Query BuildAdminFilters(Query baseQuery, ProductQuery query)
    {
        baseQuery = baseQuery.WhereEqualTo("deleted", query.Deleted!.Value);

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            baseQuery = baseQuery.WhereEqualTo("category", query.Category);
        }
        else if (query.ActiveStatus.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("active", query.ActiveStatus.Value);
        }
        else if (query.Featured.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("featured", query.Featured.Value);
        }
        else if (query.NewArrival.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("newArrival", query.NewArrival.Value);
        }
        else if (query.BestSeller.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("bestSeller", query.BestSeller.Value);
        }
        else if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var tokens = SearchTokenizer.Tokenize(query.Search).Take(10).ToList();
            if (tokens.Count > 0)
            {
                baseQuery = baseQuery.WhereArrayContainsAny("searchKeywords", tokens.Cast<object>().ToList());
            }
        }
        else if (query.MinPrice.HasValue || query.MaxPrice.HasValue)
        {
            if (query.MinPrice.HasValue)
            {
                baseQuery = baseQuery.WhereGreaterThanOrEqualTo("price", query.MinPrice.Value);
            }
            if (query.MaxPrice.HasValue)
            {
                baseQuery = baseQuery.WhereLessThanOrEqualTo("price", query.MaxPrice.Value);
            }
        }

        return baseQuery;
    }

    public async Task<ProductDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<ProductDocument>() : null;
    }

    public async Task<List<(string Id, ProductDocument Data)>> GetByIdsAsync(List<string> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var db = _firebaseService.GetFirestoreDb();
        var docRefs = ids.Select(id => db.Collection(Collection).Document(id));
        var snapshots = await db.GetAllSnapshotsAsync(docRefs, cancellationToken: cancellationToken);

        return snapshots
            .Where(s => s.Exists)
            .Select(s => (s.Id, s.ConvertTo<ProductDocument>()))
            .ToList();
    }

    public async Task CreateAsync(string id, ProductDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).CreateAsync(document, cancellationToken);
        _cache.RemoveByPrefix(CachePrefix);
        _requestCache.Invalidate(Collection);
    }

    public async Task UpdateAsync(string id, Dictionary<string, object?> fields, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var updates = fields
            .Where(kv => kv.Value != null)
            .ToDictionary(kv => kv.Key, kv => kv.Value!);

        await db.Collection(Collection).Document(id).UpdateAsync(updates, cancellationToken: cancellationToken);
        _cache.RemoveByPrefix(CachePrefix);
        _requestCache.Invalidate(Collection);
    }

    public async Task<int> CountBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        return await CountByFieldAsync("slug", slug, cancellationToken);
    }

    public async Task<int> CountBySkuAsync(string sku, CancellationToken cancellationToken)
    {
        return await CountByFieldAsync("sku", sku, cancellationToken);
    }

    private async Task<int> CountByFieldAsync(string field, string value, CancellationToken cancellationToken)
    {
        var cacheKey = $"{CachePrefix}:count:{field}:{value}";
        return await _cache.GetOrCreateAsync(
            cacheKey,
            async ct =>
            {
                var db = _firebaseService.GetFirestoreDb();
                var snapshot = await db.Collection(Collection)
                    .WhereEqualTo(field, value)
                    .Count()
                    .GetSnapshotAsync(ct);

                return (int)(snapshot.Count ?? 0);
            },
            LookupCacheOptions,
            cancellationToken);
    }

    public async Task<PagedResult<(string Id, ProductDocument Data)>> SearchAsync(List<string> tokens, int pageSize, string? cursor, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        Query baseQuery = db.Collection(Collection)
            .WhereEqualTo("active", true)
            .WhereArrayContainsAny("searchKeywords", tokens.Cast<object>().ToList());

        var totalCountSnapshot = await baseQuery.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        var orderedQuery = baseQuery.OrderBy("displayOrder");

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorSnapshot = await db.Collection(Collection).Document(cursor).GetSnapshotAsync(cancellationToken);
            if (cursorSnapshot.Exists)
            {
                orderedQuery = orderedQuery.StartAfter(cursorSnapshot);
            }
        }

        var pageSizeClamped = Math.Clamp(pageSize, 1, 100);
        var snapshot = await orderedQuery.Limit(pageSizeClamped).GetSnapshotAsync(cancellationToken);

        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<ProductDocument>())).ToList();
        var nextCursor = items.Count == pageSizeClamped ? items[^1].Id : null;

        return new PagedResult<(string Id, ProductDocument Data)>
        {
            Items = items,
            NextCursor = nextCursor,
            TotalCount = totalCount,
        };
    }

    public Task BulkUpdateStatusAsync(List<string> ids, bool active, string updatedBy, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        return RunBatchAsync(ids, new Dictionary<string, object>
        {
            ["active"] = active,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = now,
        }, cancellationToken);
    }

    public Task BulkRestoreAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        return RunBatchAsync(ids, new Dictionary<string, object>
        {
            ["deleted"] = false,
            ["deletedAt"] = FieldValue.Delete,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = now,
        }, cancellationToken);
    }

    public Task BulkUpdateFlagAsync(List<string> ids, ProductFlag flag, bool value, string updatedBy, CancellationToken cancellationToken)
    {
        var fieldName = flag switch
        {
            ProductFlag.Featured => "featured",
            ProductFlag.NewArrival => "newArrival",
            ProductFlag.BestSeller => "bestSeller",
            _ => throw new ArgumentOutOfRangeException(nameof(flag), flag, null),
        };

        return RunBatchAsync(ids, new Dictionary<string, object>
        {
            [fieldName] = value,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);
    }

    public Task BulkSoftDeleteAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        return RunBatchAsync(ids, new Dictionary<string, object>
        {
            ["deleted"] = true,
            ["active"] = false,
            ["deletedAt"] = now,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = now,
        }, cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).DeleteAsync(cancellationToken: cancellationToken);
        _cache.RemoveByPrefix(CachePrefix);
        _requestCache.Invalidate(Collection);
    }

    /// <summary>
    /// A single WriteBatch commit is simplest to reason about and well
    /// within Firestore's 500-operation batch limit at this app's scale
    /// (admin bulk-selecting hundreds of rows at once is not a realistic
    /// case); a genuinely huge id list would need chunking, deliberately
    /// not built since it doesn't apply here.
    /// </summary>
    private async Task RunBatchAsync(List<string> ids, Dictionary<string, object> updates, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var batch = db.StartBatch();

        foreach (var id in ids)
        {
            batch.Update(db.Collection(Collection).Document(id), updates);
        }

        await batch.CommitAsync(cancellationToken);
        _requestCache.Invalidate(Collection);
    }

    public async Task BulkUpdateFlipkartUrlsAsync(List<BulkFlipkartUrlItem> items, string updatedBy, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var batch = db.StartBatch();
        var now = DateTime.UtcNow;

        foreach (var item in items)
        {
            var updates = new Dictionary<string, object>
            {
                ["flipkartProductUrl"] = string.IsNullOrWhiteSpace(item.FlipkartProductUrl) ? FieldValue.Delete : item.FlipkartProductUrl,
                ["flipkartSellerSku"] = string.IsNullOrWhiteSpace(item.FlipkartSellerSku) ? FieldValue.Delete : item.FlipkartSellerSku,
                ["updatedBy"] = updatedBy,
                ["updatedAt"] = now,
            };
            batch.Update(db.Collection(Collection).Document(item.Id), updates);
        }

        await batch.CommitAsync(cancellationToken);
    }

    public Task BulkUpdateLifecycleStageAsync(List<string> ids, string stage, string updatedBy, CancellationToken cancellationToken)
    {
        return RunBatchAsync(ids, new Dictionary<string, object>
        {
            ["lifecycleStage"] = stage,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);
    }

    public Task BulkLaunchAsync(List<string> ids, DateTime launchDate, string updatedBy, CancellationToken cancellationToken)
    {
        return RunBatchAsync(ids, new Dictionary<string, object>
        {
            ["lifecycleStage"] = LifecycleStage.ListedOnFlipkart,
            ["launchDate"] = launchDate,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);
    }

    public async Task IncrementWebsiteClickAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).UpdateAsync(new Dictionary<string, object>
        {
            ["websiteClickCount"] = FieldValue.Increment(1),
            ["lastClickAt"] = DateTime.UtcNow,
        }, cancellationToken: cancellationToken);
        _requestCache.Invalidate(Collection);
    }
}
