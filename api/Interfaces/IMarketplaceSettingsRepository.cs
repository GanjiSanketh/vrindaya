using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IMarketplaceSettingsRepository
{
    Task<MarketplaceSettingsDocument?> GetAsync(CancellationToken cancellationToken);
    Task SetAsync(MarketplaceSettingsDocument document, CancellationToken cancellationToken);
}
