using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to the nested <c>heroShowcase</c> object inside the single
/// "active" document of the homepageConfig collection. The homepage is
/// managed as one configuration record (homepageConfig/active) that will
/// grow more sections over time; heroShowcase owns the whole CMS-driven
/// hero — global behaviour (enable/autoplay/pause-on-hover/rotation
/// interval/transition) plus an ordered list of showcase items.
/// </summary>
[FirestoreData]
public class HeroShowcaseDocument
{
    /// <summary>Master switch — when false the storefront falls back to the legacy Hero Banner.</summary>
    [FirestoreProperty("enabled")]
    public bool Enabled { get; set; }

    /// <summary>Whether the storefront auto-rotates through enabled items.</summary>
    [FirestoreProperty("autoplay")]
    public bool Autoplay { get; set; }

    /// <summary>Whether auto-rotation pauses while the pointer is over the showcase.</summary>
    [FirestoreProperty("pauseOnHover")]
    public bool PauseOnHover { get; set; }

    /// <summary>Seconds per slide. Read from Firestore by the storefront — never hardcoded.</summary>
    [FirestoreProperty("rotationIntervalSeconds")]
    public int RotationIntervalSeconds { get; set; } = 8;

    /// <summary>Transition flavour: "fade" (implemented), "slide"/"scaleFade" reserved for the future.</summary>
    [FirestoreProperty("transition")]
    public string Transition { get; set; } = "fade";

    /// <summary>Ordered showcase items (1..10). Order follows DisplayOrder, kept in sync by drag-and-drop.</summary>
    [FirestoreProperty("items")]
    public List<HeroShowcaseItemDocument> Items { get; set; } = new();

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>One configurable slide in the hero showcase (nested map inside heroShowcase.items).</summary>
[FirestoreData]
public class HeroShowcaseItemDocument
{
    /// <summary>Stable client-generated id used as the Angular track key.</summary>
    [FirestoreProperty("itemId")]
    public string ItemId { get; set; } = string.Empty;

    /// <summary>Cloudinary secure URL of the showcase image.</summary>
    [FirestoreProperty("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>Cloudinary public id (hero-showcase/items/...) — used to delete/replace the stored asset.</summary>
    [FirestoreProperty("storagePath")]
    public string StoragePath { get; set; } = string.Empty;

    /// <summary>Optional Cloudinary URL for small screens — fashion imagery often needs a tighter crop.</summary>
    [FirestoreProperty("mobileImageUrl")]
    public string MobileImageUrl { get; set; } = string.Empty;

    /// <summary>Cloudinary public id of the mobile image — used to delete/replace the stored asset.</summary>
    [FirestoreProperty("mobileStoragePath")]
    public string MobileStoragePath { get; set; } = string.Empty;

    /// <summary>CSS object-position keyword: "top" | "center" | "bottom" | "left" | "right". Drives where the model sits in the hero frame.</summary>
    [FirestoreProperty("imagePosition")]
    public string ImagePosition { get; set; } = "center";

    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty("subtitle")]
    public string Subtitle { get; set; } = string.Empty;

    [FirestoreProperty("buttonText")]
    public string ButtonText { get; set; } = string.Empty;

    [FirestoreProperty("buttonLink")]
    public string ButtonLink { get; set; } = string.Empty;

    /// <summary>1-based position within the showcase; reassigned on every drag-and-drop reorder.</summary>
    [FirestoreProperty("displayOrder")]
    public int DisplayOrder { get; set; }

    /// <summary>Disabled items are kept in the list but never rendered by the storefront.</summary>
    [FirestoreProperty("enabled")]
    public bool Enabled { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
