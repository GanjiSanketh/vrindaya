using Vrindaya.Api.DTOs.Marketplace;

namespace Vrindaya.Api.Interfaces;

public interface IMarketplaceSettingsService
{
    Task<FlipkartSettingsResponse> GetAsync(CancellationToken cancellationToken);
    Task<FlipkartSettingsResponse> UpdateAsync(UpdateFlipkartSettingsRequest request, string updatedBy, CancellationToken cancellationToken);
    Task<MarketplaceDefaultsDto> GetDefaultsAsync(string marketplaceType, CancellationToken cancellationToken);
}
