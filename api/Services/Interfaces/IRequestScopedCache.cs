using Google.Cloud.Firestore;

namespace Vrindaya.Api.Services.Interfaces;

/// <summary>
/// Request-scoped cache for whole-collection Firestore loads. Registered as
/// scoped (see ServiceCollectionExtensions), so the cache lives exactly as
/// long as one HTTP request and is never shared or persisted across requests —
/// no static state. When a repository reads the same collection more than once
/// during a single request, the already loaded snapshot is reused instead of
/// querying Firestore again.
///
/// Only *whole-collection* snapshots are cached (unfiltered, unordered); callers
/// apply their own ordering/filtering after retrieving the snapshot, so distinct
/// queries on the same collection never collide. The existing cross-request
/// ICacheService is deliberately left untouched — this is a separate,
/// additive layer scoped to the request.
/// </summary>
public interface IRequestScopedCache
{
    /// <summary>
    /// Returns the full snapshot for the collection at <paramref name="collectionPath"/>
    /// (e.g. "products" or "products/{productId}/variants"), loading it from
    /// Firestore at most once per request. Concurrent first-time callers share
    /// a single load.
    /// </summary>
    Task<QuerySnapshot> GetWholeCollectionSnapshotAsync(string collectionPath, CancellationToken ct = default);

    /// <summary>
    /// Like <see cref="GetWholeCollectionSnapshotAsync(string, CancellationToken)"/>
    /// but reads only the requested fields (a Firestore field-mask projection),
    /// cutting the payload transferred for callers that aggregate from a subset
    /// of each document (e.g. the dashboard). Cached separately from the full
    /// snapshot — same single-flight semantics, same invalidation on write.
    /// </summary>
    Task<QuerySnapshot> GetWholeCollectionSnapshotAsync(string collectionPath, IReadOnlyList<string> fields, CancellationToken ct = default);

    /// <summary>
    /// Drops the cached snapshot for <paramref name="collectionPath"/> so a
    /// subsequent read within the same request sees fresh data. Call this from
    /// write methods so a write-then-read flow is never served stale data.
    /// </summary>
    void Invalidate(string collectionPath);
}
