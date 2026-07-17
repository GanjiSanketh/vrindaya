using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface ISupplierRepository
{
    Task<SupplierDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    /// <summary>At most one of search/activeOnly at a time — matches firestore.indexes.json's composite indexes (mirrors StockMovementRepository's identical constraint).</summary>
    Task<PagedResult<(string Id, SupplierDocument Data)>> GetAllAsync(
        string? cursor, int pageSize, string? search, bool? activeOnly, string sortBy, bool sortDescending, CancellationToken cancellationToken);

    /// <summary>Auto-generated id. Returns the new document's id.</summary>
    Task<string> CreateAsync(SupplierDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string id, SupplierDocument document, CancellationToken cancellationToken);

    /// <summary>True if another supplier already has this exact GSTIN. excludeId lets an update check against everyone except itself.</summary>
    Task<bool> ExistsByGstinAsync(string gstin, string? excludeId, CancellationToken cancellationToken);

    /// <summary>
    /// Atomically reserves the next sequential code ("SUP-000001", ...) via a
    /// Firestore transaction against a single counters/suppliers document —
    /// the one place in this codebase that uses a transaction, because
    /// sequential numbering intrinsically needs a read-modify-write that's
    /// safe under concurrent creates, which FieldValue.Increment alone can't
    /// provide (it doesn't return the resulting value to the caller).
    /// </summary>
    Task<string> GenerateNextSupplierCodeAsync(CancellationToken cancellationToken);
}
