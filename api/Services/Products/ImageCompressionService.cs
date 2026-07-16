using SkiaSharp;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Products;

/// <summary>
/// Longest edge capped at 1600px preserving aspect ratio, WebP at quality
/// 82. Max input size is 5MB per the Phase 3 spec (jpg/jpeg/png/webp only —
/// content-type is checked at the controller, before this is ever called).
/// </summary>
public class ImageCompressionService : IImageCompressionService
{
    private const int MaxDimension = 1600;
    private const int WebpQuality = 82;
    private const long MaxInputBytes = 5 * 1024 * 1024;

    public Task<CompressedImageResult> CompressAsync(Stream input, CancellationToken cancellationToken)
    {
        if (input.CanSeek && input.Length > MaxInputBytes)
        {
            throw new InvalidOperationException("Image is too large (max 5 MB).");
        }

        using var bitmap = SKBitmap.Decode(input) ?? throw new InvalidOperationException("Could not read image file. Please choose a JPG, PNG, or WebP image.");

        var (width, height) = TargetSize(bitmap.Width, bitmap.Height);
        using var resized = bitmap.Resize(new SKImageInfo(width, height), new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.None))
            ?? throw new InvalidOperationException("Could not process image.");

        using var image = SKImage.FromBitmap(resized);
        using var data = image.Encode(SKEncodedImageFormat.Webp, WebpQuality);

        return Task.FromResult(new CompressedImageResult(data.ToArray(), "image/webp", "webp"));
    }

    private static (int Width, int Height) TargetSize(int width, int height)
    {
        var scale = Math.Min(1.0, (double)MaxDimension / Math.Max(width, height));
        return ((int)Math.Round(width * scale), (int)Math.Round(height * scale));
    }
}
