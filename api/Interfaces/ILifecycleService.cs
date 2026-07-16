namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Owns Product Lifecycle stage transitions (Constants.LifecycleStage) —
/// split out from IInventoryService since a lifecycle stage isn't an
/// inventory-quantity concern, and out of the Flipkart Ops surface since
/// it's no longer Flipkart-specific (Phase 8).
/// </summary>
public interface ILifecycleService
{
    Task UpdateStageAsync(string productId, string stage, string updatedBy, CancellationToken cancellationToken);

    Task BulkUpdateStageAsync(List<string> ids, string stage, string updatedBy, CancellationToken cancellationToken);
}
