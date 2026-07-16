using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>Maps to a document in Firestore's promotionalBanners collection — active ones are shown, ordered, on the homepage.</summary>
[FirestoreData]
public class PromotionalBannerDocument
{
    [FirestoreProperty("desktopImageUrl")]
    public string DesktopImageUrl { get; set; } = string.Empty;

    [FirestoreProperty("desktopImagePublicId")]
    public string DesktopImagePublicId { get; set; } = string.Empty;

    [FirestoreProperty("mobileImageUrl")]
    public string? MobileImageUrl { get; set; }

    [FirestoreProperty("mobileImagePublicId")]
    public string? MobileImagePublicId { get; set; }

    [FirestoreProperty("buttonText")]
    public string? ButtonText { get; set; }

    [FirestoreProperty("buttonUrl")]
    public string? ButtonUrl { get; set; }

    [FirestoreProperty("displayOrder")]
    public long DisplayOrder { get; set; }

    [FirestoreProperty("active")]
    public bool Active { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
