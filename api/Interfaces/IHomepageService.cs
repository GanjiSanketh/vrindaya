using Vrindaya.Api.DTOs.Homepage;

namespace Vrindaya.Api.Interfaces;

public interface IHomepageService
{
    /// <summary>The single aggregated payload GET /homepage returns — cached, see HomepageController.</summary>
    Task<HomepageResponse> GetHomepageAsync(CancellationToken cancellationToken);
}
