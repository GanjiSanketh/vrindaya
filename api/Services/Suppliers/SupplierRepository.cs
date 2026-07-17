using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Suppliers;

public class SupplierRepository : ISupplierRepository
{
    private const string Collection = "suppliers";
    private const string CountersCollection = "counters";
    private const string SupplierCounterDocId = "suppliers";

    private readonly IFirebaseService _firebaseService;

    public SupplierRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<SupplierDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<SupplierDocument>() : null;
    }

    public async Task<PagedResult<(string Id, SupplierDocument Data)>> GetAllAsync(
        string? cursor, int pageSize, string? search, bool? activeOnly, string sortBy, bool sortDescending, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        Query baseQuery = db.Collection(Collection);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var tokens = search.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(10).Cast<object>().ToList();
            if (tokens.Count > 0)
            {
                baseQuery = baseQuery.WhereArrayContainsAny("searchKeywords", tokens);
            }
        }
        else if (activeOnly.HasValue)
        {
            baseQuery = baseQuery.WhereEqualTo("isActive", activeOnly.Value);
        }

        var totalCountSnapshot = await baseQuery.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        var sortField = sortBy switch
        {
            "supplierCode" => "supplierCode",
            "createdAt" => "createdAt",
            _ => "companyName",
        };

        var orderedQuery = sortDescending ? baseQuery.OrderByDescending(sortField) : baseQuery.OrderBy(sortField);
        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorSnapshot = await db.Collection(Collection).Document(cursor).GetSnapshotAsync(cancellationToken);
            if (cursorSnapshot.Exists)
            {
                orderedQuery = orderedQuery.StartAfter(cursorSnapshot);
            }
        }

        var clampedPageSize = Math.Clamp(pageSize, 1, 100);
        var snapshot = await orderedQuery.Limit(clampedPageSize).GetSnapshotAsync(cancellationToken);
        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<SupplierDocument>())).ToList();

        return new PagedResult<(string Id, SupplierDocument Data)>
        {
            Items = items,
            NextCursor = items.Count == clampedPageSize ? items[^1].Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<string> CreateAsync(SupplierDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(Collection).Document();
        await docRef.CreateAsync(document, cancellationToken);
        return docRef.Id;
    }

    public async Task UpdateAsync(string id, SupplierDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(id).SetAsync(document, cancellationToken: cancellationToken);
    }

    public async Task<bool> ExistsByGstinAsync(string gstin, string? excludeId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).WhereEqualTo("gstin", gstin).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Any(d => d.Id != excludeId);
    }

    public async Task<string> GenerateNextSupplierCodeAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var counterRef = db.Collection(CountersCollection).Document(SupplierCounterDocId);

        var nextValue = await db.RunTransactionAsync(async transaction =>
        {
            var snapshot = await transaction.GetSnapshotAsync(counterRef);
            var current = snapshot.Exists && snapshot.TryGetValue<long>("value", out var v) ? v : 0L;
            var next = current + 1;
            transaction.Set(counterRef, new Dictionary<string, object> { ["value"] = next });
            return next;
        }, cancellationToken: cancellationToken);

        return $"SUP-{nextValue:D6}";
    }
}
