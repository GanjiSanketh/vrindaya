namespace Vrindaya.Api.DTOs.Homepage;

/// <summary>
/// Public read shape for the Vrindaya Story configuration (nested under
/// homepageConfig/active.vrindayaStory). Field names mirror the Firestore
/// document so there is no mapping ambiguity. Consumed by the admin
/// management screen (GET) and by the storefront (Firestore read).
/// </summary>
public class VrindayaStoryDto
{
    public List<VrindayaStoryItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>One brand-story beat as returned by the API.</summary>
public class VrindayaStoryItemDto
{
    public string StoryId { get; set; } = string.Empty;
    public string StoryNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string ImageAlt { get; set; } = string.Empty;
    public string ImagePosition { get; set; } = "center";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string StoragePath { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Full-state overwrite of the Vrindaya Story (idempotent PUT — the client
/// always sends the complete desired configuration). The server derives the
/// final displayOrder from array position when items are reordered.
/// </summary>
public class SaveVrindayaStoryRequest
{
    public List<SaveVrindayaStoryItemRequest> Items { get; set; } = new();
}

/// <summary>One brand-story beat in a save request.</summary>
public class SaveVrindayaStoryItemRequest
{
    public string StoryId { get; set; } = string.Empty;
    public string StoryNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string ImageAlt { get; set; } = string.Empty;
    public string ImagePosition { get; set; } = "center";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string StoragePath { get; set; } = string.Empty;
}

/// <summary>
/// Result of uploading one story image to storage. Returns the public URL
/// (stored in the item's imageUrl) plus the storage path (public id) so the
/// client can pass both back on save and clean up replaced assets.
/// </summary>
public class VrindayaStoryImageUploadResponse
{
    public string Url { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
}
