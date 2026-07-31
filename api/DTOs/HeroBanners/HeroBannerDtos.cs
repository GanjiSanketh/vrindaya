namespace Vrindaya.Api.DTOs.HeroBanners;

/// <summary>
/// Public read shape for the active hero banner. Consumed by both the
/// admin management page (GET) and — when the storefront needs an
/// API-backed read — any public client. Field names mirror the Firestore
/// document so there is no mapping ambiguity.
/// </summary>
public class HeroBannerDto
{
    public string DesktopImageUrl { get; set; } = string.Empty;
    public string MobileImageUrl { get; set; } = string.Empty;
    public string DesktopStoragePath { get; set; } = string.Empty;
    public string MobileStoragePath { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>
/// Full-state overwrite of the active banner. The client always sends the
/// complete desired state (idempotent PUT); <see cref="IsPublished"/>
/// controls whether the storefront starts rendering it.
/// </summary>
public class SaveHeroBannerRequest
{
    public string DesktopImageUrl { get; set; } = string.Empty;
    public string MobileImageUrl { get; set; } = string.Empty;
    public string DesktopStoragePath { get; set; } = string.Empty;
    public string MobileStoragePath { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
}

/// <summary>
/// Result of uploading one banner image to storage. Returns the public URL
/// (stored in Firestore metadata) plus the storage path (public id) so the
/// client can pass both back on save and clean up replaced assets.
/// </summary>
public class HeroBannerImageUploadResponse
{
    public string Url { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
}
