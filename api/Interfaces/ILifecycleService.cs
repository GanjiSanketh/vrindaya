namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Owns Product Lifecycle stage transitions (Constants.LifecycleStage) —
/// a distinct concern from inventory quantity (owned by the Inventory
/// Management module), and out of the Flipkart Ops surface since it's no
/// longer Flipkart-specific (Phase 8).
/// </summary>
public interface ILifecycleService
{
    Task UpdateStageAsync(string productId, string stage, string updatedBy, CancellationToken cancellationToken);

    Task BulkUpdateStageAsync(List<string> ids, string stage, string updatedBy, CancellationToken cancellationToken);
}
