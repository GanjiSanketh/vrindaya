using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.Interfaces;

public interface ICollectionService
{
    /// <summary>Public — Active-only, ordered. Metadata only (no resolved products) — powers collection search.</summary>
    Task<List<CollectionResponse>> GetActiveAsync(CancellationToken cancellationToken);

    /// <summary>Admin — every collection, including hidden ones.</summary>
    Task<List<CollectionResponse>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>The public landing page's payload — metadata + resolved products. Throws NotFoundException if missing, or inactive and the caller isn't admin (same 404-not-403 leak-avoidance as ProductService.GetProductByIdAsync).</summary>
    Task<CollectionLandingResponse> GetLandingBySlugAsync(string slug, bool isAdmin, CancellationToken cancellationToken);

    Task<CollectionResponse> CreateAsync(CreateCollectionRequest request, CancellationToken cancellationToken);

    Task<CollectionResponse> UpdateAsync(string id, UpdateCollectionRequest request, CancellationToken cancellationToken);

    /// <summary>Active-only partial update — never touches Image/BannerImage, same reasoning as ICategoryService.UpdateStatusAsync.</summary>
    Task<CollectionResponse> UpdateStatusAsync(string id, bool active, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    Task ReorderAsync(List<string> orderedIds, CancellationToken cancellationToken);

    /// <summary>Tolerant resolution used by HomepageService for Featured/Trending — empty list (never throws) if the slug doesn't exist or isn't active, so a misconfigured/renamed collection doesn't break the whole homepage.</summary>
    Task<List<ProductSummaryResponse>> GetProductsBySlugAsync(string slug, CancellationToken cancellationToken);
}
