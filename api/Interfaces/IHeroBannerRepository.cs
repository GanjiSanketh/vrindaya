using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IHeroBannerRepository
{
    string GenerateId();

    /// <summary>Admin list — every banner, ordered by DisplayOrder.</summary>
    Task<List<(string Id, HeroBannerDocument Data)>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Public — active banners only, ordered. Start/end date narrowing still happens in-memory in HeroBannerService (Firestore can't express the "field is null OR in range" condition needed here without a much larger index), but filtering out inactive banners server-side avoids downloading disabled/archived ones on every homepage request.</summary>
    Task<List<(string Id, HeroBannerDocument Data)>> GetActiveAsync(CancellationToken cancellationToken);

    Task<HeroBannerDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task CreateAsync(string id, HeroBannerDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string id, HeroBannerDocument document, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);
}
