using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.ListingManagement;

public class ProductListingRepository : IProductListingRepository
{
    private const string Collection = "productListings";

    private readonly IFirebaseService _firebaseService;

    public ProductListingRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<ProductListingDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<ProductListingDocument>() : null;
    }

    public async Task<PagedResult<ProductListingDocument>> GetAllAsync(string? cursor, int pageSize, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var clampedPageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.Collection(Collection).OrderByDescending("updatedAt").Limit(clampedPageSize);

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorDoc = await db.Collection(Collection).Document(cursor).GetSnapshotAsync(cancellationToken);
            if (cursorDoc.Exists)
            {
                query = query.StartAfter(cursorDoc);
            }
        }

        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        var items = snapshot.Documents.Select(d => d.ConvertTo<ProductListingDocument>()).ToList();

        var totalSnapshot = await db.Collection(Collection).Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalSnapshot.Count ?? 0);

        return new PagedResult<ProductListingDocument>
        {
            Items = items,
            NextCursor = snapshot.Documents.Count > 0 ? snapshot.Documents.Last().Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<List<(string Id, ProductListingDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<ProductListingDocument>())).ToList();
    }

    public async Task<List<ProductListingDocument>> GetAllByProductIdAsync(string productId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereEqualTo("productId", productId)
            .GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => d.ConvertTo<ProductListingDocument>()).ToList();
    }

    public async Task UpsertAsync(string id, ProductListingDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).SetAsync(document, cancellationToken: cancellationToken);
    }

    public async Task BulkUpdateStatusAsync(List<string> ids, string status, string updatedBy, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var batch = db.StartBatch();
        var now = DateTime.UtcNow;

        foreach (var id in ids)
        {
            var docRef = db.Collection(Collection).Document(id);
            batch.Update(docRef, new Dictionary<string, object>
            {
                ["listingStatus"] = status,
                ["updatedAt"] = now,
                ["updatedBy"] = updatedBy,
            });
        }

        await batch.CommitAsync(cancellationToken);
    }
}
