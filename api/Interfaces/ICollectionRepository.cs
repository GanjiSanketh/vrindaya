using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface ICollectionRepository
{
    /// <summary>Admin: every collection, ordered by DisplayOrder.</summary>
    Task<List<(string Id, CollectionDocument Data)>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Public: Active-only, ordered by DisplayOrder.</summary>
    Task<List<(string Id, CollectionDocument Data)>> GetActiveAsync(CancellationToken cancellationToken);

    Task<CollectionDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task CreateAsync(string id, CollectionDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string id, CollectionDocument document, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    /// <summary>Single batched write — sets DisplayOrder = index in orderedIds for each, one commit.</summary>
    Task ReorderAsync(List<string> orderedIds, CancellationToken cancellationToken);
}
