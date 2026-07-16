using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's heroBanners collection. Multiple
/// banners can exist for scheduling (Start/End Date) — the public homepage
/// always renders exactly one: the lowest-DisplayOrder banner that is
/// Active and currently within its date range (see HomepageService).
/// </summary>
[FirestoreData]
public class HeroBannerDocument
{
    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty("subtitle")]
    public string? Subtitle { get; set; }

    [FirestoreProperty("buttonText")]
    public string? ButtonText { get; set; }

    [FirestoreProperty("buttonUrl")]
    public string? ButtonUrl { get; set; }

    [FirestoreProperty("backgroundImageUrl")]
    public string BackgroundImageUrl { get; set; } = string.Empty;

    [FirestoreProperty("backgroundImagePublicId")]
    public string BackgroundImagePublicId { get; set; } = string.Empty;

    [FirestoreProperty("mobileImageUrl")]
    public string? MobileImageUrl { get; set; }

    [FirestoreProperty("mobileImagePublicId")]
    public string? MobileImagePublicId { get; set; }

    [FirestoreProperty("displayOrder")]
    public long DisplayOrder { get; set; }

    [FirestoreProperty("startDate")]
    public DateTime? StartDate { get; set; }

    [FirestoreProperty("endDate")]
    public DateTime? EndDate { get; set; }

    [FirestoreProperty("active")]
    public bool Active { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
