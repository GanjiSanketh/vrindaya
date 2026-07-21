using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Products;

public class VariantImageService : IVariantImageService
{
    private readonly ICloudinaryService _cloudinary;
    private readonly IImageCompressionService _compression;
    private readonly ILogger<VariantImageService> _logger;

    private static readonly HashSet<string> AllowedSlots = ["primary", "front", "back", "left", "right", "closeup", "gallery"];

    public VariantImageService(
        ICloudinaryService cloudinary,
        IImageCompressionService compression,
        ILogger<VariantImageService> logger)
    {
        _cloudinary = cloudinary;
        _compression = compression;
        _logger = logger;
    }

    public async Task<(string Url, string PublicId)> UploadImageAsync(
        string productId, string variantId, string slot,
        Stream stream, string? fileName, CancellationToken ct = default)
    {
        if (!AllowedSlots.Contains(slot))
            throw new ArgumentException($"Invalid image slot: '{slot}'. Allowed: {string.Join(", ", AllowedSlots)}");

        var compressed = await _compression.CompressAsync(stream, ct);
        var folder = $"products/{productId}/{variantId}";
        var imageName = fileName ?? $"{slot}_{Guid.NewGuid():N}";

        var result = await _cloudinary.UploadImageAsync(folder, compressed.Bytes, compressed.ContentType, compressed.Extension, imageName, ct);
        return (result.SecureUrl, result.PublicId);
    }

    public async Task DeleteImageAsync(string productId, string variantId, string publicId, CancellationToken ct = default)
    {
        var expectedPrefix = $"products/{productId}/{variantId}/";
        if (!publicId.StartsWith(expectedPrefix, StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "Rejected delete request for public ID outside variant's folder. VariantId: {VariantId}, PublicId: {PublicId}",
                variantId, publicId);
            throw new InvalidOperationException("The given image does not belong to this variant.");
        }

        await _cloudinary.DeleteImageAsync(publicId, ct);
    }
}
