using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Brand;

public class BrandConfigRepository : IBrandConfigRepository
{
    private const string Collection = "brandConfig";
    private const string SingletonId = "singleton";

    private readonly IFirebaseService _firebaseService;

    public BrandConfigRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<BrandConfigDocument?> GetAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(SingletonId).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<BrandConfigDocument>() : null;
    }

    public async Task SetAsync(BrandConfigDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(SingletonId).SetAsync(document, cancellationToken: cancellationToken);
    }
}
