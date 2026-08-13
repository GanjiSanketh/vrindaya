namespace Vrindaya.Api.DTOs.Homepage;

/// <summary>
/// Public read shape for the hero showcase configuration (nested under
/// homepageConfig/active.heroShowcase). Field names mirror the Firestore
/// document so there is no mapping ambiguity. Consumed by the admin
/// management screen (GET) and available to any public client.
/// </summary>
public class HeroShowcaseDto
{
    public bool Enabled { get; set; }
    public bool Autoplay { get; set; }
    public bool PauseOnHover { get; set; }
    public int RotationIntervalSeconds { get; set; } = 8;
    public string Transition { get; set; } = "fade";
    public List<HeroShowcaseItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>One showcase slide as returned by the API.</summary>
public class HeroShowcaseItemDto
{
    public string ItemId { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string MobileImageUrl { get; set; } = string.Empty;
    public string MobileStoragePath { get; set; } = string.Empty;
    public string ImagePosition { get; set; } = "center";
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string ButtonText { get; set; } = string.Empty;
    public string ButtonLink { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool Enabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Full-state overwrite of the hero showcase (idempotent PUT — the client
/// always sends the complete desired configuration). The server derives the
/// final displayOrder from array position when items are reordered.
/// </summary>
public class SaveHeroShowcaseRequest
{
    public bool Enabled { get; set; }
    public bool Autoplay { get; set; }
    public bool PauseOnHover { get; set; }
    public int RotationIntervalSeconds { get; set; } = 8;
    public string Transition { get; set; } = "fade";
    public List<SaveHeroShowcaseItemRequest> Items { get; set; } = new();
}

/// <summary>One showcase slide in a save request.</summary>
public class SaveHeroShowcaseItemRequest
{
    public string ItemId { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string MobileImageUrl { get; set; } = string.Empty;
    public string MobileStoragePath { get; set; } = string.Empty;
    public string ImagePosition { get; set; } = "center";
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string ButtonText { get; set; } = string.Empty;
    public string ButtonLink { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool Enabled { get; set; }
}

/// <summary>
/// Result of uploading one showcase image to storage. Returns the public
/// URL (stored in the item's imageUrl) plus the storage path (public id)
/// so the client can pass both back on save and clean up replaced assets.
/// </summary>
public class HeroShowcaseImageUploadResponse
{
    public string Url { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
}
