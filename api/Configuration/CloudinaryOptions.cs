namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "Cloudinary" configuration section. Real
/// values are supplied via environment variables (Cloudinary__CloudName,
/// Cloudinary__ApiKey, Cloudinary__ApiSecret — see
/// docs/setup/environment-variables.md), never committed to appsettings.*.json.
/// ApiSecret must never be logged or returned in any API response —
/// CloudinaryService/ImageStorageException are the only places that touch it.
/// </summary>
public class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";

    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
}
