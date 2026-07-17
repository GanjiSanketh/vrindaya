using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Marketplace;

public class MarketplaceSettingsRepository : IMarketplaceSettingsRepository
{
    private const string Collection = "marketplaceSettings";
    private const string DocumentId = "flipkart";

    private readonly IFirebaseService _firebaseService;

    public MarketplaceSettingsRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<MarketplaceSettingsDocument?> GetAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(DocumentId).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<MarketplaceSettingsDocument>() : null;
    }

    public async Task SetAsync(MarketplaceSettingsDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(DocumentId).SetAsync(document, cancellationToken: cancellationToken);
    }
}
