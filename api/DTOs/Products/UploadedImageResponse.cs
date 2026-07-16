namespace Vrindaya.Api.DTOs.Products;

/// <summary>
/// Response for a single image upload. Deliberately has no Order/Slot —
/// final image order is decided entirely by the admin's drag-reorder in
/// Angular and sent as part of Images[] on Save (PUT/POST), not here.
/// </summary>
public class UploadedImageResponse
{
    public string Url { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;
}
