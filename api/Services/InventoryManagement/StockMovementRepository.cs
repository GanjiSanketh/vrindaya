using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.InventoryManagement;

public class StockMovementRepository : IStockMovementRepository
{
    private const string Collection = "stockMovements";

    private readonly IFirebaseService _firebaseService;

    public StockMovementRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<string> CreateAsync(StockMovementDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(Collection).Document();
        await docRef.CreateAsync(document, cancellationToken);
        return docRef.Id;
    }

    public async Task<List<(string Id, StockMovementDocument Data)>> GetRecentAsync(int limit, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .OrderByDescending("createdAt")
            .Limit(limit)
            .GetSnapshotAsync(cancellationToken);

        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<StockMovementDocument>())).ToList();
    }

    public async Task<List<(string Id, StockMovementDocument Data)>> GetAllInRangeAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereGreaterThanOrEqualTo("createdAt", from.EnsureUtc())
            .WhereLessThanOrEqualTo("createdAt", to.EnsureUtc())
            .GetSnapshotAsync(cancellationToken);

        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<StockMovementDocument>())).ToList();
    }
}
