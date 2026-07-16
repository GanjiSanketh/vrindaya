using Google.Cloud.Firestore;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>
/// See IHeroBannerRepository. Mirrors ProductRepository's conventions —
/// const collection name, fresh GetFirestoreDb() per method — but uses a
/// full-document SetAsync (not a partial Dictionary update) for
/// create/update, since the admin form always replaces every field of this
/// small document at once; no FieldValue.Delete gymnastics needed.
/// </summary>
public class HeroBannerRepository : IHeroBannerRepository
{
    private const string Collection = "heroBanners";

    private readonly IFirebaseService _firebaseService;

    public HeroBannerRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public string GenerateId()
    {
        var db = _firebaseService.GetFirestoreDb();
        return db.Collection(Collection).Document().Id;
    }

    public async Task<List<(string Id, HeroBannerDocument Data)>> GetAllAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).OrderBy("displayOrder").GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<HeroBannerDocument>())).ToList();
    }

    public async Task<List<(string Id, HeroBannerDocument Data)>> GetActiveAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereEqualTo("active", true)
            .OrderBy("displayOrder")
            .GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<HeroBannerDocument>())).ToList();
    }

    public async Task<HeroBannerDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<HeroBannerDocument>() : null;
    }

    public async Task CreateAsync(string id, HeroBannerDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).CreateAsync(document, cancellationToken);
    }

    public async Task UpdateAsync(string id, HeroBannerDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).SetAsync(document, cancellationToken: cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).DeleteAsync(cancellationToken: cancellationToken);
    }
}
