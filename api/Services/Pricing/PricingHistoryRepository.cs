using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Pricing;

public class PricingHistoryRepository : IPricingHistoryRepository
{
    private const string Collection = "pricingHistory";

    private readonly IFirebaseService _firebaseService;

    public PricingHistoryRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<PagedResult<(string Id, PricingHistoryDocument Data)>> GetByPricingIdAsync(
        string pricingId, string? cursor, int pageSize, DateTime? fromDate, DateTime? toDate,
        CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        Query query = db.Collection(Collection)
            .WhereEqualTo("pricingId", pricingId)
            .OrderByDescending("timestamp");

        if (fromDate.HasValue)
        {
            query = query.WhereGreaterThanOrEqualTo("timestamp", fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.WhereLessThanOrEqualTo("timestamp", toDate.Value);
        }

        var totalCountSnapshot = await query.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorSnapshot = await db.Collection(Collection).Document(cursor).GetSnapshotAsync(cancellationToken);
            if (cursorSnapshot.Exists)
            {
                query = query.StartAfter(cursorSnapshot);
            }
        }

        var clamped = Math.Clamp(pageSize, 1, 100);
        var snapshot = await query.Limit(clamped).GetSnapshotAsync(cancellationToken);
        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<PricingHistoryDocument>())).ToList();

        return new PagedResult<(string Id, PricingHistoryDocument Data)>
        {
            Items = items,
            NextCursor = items.Count == clamped ? items[^1].Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<string> CreateAsync(PricingHistoryDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(Collection).Document();
        await docRef.CreateAsync(document, cancellationToken);
        return docRef.Id;
    }
}
