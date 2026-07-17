using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.InventoryManagement;

/// <summary>
/// No-op placeholder for stock alert notifications — logs the event and
/// returns. Replace with a real email/SMS provider when notifications go
/// live (see IStockAlertNotificationService).
/// </summary>
public class StubStockAlertNotificationService : IStockAlertNotificationService
{
    private readonly ILogger<StubStockAlertNotificationService> _logger;

    public StubStockAlertNotificationService(ILogger<StubStockAlertNotificationService> logger)
    {
        _logger = logger;
    }

    public Task NotifyLowStockAsync(string variantId, string productId, string? productName, string color, string size, long currentStock, long lowStockThreshold, long criticalStockThreshold, string status, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "[StockAlert - STUB] Variant {VariantId} ({ProductName} / {Color} / {Size}) is now {Status}. " +
            "Stock: {CurrentStock}, Low threshold: {LowThreshold}, Critical threshold: {CriticalThreshold}. " +
            "No email sent — notification provider not yet wired.",
            variantId, productName ?? productId, color, size, status,
            currentStock, lowStockThreshold, criticalStockThreshold);

        return Task.CompletedTask;
    }

    public Task NotifyStockRestoredAsync(string variantId, string productId, string? productName, string color, string size, long currentStock, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "[StockAlert - STUB] Variant {VariantId} ({ProductName} / {Color} / {Size}) restored to Healthy. " +
            "Current stock: {CurrentStock}. No email sent — notification provider not yet wired.",
            variantId, productName ?? productId, color, size, currentStock);

        return Task.CompletedTask;
    }
}
