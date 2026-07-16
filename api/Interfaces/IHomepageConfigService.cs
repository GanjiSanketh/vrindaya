using Vrindaya.Api.DTOs.Homepage;

namespace Vrindaya.Api.Interfaces;

public interface IHomepageConfigService
{
    Task<HomepageConfigResponse> GetAsync(CancellationToken cancellationToken);

    Task<HomepageConfigResponse> UpdateAsync(UpdateHomepageConfigRequest request, string updatedBy, CancellationToken cancellationToken);
}
