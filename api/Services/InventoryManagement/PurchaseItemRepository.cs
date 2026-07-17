using Vrindaya.Api.Constants;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.InventoryManagement;

public class PurchaseItemRepository : IPurchaseItemRepository
{
    private const string Collection = "purchaseItems";

    private readonly IFirebaseService _firebaseService;

    public PurchaseItemRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task CreateManyAsync(List<PurchaseItemDocument> items, CancellationToken cancellationToken)
    {
        if (items.Count == 0) return;

        var db = _firebaseService.GetFirestoreDb();
        var batch = db.StartBatch();

        // Single WriteBatch, bounded by a purchase's realistic line-item
        // count — same "not chunked for >500 ops" assumption already
        // documented on ProductRepository's own bulk-write helper.
        foreach (var item in items)
        {
            batch.Create(db.Collection(Collection).Document(), item);
        }

        await batch.CommitAsync(cancellationToken);
    }

    public async Task<List<(string Id, PurchaseItemDocument Data)>> GetByPurchaseEntryIdAsync(string purchaseEntryId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).WhereEqualTo("purchaseEntryId", purchaseEntryId).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PurchaseItemDocument>())).ToList();
    }

    public async Task DeleteByPurchaseEntryIdAsync(string purchaseEntryId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).WhereEqualTo("purchaseEntryId", purchaseEntryId).GetSnapshotAsync(cancellationToken);
        if (snapshot.Documents.Count == 0) return;

        var batch = db.StartBatch();
        foreach (var doc in snapshot.Documents)
        {
            batch.Delete(doc.Reference);
        }
        await batch.CommitAsync(cancellationToken);
    }

    public async Task<List<PurchaseItemDocument>> GetConfirmedByVariantAsync(string productId, string color, string size, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereEqualTo("productId", productId)
            .WhereEqualTo("color", color)
            .WhereEqualTo("size", size)
            .WhereEqualTo("status", PurchaseStatus.Confirmed)
            .GetSnapshotAsync(cancellationToken);

        return snapshot.Documents.Select(d => d.ConvertTo<PurchaseItemDocument>()).ToList();
    }

    public async Task<List<PurchaseItemDocument>> GetBySupplierIdAsync(string supplierId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).WhereEqualTo("supplierId", supplierId).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => d.ConvertTo<PurchaseItemDocument>()).ToList();
    }

    public async Task<List<(string Id, PurchaseItemDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PurchaseItemDocument>())).ToList();
    }
}
