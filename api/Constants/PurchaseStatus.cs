namespace Vrindaya.Api.Constants;

/// <summary>
/// Exact spelling round-trips verbatim to/from Firestore and the admin UI —
/// same load-bearing-string rule as LifecycleStage/StockMovementType.
///
/// Gates inventory impact (see InventoryManagementService.ApplyPurchaseTransitionAsync):
/// Draft — saved, freely editable, never touches stock/cost.
/// Confirmed — posts to inventory (stock + a StockMovement per affected
///   product) and counts toward the product's AveragePurchaseCost.
/// Cancelled — reverses a prior Confirmed posting; a Cancelled purchase's
///   items are excluded from AveragePurchaseCost going forward.
/// </summary>
public static class PurchaseStatus
{
    public const string Draft = "Draft";
    public const string Confirmed = "Confirmed";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All = [Draft, Confirmed, Cancelled];
}
