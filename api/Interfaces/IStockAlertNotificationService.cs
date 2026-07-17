namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Abstraction for sending stock-level alerts. The current implementation is
/// a stub — wire a real email/SMS provider behind this when notifications
/// go live (see StubStockAlertNotificationService for the no-op default).
/// </summary>
public interface IStockAlertNotificationService
{
    /// <summary>Called when a variant's computed status has dropped to Low, Critical, or OutOfStock.</summary>
    Task NotifyLowStockAsync(string variantId, string productId, string? productName, string color, string size, long currentStock, long lowStockThreshold, long criticalStockThreshold, string status, CancellationToken cancellationToken);

    /// <summary>Called when a variant that was previously non-Healthy returns to Healthy stock level.</summary>
    Task NotifyStockRestoredAsync(string variantId, string productId, string? productName, string color, string size, long currentStock, CancellationToken cancellationToken);
}
