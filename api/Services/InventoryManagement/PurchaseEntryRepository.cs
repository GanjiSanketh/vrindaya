using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.InventoryManagement;

public class PurchaseEntryRepository : IPurchaseEntryRepository
{
    private const string Collection = "purchaseEntries";

    private readonly IFirebaseService _firebaseService;

    public PurchaseEntryRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<string> CreateAsync(PurchaseEntryDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(Collection).Document();
        await docRef.CreateAsync(document, cancellationToken);
        return docRef.Id;
    }

    public async Task<PurchaseEntryDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<PurchaseEntryDocument>() : null;
    }

    public async Task UpdateAsync(string id, PurchaseEntryDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).SetAsync(document, cancellationToken: cancellationToken);
    }

    public async Task<PagedResult<(string Id, PurchaseEntryDocument Data)>> GetAllAsync(string? cursor, int pageSize, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var baseQuery = db.Collection(Collection).OrderByDescending("purchaseDate");

        var totalCountSnapshot = await baseQuery.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        var orderedQuery = baseQuery;
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
        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PurchaseEntryDocument>())).ToList();

        return new PagedResult<(string Id, PurchaseEntryDocument Data)>
        {
            Items = items,
            NextCursor = items.Count == clampedPageSize ? items[^1].Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<PagedResult<(string Id, PurchaseEntryDocument Data)>> GetBySupplierIdAsync(
        string supplierId, string? cursor, int pageSize, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var baseQuery = db.Collection(Collection).WhereEqualTo("supplierId", supplierId);

        var totalCountSnapshot = await baseQuery.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        var orderedQuery = baseQuery.OrderByDescending("purchaseDate");
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
        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PurchaseEntryDocument>())).ToList();

        return new PagedResult<(string Id, PurchaseEntryDocument Data)>
        {
            Items = items,
            NextCursor = items.Count == clampedPageSize ? items[^1].Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<List<(string Id, PurchaseEntryDocument Data)>> GetAllBySupplierIdUnpagedAsync(string supplierId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).WhereEqualTo("supplierId", supplierId).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PurchaseEntryDocument>())).ToList();
    }

    public async Task<List<(string Id, PurchaseEntryDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PurchaseEntryDocument>())).ToList();
    }
}
