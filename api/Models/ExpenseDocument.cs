using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class ExpenseDocument
{
    [FirestoreProperty("expenseNumber")]
    public string ExpenseNumber { get; set; } = string.Empty;

    [FirestoreProperty("expenseCategory")]
    public string ExpenseCategory { get; set; } = string.Empty;

    [FirestoreProperty("expenseType")]
    public string ExpenseType { get; set; } = string.Empty;

    [FirestoreProperty("vendor")]
    public string? Vendor { get; set; }

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("amount")]
    public double Amount { get; set; }

    [FirestoreProperty("gst")]
    public double Gst { get; set; }

    [FirestoreProperty("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [FirestoreProperty("referenceNumber")]
    public string? ReferenceNumber { get; set; }

    [FirestoreProperty("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [FirestoreProperty("expenseDate")]
    public DateTime ExpenseDate { get; set; }

    [FirestoreProperty("paymentStatus")]
    public string PaymentStatus { get; set; } = Constants.ExpensePaymentStatus.Paid;

    [FirestoreProperty("notes")]
    public string? Notes { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("searchKeywords")]
    public List<string> SearchKeywords { get; set; } = [];
}
