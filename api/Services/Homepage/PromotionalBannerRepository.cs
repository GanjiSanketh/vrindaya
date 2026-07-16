using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>See IPromotionalBannerRepository. Mirrors HeroBannerRepository exactly.</summary>
public class PromotionalBannerRepository : IPromotionalBannerRepository
{
    private const string Collection = "promotionalBanners";

    private readonly IFirebaseService _firebaseService;

    public PromotionalBannerRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public string GenerateId()
    {
        var db = _firebaseService.GetFirestoreDb();
        return db.Collection(Collection).Document().Id;
    }

    public async Task<List<(string Id, PromotionalBannerDocument Data)>> GetAllAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).OrderBy("displayOrder").GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PromotionalBannerDocument>())).ToList();
    }

    public async Task<PromotionalBannerDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<PromotionalBannerDocument>() : null;
    }

    public async Task CreateAsync(string id, PromotionalBannerDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).CreateAsync(document, cancellationToken);
    }

    public async Task UpdateAsync(string id, PromotionalBannerDocument document, CancellationToken cancellationToken)
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
