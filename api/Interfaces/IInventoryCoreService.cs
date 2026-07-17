namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Primitive inventory operations that every stock-affecting feature (Order
/// Management, Purchase Register, Manual Adjustments, etc.) uses. Every
/// method automatically writes an append-only StockMovementDocument to the
/// stockMovements ledger so inventory history is never silently lost.
///
/// EXTENSION POINT — Order module integration
/// ─────────────────────────────────────────
/// Every mutation method accepts referenceType + referenceId parameters.
/// When the Order module calls:
///
///   1. ReserveStockAsync(variantId, qty, "Order", orderId, ...)
///      — Called on checkout. Creates an OrderReservationDocument (status
///        Active), increases ReservedStock, writes a Reservation movement.
///      - If payment fails / order expires, call ReleaseReservedStockAsync.
///
///   2. ReleaseReservedStockAsync(variantId, "Order", orderId, ...)
///      — Called on cancellation or expired payment hold. Decreases
///        ReservedStock, sets reservation status to Cancelled, writes a
///        ReservationRelease movement.
///
///   3. DecreaseStockAsync(variantId, qty, "Order", orderId, ...)
///      — Called on fulfillment. Decreases CurrentStock (and ReservedStock
///        if there's an active reservation), sets reservation status to
///        Fulfilled, writes a Sale movement. Throws if stock is insufficient.
///
///   4. IncreaseReturnedStockAsync(variantId, qty, "Order", orderId, ...)
///      — Called on return/refund. Restores stock, writes a Return movement.
///
///   The reference parameters flow verbatim into StockMovementDocument.
///   ReferenceType / ReferenceId on every movement, so the ledger can be
///   filtered by order id without any additional schema — the Order module
///   never touches Firestore collections directly.
///
///   Outside the Order module, pass referenceType = referenceId = null
///   (e.g. manual warehouse adjustments use AdjustStockAsync with null refs).
///
/// THREADING / CONCURRENCY
/// ───────────────────────
/// NOT thread-safe by itself — Firestore transactions are NOT used (the
/// wider InventoryManagementService predates them). When the Order module
/// goes live, wrap sequences like Reserve → Decrease in a Firestore
/// transaction at the Order-module level; this interface is intentionally
/// single-operation to keep the transaction boundary at the caller.
/// </summary>
public interface IInventoryCoreService
{
    /// <summary>
    /// Reserves quantity of a variant for a future order. Increases
    /// ReservedStock; does NOT change CurrentStock. Available stock
    /// (CurrentStock − ReservedStock) must be >= quantity or this throws.
    /// Automatically creates:
    ///   - An OrderReservationDocument (status Active)
    ///   - A stock movement (MovementType = Reservation)
    /// </summary>
    Task ReserveStockAsync(string variantId, long quantity, string referenceType, string referenceId, string createdBy, CancellationToken cancellationToken);

    /// <summary>
    /// Releases a previous reservation (order cancelled, payment expired).
    /// Decreases ReservedStock by the reservation's quantity. Sets the
    /// OrderReservationDocument to Cancelled.
    /// Automatically creates a stock movement (MovementType = ReservationRelease).
    /// Looks up the reservation by (variantId, referenceType, referenceId).
    /// </summary>
    Task ReleaseReservedStockAsync(string variantId, string referenceType, string referenceId, string updatedBy, CancellationToken cancellationToken);

    /// <summary>
    /// Decreases CurrentStock for a fulfilled order or other outbound.
    /// If there is an active reservation matching (referenceType, referenceId),
    /// also decreases ReservedStock by the same quantity and marks it
    /// Fulfilled. Creates a stock movement (MovementType = Sale).
    /// Throws if CurrentStock is insufficient.
    /// </summary>
    Task DecreaseStockAsync(string variantId, long quantity, string referenceType, string referenceId, string createdBy, CancellationToken cancellationToken);

    /// <summary>
    /// Increases CurrentStock and ReturnedStock for a returned item.
    /// Creates a stock movement (MovementType = Return).
    /// Does NOT modify reservations — the caller should release the
    /// reservation separately if needed.
    /// </summary>
    Task IncreaseReturnedStockAsync(string variantId, long quantity, string referenceType, string referenceId, string createdBy, CancellationToken cancellationToken);

    /// <summary>
    /// Applies a signed delta to CurrentStock for manual corrections/
    /// adjustments. Delta can be positive (increase) or negative (decrease).
    /// Creates a stock movement (MovementType = ManualAdjustment).
    /// Does NOT touch ReservedStock — use ReleaseReservedStockAsync for that.
    /// </summary>
    Task AdjustStockAsync(string variantId, long delta, string reason, string createdBy, CancellationToken cancellationToken);

    /// <summary>
    /// Returns available stock = CurrentStock − ReservedStock.
    /// A simple read — does not create any movement.
    /// </summary>
    Task<long> GetAvailableStockAsync(string variantId, CancellationToken cancellationToken);
}
