using Google.Cloud.Firestore;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Products;

/// <summary>
/// See IProductAnalyticsRepository. Collection names are literals here
/// deliberately — same reasoning as ProductRepository (Firestore identifiers,
/// not cross-cutting app config).
/// </summary>
public class ProductAnalyticsRepository : IProductAnalyticsRepository
{
    private const string Collection = "analytics";
    private const string DailySubcollection = "daily";

    private readonly IFirebaseService _firebaseService;

    public ProductAnalyticsRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<List<(string ProductId, Dictionary<string, object> Data)>> GetAllTotalsAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, ToDictionary(d))).ToList();
    }

    public async Task<List<(string ProductId, Dictionary<string, object> Data)>> GetTopAsync(string sortField, int limit, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .OrderByDescending(sortField)
            .Limit(limit)
            .GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, ToDictionary(d))).ToList();
    }

    public async Task<Dictionary<string, object>?> GetTotalsAsync(string productId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(productId).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? ToDictionary(snapshot) : null;
    }

    public async Task<List<(string Date, Dictionary<string, object> Data)>> GetDailyAsync(string productId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .Document(productId)
            .Collection(DailySubcollection)
            .OrderByDescending(FieldPath.DocumentId)
            .GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, ToDictionary(d))).ToList();
    }

    public async Task<List<(string ProductId, Dictionary<string, object> Data)>> GetDailyByDateAsync(List<string> productIds, string dateKey, CancellationToken cancellationToken)
    {
        if (productIds.Count == 0)
        {
            return [];
        }

        var db = _firebaseService.GetFirestoreDb();
        var docRefs = productIds.Select(id => db.Collection(Collection).Document(id).Collection(DailySubcollection).Document(dateKey));
        var snapshots = await db.GetAllSnapshotsAsync(docRefs, cancellationToken: cancellationToken);

        return snapshots
            .Where(s => s.Exists)
            .Select(s => (s.Id, ToDictionary(s)))
            .ToList();
    }

    private static Dictionary<string, object> ToDictionary(DocumentSnapshot snapshot)
    {
        return snapshot.ToDictionary().ToDictionary(kv => kv.Key, kv => kv.Value);
    }
}
