using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class VariantImageService : IVariantImageService
{
    private readonly ICloudinaryService _cloudinary;
    private readonly IImageCompressionService _compression;
    private readonly IProductVariantRepository _variantRepo;
    private readonly ILogger<VariantImageService> _logger;

    private static readonly HashSet<string> AllowedSlots = ["primary", "front", "back", "left", "right", "closeup", "gallery"];

    public VariantImageService(
        ICloudinaryService cloudinary,
        IImageCompressionService compression,
        IProductVariantRepository variantRepo,
        ILogger<VariantImageService> logger)
    {
        _cloudinary = cloudinary;
        _compression = compression;
        _variantRepo = variantRepo;
        _logger = logger;
    }

    public async Task<(string Url, string PublicId, int Width, int Height)> UploadImageAsync(
        string productId, string variantId, string slot,
        Stream stream, string? fileName, CancellationToken ct = default)
    {
        if (!AllowedSlots.Contains(slot))
            throw new ArgumentException($"Invalid image slot: '{slot}'. Allowed: {string.Join(", ", AllowedSlots)}");

        var compressed = await _compression.CompressAsync(stream, ct);
        var folder = $"products/{productId}/{variantId}";
        var imageName = fileName ?? $"{slot}_{Guid.NewGuid():N}";

        var result = await _cloudinary.UploadImageAsync(folder, compressed.Bytes, compressed.ContentType, compressed.Extension, imageName, ct);

        // After successful upload, delete the previous image in this slot (if any)
        await DeleteOldSlotImageAsync(productId, variantId, slot, ct);

        return (result.SecureUrl, result.PublicId, result.Width, result.Height);
    }

    /// <summary>Looks up the variant document and deletes any existing Cloudinary image for the given slot.</summary>
    private async Task DeleteOldSlotImageAsync(string productId, string variantId, string slot, CancellationToken ct)
    {
        try
        {
            var variantDocPath = $"products/{productId}/variants/{variantId}";
            var variant = await _variantRepo.GetVariantAsync(variantDocPath, ct);
            if (variant == null) return;

            var oldPublicId = GetSlotPublicId(variant.Images, slot);
            if (string.IsNullOrEmpty(oldPublicId)) return;

            await _cloudinary.DeleteImageAsync(oldPublicId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete old variant image for slot {Slot} of variant {VariantId}", slot, variantId);
        }
    }

    private static string? GetSlotPublicId(VariantImagesDocument images, string slot) => slot.ToLowerInvariant() switch
    {
        "primary" => images.Primary?.PublicId,
        "front"   => images.Front?.PublicId,
        "back"    => images.Back?.PublicId,
        "left"    => images.Left?.PublicId,
        "right"   => images.Right?.PublicId,
        "closeup" => images.Closeup?.PublicId,
        "gallery" => null, // individual gallery items handled separately
        _ => null,
    };

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
