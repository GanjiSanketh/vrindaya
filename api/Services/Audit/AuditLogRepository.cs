using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Audit;

public class AuditLogRepository : IAuditLogRepository
{
    private const string Collection = "auditLogs";

    private readonly IFirebaseService _firebaseService;

    public AuditLogRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<string> CreateAsync(AuditLogDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(Collection).Document();
        await docRef.CreateAsync(document, cancellationToken);
        return docRef.Id;
    }

    public async Task<PagedResult<(string Id, AuditLogDocument Data)>> GetAsync(
        DateTime from, DateTime to,
        int page, int pageSize,
        CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereGreaterThanOrEqualTo("performedAt", from.EnsureUtc())
            .WhereLessThanOrEqualTo("performedAt", to.EnsureUtc())
            .OrderByDescending("performedAt")
            .GetSnapshotAsync(cancellationToken);

        var all = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<AuditLogDocument>())).ToList();
        var totalCount = all.Count;

        var clampedPageSize = Math.Clamp(pageSize, 1, 200);
        var items = all.Skip((page - 1) * clampedPageSize).Take(clampedPageSize).ToList();

        return new PagedResult<(string Id, AuditLogDocument Data)>
        {
            Items = items,
            NextCursor = (page * clampedPageSize < totalCount) ? (page + 1).ToString() : null,
            TotalCount = totalCount,
        };
    }

    public async Task<int> CountAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection)
            .WhereGreaterThanOrEqualTo("performedAt", from.EnsureUtc())
            .WhereLessThanOrEqualTo("performedAt", to.EnsureUtc())
            .Count()
            .GetSnapshotAsync(cancellationToken);

        return (int)(snapshot.Count ?? 0);
    }
}
