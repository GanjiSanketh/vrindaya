using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class ProductVariantDocument
{
    [FirestoreProperty("colourName")]
    public string ColourName { get; set; } = string.Empty;

    [FirestoreProperty("colourHex")]
    public string? ColourHex { get; set; }

    [FirestoreProperty("sku")]
    public string Sku { get; set; } = string.Empty;

    [FirestoreProperty("sellingPrice")]
    public double? SellingPrice { get; set; }

    [FirestoreProperty("mrp")]
    public double? Mrp { get; set; }

    [FirestoreProperty("purchaseCost")]
    public double? PurchaseCost { get; set; }

    [FirestoreProperty("packagingCost")]
    public double? PackagingCost { get; set; }

    [FirestoreProperty("flipkartCommission")]
    public double? FlipkartCommission { get; set; }

    [FirestoreProperty("shippingCharges")]
    public double? ShippingCharges { get; set; }

    [FirestoreProperty("marketingCost")]
    public double? MarketingCost { get; set; }

    [FirestoreProperty("otherCharges")]
    public double? OtherCharges { get; set; }

    [FirestoreProperty("desiredProfit")]
    public double? DesiredProfit { get; set; }

    [FirestoreProperty("flipkartUrl")]
    public string? FlipkartUrl { get; set; }

    [FirestoreProperty("displayOrder")]
    public int DisplayOrder { get; set; }

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; } = true;

    [FirestoreProperty("isFeatured")]
    public bool IsFeatured { get; set; }

    [FirestoreProperty("isBestSeller")]
    public bool IsBestSeller { get; set; }

    [FirestoreProperty("isNewArrival")]
    public bool IsNewArrival { get; set; }

    [FirestoreProperty("images")]
    public VariantImagesDocument Images { get; set; } = new();

    [FirestoreProperty("sizes")]
    public List<VariantSizeDocument> Sizes { get; set; } = [];

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[FirestoreData]
public class VariantImagesDocument
{
    [FirestoreProperty("primary")]
    public VariantImageSlotDocument? Primary { get; set; }

    [FirestoreProperty("front")]
    public VariantImageSlotDocument? Front { get; set; }

    [FirestoreProperty("back")]
    public VariantImageSlotDocument? Back { get; set; }

    [FirestoreProperty("left")]
    public VariantImageSlotDocument? Left { get; set; }

    [FirestoreProperty("right")]
    public VariantImageSlotDocument? Right { get; set; }

    [FirestoreProperty("closeup")]
    public VariantImageSlotDocument? Closeup { get; set; }

    [FirestoreProperty("gallery")]
    public List<VariantImageSlotDocument> Gallery { get; set; } = [];
}

[FirestoreData]
public class VariantImageSlotDocument
{
    [FirestoreProperty("url")]
    public string Url { get; set; } = string.Empty;

    [FirestoreProperty("publicId")]
    public string PublicId { get; set; } = string.Empty;

    [FirestoreProperty("width")]
    public int Width { get; set; }

    [FirestoreProperty("height")]
    public int Height { get; set; }

    [FirestoreProperty("alt")]
    public string? Alt { get; set; }
}

[FirestoreData]
public class VariantSizeDocument
{
    [FirestoreProperty("size")]
    public string Size { get; set; } = string.Empty;

    [FirestoreProperty("stock")]
    public long Stock { get; set; }
}
