using Vrindaya.Api.DTOs.Homepage;

namespace Vrindaya.Api.Interfaces;

public interface ICategoryService
{
    /// <summary>Public: Active-only, ordered.</summary>
    Task<List<CategoryResponse>> GetActiveAsync(CancellationToken cancellationToken);

    /// <summary>Admin: every category, including hidden ones.</summary>
    Task<List<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<CategoryResponse> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);

    Task<CategoryResponse> UpdateAsync(string id, UpdateCategoryRequest request, CancellationToken cancellationToken);

    /// <summary>Active-only partial update — never touches Image/BannerImage, so a category whose legacy image value predates the Firebase Storage migration can still have its visibility toggled without tripping [Url] validation on unrelated, unchanged fields.</summary>
    Task<CategoryResponse> UpdateStatusAsync(string id, bool active, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    Task ReorderAsync(List<string> orderedIds, CancellationToken cancellationToken);
}
