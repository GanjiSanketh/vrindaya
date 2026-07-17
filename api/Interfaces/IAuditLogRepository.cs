using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>Pure Firestore data access over the auditLogs collection — append-only, no update/delete.</summary>
public interface IAuditLogRepository
{
    /// <summary>Persists a single audit log entry. Returns the auto-generated Firestore document id.</summary>
    Task<string> CreateAsync(AuditLogDocument document, CancellationToken cancellationToken);

    /// <summary>
    /// Page-number-based listing with optional filters. Loads all matching
    /// documents in the date range, then filters/sorts/paginates in memory.
    /// This is acceptable for the audit log's realistic size (thousands of
    /// entries, not millions) and avoids needing composite indexes for every
    /// filter combination.
    /// Returns every document with its Firestore document id.
    /// </summary>
    Task<PagedResult<(string Id, AuditLogDocument Data)>> GetAsync(
        DateTime from, DateTime to,
        int page, int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Total count of documents matching the date range — used for building page-number UI.</summary>
    Task<int> CountAsync(DateTime from, DateTime to, CancellationToken cancellationToken);
}
