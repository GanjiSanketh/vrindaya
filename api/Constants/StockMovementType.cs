namespace Vrindaya.Api.Constants;

/// <summary>
/// Exact spelling round-trips verbatim to/from Firestore and the admin UI's
/// filter dropdowns — same load-bearing-string rule as LifecycleStage.
/// </summary>
/// <summary>
/// Exact spelling round-trips verbatim to/from Firestore and the admin UI's
/// filter dropdowns — same load-bearing-string rule as LifecycleStage.
///
/// EXTENSION POINT — Order module:
///   Reservation / ReservationRelease track pending-order holds against
///   AvailableStock (CurrentStock − ReservedStock). When the Order module is
///   implemented, it calls IInventoryCoreService.ReserveStockAsync on
///   checkout and ReleaseReservedStockAsync on cancellation. The Sale
///   movement type is already defined here for fulfillment; the Order module
///   sets StockMovement.ReferenceType = "Order" + ReferenceId = orderId on
///   every call, so the movement ledger links back to the originating order
///   with zero additional schema.
/// </summary>
public static class StockMovementType
{
    public const string Purchase = "Purchase";
    public const string Sale = "Sale";
    public const string Return = "Return";
    public const string Damage = "Damage";
    public const string ManualAdjustment = "ManualAdjustment";
    public const string StockCorrection = "StockCorrection";
    public const string Transfer = "Transfer";

    /// <summary>Reserved for a pending order — CurrentStock is unchanged; ReservedStock increases.</summary>
    public const string Reservation = "Reservation";

    /// <summary>Reservation released (order cancelled or expired) — ReservedStock decreases.</summary>
    public const string ReservationRelease = "ReservationRelease";

    public static readonly string[] All =
    [
        Purchase, Sale, Return, Damage, ManualAdjustment, StockCorrection, Transfer,
        Reservation, ReservationRelease,
    ];
}
