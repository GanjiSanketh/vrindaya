using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's suppliers collection — auto-generated
/// doc id (no natural key candidate exists, same reasoning as
/// ProductDocument). SupplierCode ("SUP-000001", ...) is a separate,
/// human-facing sequential identifier generated once at creation via
/// SupplierRepository.GenerateNextSupplierCodeAsync (the codebase's one use
/// of a Firestore transaction — see that method's doc comment for why).
/// SearchKeywords mirrors ProductDocument's precomputed lowercase-token
/// array, powering the Supplier List's search box via array-contains-any.
/// </summary>
[FirestoreData]
public class SupplierDocument
{
    [FirestoreProperty("supplierCode")]
    public string SupplierCode { get; set; } = string.Empty;

    [FirestoreProperty("companyName")]
    public string CompanyName { get; set; } = string.Empty;

    [FirestoreProperty("contactPerson")]
    public string? ContactPerson { get; set; }

    [FirestoreProperty("phone")]
    public string? Phone { get; set; }

    [FirestoreProperty("alternatePhone")]
    public string? AlternatePhone { get; set; }

    [FirestoreProperty("email")]
    public string? Email { get; set; }

    [FirestoreProperty("gstin")]
    public string? Gstin { get; set; }

    [FirestoreProperty("pan")]
    public string? Pan { get; set; }

    [FirestoreProperty("address")]
    public string? Address { get; set; }

    [FirestoreProperty("city")]
    public string? City { get; set; }

    [FirestoreProperty("state")]
    public string? State { get; set; }

    [FirestoreProperty("country")]
    public string? Country { get; set; }

    [FirestoreProperty("pincode")]
    public string? Pincode { get; set; }

    [FirestoreProperty("bankDetails")]
    public string? BankDetails { get; set; }

    [FirestoreProperty("paymentTerms")]
    public string? PaymentTerms { get; set; }

    [FirestoreProperty("notes")]
    public string? Notes { get; set; }

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; }

    /// <summary>Precomputed lowercase tokens (company name, contact person, phone, email, GSTIN, supplier code) — same denormalized-search-index pattern as ProductDocument.SearchKeywords.</summary>
    [FirestoreProperty("searchKeywords")]
    public List<string> SearchKeywords { get; set; } = [];

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
