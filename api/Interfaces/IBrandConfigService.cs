using Vrindaya.Api.DTOs.Brand;

namespace Vrindaya.Api.Interfaces;

public interface IBrandConfigService
{
    /// <summary>Public, cached (IMemoryCache) — footer/about/contact/faq/policy pages all read from here.</summary>
    Task<BrandConfigResponse> GetAsync(CancellationToken cancellationToken);

    Task<BrandConfigResponse> UpdateAsync(UpdateBrandConfigRequest request, string updatedBy, CancellationToken cancellationToken);
}
