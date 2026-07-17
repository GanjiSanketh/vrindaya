using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Revenues;

public class RevenueRepository : IRevenueRepository
{
    private const string Collection = "revenues";
    private const string CountersCollection = "counters";
    private const string RevenueCounterDocId = "revenues";

    private readonly IFirebaseService _firebaseService;

    public RevenueRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<RevenueDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<RevenueDocument>() : null;
    }

    public async Task<PagedResult<(string Id, RevenueDocument Data)>> GetAllAsync(
        string? cursor, int pageSize, string? search, string? source, string? status,
        DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        Query baseQuery = db.Collection(Collection);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var tokens = search.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(10).Cast<object>().ToList();
            if (tokens.Count > 0)
                baseQuery = baseQuery.WhereArrayContainsAny("searchKeywords", tokens);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(source))
                baseQuery = baseQuery.WhereEqualTo("source", source);
            if (!string.IsNullOrWhiteSpace(status))
                baseQuery = baseQuery.WhereEqualTo("status", status);
        }

        var clampedPageSize = Math.Clamp(pageSize, 1, 100);
        var orderedQuery = baseQuery.OrderByDescending("settlementDate");

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorDoc = await db.Collection(Collection).Document(cursor).GetSnapshotAsync(cancellationToken);
            if (cursorDoc.Exists)
                orderedQuery = orderedQuery.StartAfter(cursorDoc);
        }

        var snapshot = await orderedQuery.Limit(clampedPageSize).GetSnapshotAsync(cancellationToken);
        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<RevenueDocument>())).ToList();

        var totalSnapshot = await db.Collection(Collection).Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalSnapshot.Count ?? 0);

        return new PagedResult<(string Id, RevenueDocument Data)>
        {
            Items = items,
            NextCursor = items.Count == clampedPageSize ? items[^1].Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<string> CreateAsync(RevenueDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(Collection).Document();
        await docRef.CreateAsync(document, cancellationToken);
        return docRef.Id;
    }

    public async Task UpdateAsync(string id, RevenueDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).SetAsync(document, cancellationToken: cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).DeleteAsync(cancellationToken: cancellationToken);
    }

    public async Task<List<(string Id, RevenueDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<RevenueDocument>())).ToList();
    }

    public async Task<string> GenerateNextRevenueNumberAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var counterRef = db.Collection(CountersCollection).Document(RevenueCounterDocId);

        var nextValue = await db.RunTransactionAsync(async transaction =>
        {
            var snapshot = await transaction.GetSnapshotAsync(counterRef);
            var current = snapshot.Exists && snapshot.TryGetValue<long>("value", out var v) ? v : 0L;
            var next = current + 1;
            transaction.Set(counterRef, new Dictionary<string, object> { ["value"] = next });
            return next;
        }, cancellationToken: cancellationToken);

        return $"REV-{nextValue:D6}";
    }
}
