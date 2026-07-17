using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

/// <summary>
/// See IProductRepository. Collection name is a literal here deliberately —
/// same reasoning as CampaignDeliveryRepository's collection constants
/// (a Firestore identifier, not cross-cutting app config).
/// </summary>
public class ProductRepository : IProductRepository
{
    private const string Collection = "products";

    private readonly IFirebaseService _firebaseService;

    public ProductRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public string GenerateId()
    {
        var db = _firebaseService.GetFirestoreDb();
        return db.Collection(Collection).Document().Id;
    }

    public async Task<List<(string Id, ProductDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
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
            baseQuery = baseQuery.WhereGreaterThan("stock", 0);
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
    }

    public async Task UpdateAsync(string id, Dictionary<string, object?> fields, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var updates = fields
            .Where(kv => kv.Value != null)
            .ToDictionary(kv => kv.Key, kv => kv.Value!);

        await db.Collection(Collection).Document(id).UpdateAsync(updates, cancellationToken: cancellationToken);
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
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereEqualTo(field, value)
            .Count()
            .GetSnapshotAsync(cancellationToken);

        return (int)(snapshot.Count ?? 0);
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
    }
}
