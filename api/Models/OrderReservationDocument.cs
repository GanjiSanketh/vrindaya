using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's orderReservations collection — one
/// document per (VariantId, ReferenceType, ReferenceId) reservation created
/// by IInventoryCoreService.ReserveStockAsync. Tracks the lifecycle of a
/// stock hold from reservation through fulfillment or release.
///
/// EXTENSION POINT — Order module:
///   When the Order module is implemented, it calls ReserveStockAsync during
///   checkout to create one of these documents, then on:
///     - Fulfillment: calls DecreaseStockAsync (which releases the reservation)
///     - Cancellation: calls ReleaseReservedStockAsync
///   No schema change to this document is needed — ReferenceType = "Order"
///   and ReferenceId = orderId already identify which order holds the stock.
/// </summary>
[FirestoreData]
public class OrderReservationDocument
{
    [FirestoreProperty("variantId")]
    public string VariantId { get; set; } = string.Empty;

    [FirestoreProperty("quantity")]
    public long Quantity { get; set; }

    /// <summary>Which external system owns this reservation (e.g. "Order").</summary>
    [FirestoreProperty("referenceType")]
    public string ReferenceType { get; set; } = string.Empty;

    /// <summary>Id within that external system (e.g. the order id).</summary>
    [FirestoreProperty("referenceId")]
    public string ReferenceId { get; set; } = string.Empty;

    /// <summary>Active | Released | Fulfilled | Cancelled — see OrderReservationStatus.</summary>
    [FirestoreProperty("status")]
    public string Status { get; set; } = OrderReservationStatus.Active;

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("releasedAt")]
    public DateTime? ReleasedAt { get; set; }

    [FirestoreProperty("fulfilledAt")]
    public DateTime? FulfilledAt { get; set; }

    [FirestoreProperty("cancelledAt")]
    public DateTime? CancelledAt { get; set; }
}

/// <summary>
/// Load-bearing string constants for OrderReservationDocument.Status — same
/// pattern as StockMovementType / InventoryStatus.
/// </summary>
public static class OrderReservationStatus
{
    public const string Active = "Active";
    public const string Released = "Released";
    public const string Fulfilled = "Fulfilled";
    public const string Cancelled = "Cancelled";
}
