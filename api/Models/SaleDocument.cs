using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class SaleDocument
{
    [FirestoreProperty("productId")]
    public string ProductId { get; set; } = string.Empty;

    [FirestoreProperty("productName")]
    public string ProductName { get; set; } = string.Empty;

    [FirestoreProperty("productImage")]
    public string? ProductImage { get; set; }

    [FirestoreProperty("variantId")]
    public string VariantId { get; set; } = string.Empty;

    [FirestoreProperty("colourName")]
    public string ColourName { get; set; } = string.Empty;

    [FirestoreProperty("category")]
    public string Category { get; set; } = string.Empty;

    [FirestoreProperty("size")]
    public string Size { get; set; } = string.Empty;

    [FirestoreProperty("quantity")]
    public int Quantity { get; set; }

    [FirestoreProperty("saleChannel")]
    public string SaleChannel { get; set; } = string.Empty;

    [FirestoreProperty("sellingPrice")]
    public double SellingPrice { get; set; }

    [FirestoreProperty("purchaseCost")]
    public double PurchaseCost { get; set; }

    [FirestoreProperty("packagingCost")]
    public double PackagingCost { get; set; }

    [FirestoreProperty("flipkartCommission")]
    public double FlipkartCommission { get; set; }

    [FirestoreProperty("shippingCharges")]
    public double ShippingCharges { get; set; }

    [FirestoreProperty("marketingCost")]
    public double MarketingCost { get; set; }

    [FirestoreProperty("otherCharges")]
    public double OtherCharges { get; set; }

    [FirestoreProperty("totalCost")]
    public double TotalCost { get; set; }

    [FirestoreProperty("amountReceived")]
    public double AmountReceived { get; set; }

    [FirestoreProperty("profit")]
    public double Profit { get; set; }

    [FirestoreProperty("paymentMethod")]
    public string PaymentMethod { get; set; } = string.Empty;

    [FirestoreProperty("customerName")]
    public string? CustomerName { get; set; }

    [FirestoreProperty("customerPhone")]
    public string? CustomerPhone { get; set; }

    [FirestoreProperty("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [FirestoreProperty("notes")]
    public string? Notes { get; set; }

    [FirestoreProperty("soldAt")]
    public DateTime SoldAt { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }
}
