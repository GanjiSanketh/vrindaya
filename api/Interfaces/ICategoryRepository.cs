using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface ICategoryRepository
{
    /// <summary>Admin: every category, ordered by DisplayOrder.</summary>
    Task<List<(string Id, CategoryDocument Data)>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Public: Active-only, ordered by DisplayOrder.</summary>
    Task<List<(string Id, CategoryDocument Data)>> GetActiveAsync(CancellationToken cancellationToken);

    Task<CategoryDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task CreateAsync(string id, CategoryDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string id, CategoryDocument document, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    /// <summary>Single batched write — sets DisplayOrder = index in orderedIds for each, one commit.</summary>
    Task ReorderAsync(List<string> orderedIds, CancellationToken cancellationToken);
}
