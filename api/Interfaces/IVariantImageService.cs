namespace Vrindaya.Api.Interfaces;

public interface IVariantImageService
{
    Task<(string Url, string PublicId, int Width, int Height)> UploadImageAsync(string productId, string variantId, string slot, Stream stream, string? fileName, CancellationToken ct = default);
    Task DeleteImageAsync(string productId, string variantId, string publicId, CancellationToken ct = default);
}
