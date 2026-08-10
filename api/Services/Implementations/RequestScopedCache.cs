using Google.Cloud.Firestore;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Services.Interfaces;

namespace Vrindaya.Api.Services.Implementations;

/// <summary>
/// Default <see cref="IRequestScopedCache"/> backed by a per-request dictionary.
/// Snapshots are stored as their in-flight <see cref="Task{T}"/> so concurrent
/// first-time readers share a single Firestore load (single-flight). A failed
/// load is evicted so a later call in the same request retries instead of
/// reusing the fault.
///
/// Field-masked loads are cached under a key derived from the collection path
/// plus the requested fields, so the same collection read at different
/// granularities within one request (full doc vs projected dashboard fields)
/// each keep their own snapshot instead of colliding.
/// </summary>
public class RequestScopedCache : IRequestScopedCache
{
    private readonly IFirebaseService _firebase;
    private readonly Dictionary<string, Task<QuerySnapshot>> _snapshots = new(StringComparer.Ordinal);

    public RequestScopedCache(IFirebaseService firebase)
    {
        _firebase = firebase;
    }

    public Task<QuerySnapshot> GetWholeCollectionSnapshotAsync(string collectionPath, CancellationToken ct = default)
    {
        return GetWholeCollectionSnapshotAsync(collectionPath, [], ct);
    }

    public Task<QuerySnapshot> GetWholeCollectionSnapshotAsync(string collectionPath, IReadOnlyList<string> fields, CancellationToken ct = default)
    {
        var key = BuildKey(collectionPath, fields);

        lock (_snapshots)
        {
            if (_snapshots.TryGetValue(key, out var existing))
            {
                return existing;
            }

            var task = LoadAsync(key, collectionPath, fields, ct);
            _snapshots[key] = task;
            return task;
        }
    }

    public void Invalidate(string collectionPath)
    {
        lock (_snapshots)
        {
            // Drop every snapshot for the collection — the full-document load
            // and any field-masked projections of it — so a write-then-read
            // flow is never served stale data at either granularity.
            var prefix = collectionPath + KeySeparator;
            var keys = _snapshots.Keys.Where(k =>
                string.Equals(k, collectionPath, StringComparison.Ordinal) ||
                k.StartsWith(prefix, StringComparison.Ordinal)).ToList();

            foreach (var key in keys)
            {
                _snapshots.Remove(key);
            }
        }
    }

    private async Task<QuerySnapshot> LoadAsync(string key, string collectionPath, IReadOnlyList<string> fields, CancellationToken ct)
    {
        try
        {
            var db = _firebase.GetFirestoreDb();
            Query query = db.Collection(collectionPath);
            if (fields.Count > 0)
            {
                query = query.Select(fields.ToArray());
            }
            return await query.GetSnapshotAsync(ct).ConfigureAwait(false);
        }
        catch
        {
            lock (_snapshots)
            {
                _snapshots.Remove(key);
            }
            throw;
        }
    }

    private const string KeySeparator = "|";

    private static string BuildKey(string collectionPath, IReadOnlyList<string> fields)
        => fields.Count == 0
            ? collectionPath
            : collectionPath + KeySeparator + string.Join(",", fields);
}
