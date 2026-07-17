namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Future Flipkart (and other marketplace) API integration interface.
/// Implementations handle pushing listing data to the marketplace and
/// pulling status/price/inventory updates. Currently routed through
/// StubListingSyncService (no-op logger) — swap DI registration for a
/// real provider when Flipkart API integration goes live.
/// </summary>
public interface IListingSyncService
{
    /// <summary>Push a single listing's price/inventory/status to the marketplace.</summary>
    Task SyncListingAsync(string listingId, string marketplace, CancellationToken cancellationToken);

    /// <summary>Pull latest status/price for a single listing from the marketplace.</summary>
    Task RefreshListingAsync(string listingId, string marketplace, CancellationToken cancellationToken);

    /// <summary>Bulk push all pending listings to the marketplace.</summary>
    Task SyncPendingListingsAsync(CancellationToken cancellationToken);
}
