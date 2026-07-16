namespace Vrindaya.Api.Models;

/// <summary>
/// The outcome of any ICloudinaryService upload/replace call — every
/// caller (ProductStorageService, HomepageStorageService, and any future
/// CMS module) maps this into its own feature-specific response shape;
/// nothing here is Firestore- or Cloudinary-SDK-specific beyond the field
/// names Cloudinary itself uses.
/// </summary>
public class ImageUploadResult
{
    public string Url { get; set; } = string.Empty;
    public string SecureUrl { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public long Bytes { get; set; }
    public string Format { get; set; } = string.Empty;
}
