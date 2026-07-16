using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>See ICollectionRepository. Mirrors CategoryRepository exactly.</summary>
public class CollectionRepository : ICollectionRepository
{
    private const string Collection = "collections";

    private readonly IFirebaseService _firebaseService;

    public CollectionRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<List<(string Id, CollectionDocument Data)>> GetAllAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).OrderBy("displayOrder").GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<CollectionDocument>())).ToList();
    }

    public async Task<List<(string Id, CollectionDocument Data)>> GetActiveAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereEqualTo("active", true)
            .OrderBy("displayOrder")
            .GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<CollectionDocument>())).ToList();
    }

    public async Task<CollectionDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<CollectionDocument>() : null;
    }

    public async Task CreateAsync(string id, CollectionDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).CreateAsync(document, cancellationToken);
    }

    public async Task UpdateAsync(string id, CollectionDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).SetAsync(document, cancellationToken: cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).DeleteAsync(cancellationToken: cancellationToken);
    }

    public async Task ReorderAsync(List<string> orderedIds, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var batch = db.StartBatch();

        for (var i = 0; i < orderedIds.Count; i++)
        {
            batch.Update(db.Collection(Collection).Document(orderedIds[i]), new Dictionary<string, object> { ["displayOrder"] = (long)i });
        }

        await batch.CommitAsync(cancellationToken);
    }
}
