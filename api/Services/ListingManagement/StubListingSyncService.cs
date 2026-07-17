using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.ListingManagement;

/// <summary>
/// Placeholder implementation of IListingSyncService — logs and does
/// nothing. Replace DI registration with a real provider (e.g.
/// FlipkartListingSyncService) when Flipkart API integration goes live.
/// </summary>
public class StubListingSyncService : IListingSyncService
{
    private readonly ILogger<StubListingSyncService> _logger;

    public StubListingSyncService(ILogger<StubListingSyncService> logger)
    {
        _logger = logger;
    }

    public Task SyncListingAsync(string listingId, string marketplace, CancellationToken cancellationToken)
    {
        _logger.LogInformation("STUB: SyncListingAsync called for listing {ListingId} on {Marketplace}. No API integration wired yet.", listingId, marketplace);
        return Task.CompletedTask;
    }

    public Task RefreshListingAsync(string listingId, string marketplace, CancellationToken cancellationToken)
    {
        _logger.LogInformation("STUB: RefreshListingAsync called for listing {ListingId} on {Marketplace}. No API integration wired yet.", listingId, marketplace);
        return Task.CompletedTask;
    }

    public Task SyncPendingListingsAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("STUB: SyncPendingListingsAsync called. No API integration wired yet.");
        return Task.CompletedTask;
    }
}
