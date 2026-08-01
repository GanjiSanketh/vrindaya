using Microsoft.AspNetCore.Http;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Helpers;

/// <summary>
/// The shared image-upload rules every CMS module applies before handing
/// bytes to ICloudinaryService (Hero Showcase today; Hero Banner,
/// Categories and Products each had their own private copy of the same
/// three checks). Centralising it means new modules never re-implement
/// upload validation — the Cloudinary plumbing itself stays in the single
/// ICloudinaryService, and per-feature services keep their own folder
/// convention + size ceiling.
/// </summary>
public static class ImageUploadValidation
{
    /// <summary>Throws a 400 unless the file is present, a JPG/PNG/WebP, and under <paramref name="maxBytes"/>.</summary>
    public static void Validate(IFormFile? file, long maxBytes)
    {
        if (file is null || file.Length == 0)
        {
            throw new RequestValidationException("An image file is required.");
        }

        if (!AppConstants.AllowedImageContentTypes.Contains(file.ContentType))
        {
            throw new RequestValidationException("Only JPG, JPEG, PNG, or WebP images are accepted.");
        }

        if (file.Length > maxBytes)
        {
            throw new RequestValidationException($"Image is too large (max {maxBytes / (1024 * 1024)} MB).");
        }
    }

    /// <summary>Buffers an IFormFile into memory — callers that need raw bytes to hand to Cloudinary.</summary>
    public static async Task<byte[]> ReadAllBytesAsync(IFormFile file, CancellationToken cancellationToken)
    {
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        return stream.ToArray();
    }
}
