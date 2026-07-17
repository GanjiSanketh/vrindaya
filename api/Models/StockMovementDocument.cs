using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's stockMovements collection — an
/// append-only ledger (one document per stock change, auto-generated id,
/// never updated/deleted), the same shape as CampaignRecipientDocument's
/// "one row per event under a parent id" pattern.
///
/// ReferenceType/ReferenceId are optional and exist purely for future
/// compatibility: a Purchase movement sets them to ("PurchaseEntry", the
/// new entry's id); once Order Management exists, a Sale/Return movement
/// can set them to ("Order", orderId) with zero schema change — see
/// Constants/StockMovementType.cs.
/// </summary>
[FirestoreData]
public class StockMovementDocument
{
    [FirestoreProperty("productId")]
    public string ProductId { get; set; } = string.Empty;

    /// <summary>Which variant of ProductId this movement affected — added once stock became per-(Product,Color,Size) rather than per-product.</summary>
    [FirestoreProperty("color")]
    public string? Color { get; set; }

    [FirestoreProperty("size")]
    public string? Size { get; set; }

    [FirestoreProperty("movementType")]
    public string MovementType { get; set; } = string.Empty;

    /// <summary>Always positive — direction is implied by MovementType, not the sign.</summary>
    [FirestoreProperty("quantity")]
    public long Quantity { get; set; }

    /// <summary>
    /// Signed — positive means stock increased, negative means it decreased.
    /// Added alongside Quantity because MovementType alone can't disambiguate
    /// direction for ManualAdjustment (used for both increases and decreases).
    /// Documents written before this field existed default to 0 and are
    /// excluded from trend calculations rather than guessed at.
    /// </summary>
    [FirestoreProperty("delta")]
    public long Delta { get; set; }

    [FirestoreProperty("reason")]
    public string? Reason { get; set; }

    [FirestoreProperty("referenceType")]
    public string? ReferenceType { get; set; }

    [FirestoreProperty("referenceId")]
    public string? ReferenceId { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    /// <summary>Precomputed lowercase tokens (product name, SKU, color, size, reason, movement type) — same denormalized-search-index pattern as ProductDocument/SupplierDocument.SearchKeywords, powers the Movement History screen's search box via array-contains-any.</summary>
    [FirestoreProperty("searchKeywords")]
    public List<string> SearchKeywords { get; set; } = [];
}
