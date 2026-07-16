using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

public class HomepageConfigRepository : IHomepageConfigRepository
{
    private const string Collection = "homepageConfig";
    private const string SingletonId = "singleton";

    private readonly IFirebaseService _firebaseService;

    public HomepageConfigRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<HomepageConfigDocument?> GetAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(SingletonId).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<HomepageConfigDocument>() : null;
    }

    public async Task SetAsync(HomepageConfigDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(SingletonId).SetAsync(document, cancellationToken: cancellationToken);
    }
}
