using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to the single "active" document in Firestore's heroBanners
/// collection. The homepage is deliberately managed as one configuration
/// record (only one active hero banner can exist) — every save overwrites
/// this document, it is never a list of banners.
/// </summary>
[FirestoreData]
public class HeroBannerDocument
{
    [FirestoreProperty("desktopImageUrl")]
    public string DesktopImageUrl { get; set; } = string.Empty;

    [FirestoreProperty("mobileImageUrl")]
    public string MobileImageUrl { get; set; } = string.Empty;

    /// <summary>Cloudinary public id for the desktop image (includes the hero-banners/desktop/ folder prefix). Used to delete/replace the stored asset.</summary>
    [FirestoreProperty("desktopStoragePath")]
    public string DesktopStoragePath { get; set; } = string.Empty;

    /// <summary>Cloudinary public id for the mobile image (includes the hero-banners/mobile/ folder prefix).</summary>
    [FirestoreProperty("mobileStoragePath")]
    public string MobileStoragePath { get; set; } = string.Empty;

    /// <summary>False = saved but not live; the storefront only shows the banner when this is true.</summary>
    [FirestoreProperty("isPublished")]
    public bool IsPublished { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;
}
