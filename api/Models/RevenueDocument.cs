using Google.Cloud.Firestore;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class RevenueDocument
{
    [FirestoreProperty("revenueNumber")]
    public string RevenueNumber { get; set; } = string.Empty;

    [FirestoreProperty("source")]
    public string Source { get; set; } = string.Empty;

    [FirestoreProperty("amount")]
    public double Amount { get; set; }

    [FirestoreProperty("reference")]
    public string? Reference { get; set; }

    [FirestoreProperty("settlementDate")]
    public DateTime SettlementDate { get; set; }

    [FirestoreProperty("expectedSettlement")]
    public double ExpectedSettlement { get; set; }

    [FirestoreProperty("actualSettlement")]
    public double? ActualSettlement { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = RevenueStatus.Pending;

    [FirestoreProperty("productId")]
    public string? ProductId { get; set; }

    [FirestoreProperty("productName")]
    public string? ProductName { get; set; }

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
