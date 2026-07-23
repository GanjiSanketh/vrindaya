namespace Vrindaya.Api.DTOs.Products;

public class UploadedImageResponse
{
    public string Url { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
}
