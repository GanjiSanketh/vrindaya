using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Pricing;

public class PricingRepository : IPricingRepository
{
    private const string Collection = "pricing";

    private readonly IFirebaseService _firebaseService;

    public PricingRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<PricingDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<PricingDocument>() : null;
    }

    public async Task<PagedResult<(string Id, PricingDocument Data)>> GetAllAsync(
        string? cursor, int pageSize, string? search, string? marketplace,
        bool? isActive, string? inventoryVariantId, string sortBy, bool sortDescending,
        CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        Query baseQuery = db.Collection(Collection);

        if (!string.IsNullOrWhiteSpace(marketplace))
        {
            baseQuery = baseQuery.WhereEqualTo("marketplace", marketplace.Trim());
        }

        if (isActive.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("isActive", isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(inventoryVariantId))
        {
            baseQuery = baseQuery.WhereEqualTo("inventoryVariantId", inventoryVariantId.Trim());
        }

        var totalCountSnapshot = await baseQuery.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        var sortField = sortBy switch
        {
            "costPrice" => "costPrice",
            "listingPrice" => "listingPrice",
            "actualProfit" => "actualProfit",
            "marginPercentage" => "marginPercentage",
            "marketplace" => "marketplace",
            "mrp" => "mrp",
            "createdAt" => "createdAt",
            "updatedAt" => "updatedAt",
            _ => "marketplace",
        };

        var orderedQuery = sortDescending ? baseQuery.OrderByDescending(sortField) : baseQuery.OrderBy(sortField);
        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorSnapshot = await db.Collection(Collection).Document(cursor).GetSnapshotAsync(cancellationToken);
            if (cursorSnapshot.Exists)
            {
                orderedQuery = orderedQuery.StartAfter(cursorSnapshot);
            }
        }

        var clampedPageSize = Math.Clamp(pageSize, 1, 100);
        var snapshot = await orderedQuery.Limit(clampedPageSize).GetSnapshotAsync(cancellationToken);
        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PricingDocument>())).ToList();

        return new PagedResult<(string Id, PricingDocument Data)>
        {
            Items = items,
            NextCursor = items.Count == clampedPageSize ? items[^1].Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<List<(string Id, PricingDocument Data)>> GetByVariantIdAsync(string variantId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereEqualTo("inventoryVariantId", variantId)
            .GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PricingDocument>())).ToList();
    }

    public async Task<string> CreateAsync(PricingDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(Collection).Document();
        await docRef.CreateAsync(document, cancellationToken);
        return docRef.Id;
    }

    public async Task UpdateAsync(string id, PricingDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).SetAsync(document, cancellationToken: cancellationToken);
    }

    public async Task<List<(string Id, PricingDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PricingDocument>())).ToList();
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).DeleteAsync(null, cancellationToken);
    }

    public async Task<bool> ExistsByVariantAndMarketplaceAsync(string variantId, string marketplace, string? excludeId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereEqualTo("inventoryVariantId", variantId)
            .WhereEqualTo("marketplace", marketplace)
            .GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Any(d => d.Id != excludeId);
    }
}
