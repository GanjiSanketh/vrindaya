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
    public string? Primary { get; set; }

    [FirestoreProperty("front")]
    public string? Front { get; set; }

    [FirestoreProperty("back")]
    public string? Back { get; set; }

    [FirestoreProperty("left")]
    public string? Left { get; set; }

    [FirestoreProperty("right")]
    public string? Right { get; set; }

    [FirestoreProperty("closeup")]
    public string? Closeup { get; set; }

    [FirestoreProperty("gallery")]
    public List<string> Gallery { get; set; } = [];
}

[FirestoreData]
public class VariantSizeDocument
{
    [FirestoreProperty("size")]
    public string Size { get; set; } = string.Empty;

    [FirestoreProperty("stock")]
    public long Stock { get; set; }
}
