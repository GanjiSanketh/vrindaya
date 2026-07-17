using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's purchaseEntries collection — the
/// purchase HEADER only (auto-generated id). Line items live in their own
/// purchaseItems collection, each carrying this document's id as
/// PurchaseItemDocument.PurchaseEntryId — the same parent/child shape as
/// campaignExecutions/campaignRecipients, chosen so a purchase can carry an
/// unlimited number of items and so items are independently queryable (by
/// product, by supplier, by status) for inventory/statistics aggregation.
///
/// Editable (unlike the old embedded-items design) — see
/// InventoryManagementService.UpdatePurchaseAsync for how an edit reverses
/// this purchase's prior inventory impact (if it was Confirmed) and reapplies
/// the new one (if it's now Confirmed), keeping stock and average cost
/// correct across any sequence of edits/status changes.
/// </summary>
[FirestoreData]
public class PurchaseEntryDocument
{
    [FirestoreProperty("supplier")]
    public string Supplier { get; set; } = string.Empty;

    /// <summary>Nullable — see PurchaseItemDocument's doc comment on why this is optional.</summary>
    [FirestoreProperty("supplierId")]
    public string? SupplierId { get; set; }

    [FirestoreProperty("invoiceNumber")]
    public string InvoiceNumber { get; set; } = string.Empty;

    [FirestoreProperty("invoiceDate")]
    public DateTime InvoiceDate { get; set; }

    [FirestoreProperty("purchaseDate")]
    public DateTime PurchaseDate { get; set; }

    [FirestoreProperty("remarks")]
    public string? Remarks { get; set; }

    /// <summary>Draft | Confirmed | Cancelled — see Constants/PurchaseStatus.cs.</summary>
    [FirestoreProperty("status")]
    public string Status { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;
}
