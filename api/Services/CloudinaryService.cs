using System.Diagnostics;
using System.Text.RegularExpressions;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using CloudinaryImageUploadResult = CloudinaryDotNet.Actions.ImageUploadResult;
using ImageUploadResult = Vrindaya.Api.Models.ImageUploadResult;

namespace Vrindaya.Api.Services;

/// <summary>
/// Wraps one shared CloudinaryDotNet client (built once in the constructor,
/// never per-request — see ICloudinaryService's doc comment) and owns every
/// raw Cloudinary call (upload/replace/delete/list) plus the app-wide
/// upload convention: fetch_format=auto + quality=auto on every delivery
/// URL, Overwrite always false with a generated-unique public id, every
/// upload signed server-side with the API Secret (never unsigned/client-side).
/// </summary>
public partial class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;
    private readonly ILogger<CloudinaryService> _logger;

    public CloudinaryService(IOptions<CloudinaryOptions> options, ILogger<CloudinaryService> logger)
    {
        _logger = logger;
        var opts = options.Value;

        if (string.IsNullOrWhiteSpace(opts.CloudName) ||
            string.IsNullOrWhiteSpace(opts.ApiKey) ||
            string.IsNullOrWhiteSpace(opts.ApiSecret))
        {
            _logger.LogError(
                "Cloudinary configuration is missing. CloudName Present: {CloudNamePresent}, ApiKey Present: {ApiKeyPresent}, ApiSecret Present: {ApiSecretPresent}",
                !string.IsNullOrWhiteSpace(opts.CloudName),
                !string.IsNullOrWhiteSpace(opts.ApiKey),
                !string.IsNullOrWhiteSpace(opts.ApiSecret));
            throw new InvalidOperationException(
                "Cloudinary configuration is missing. Configure appsettings.Development.json for local development or Render Environment Variables for production.");
        }

        _logger.LogInformation(
            "Cloudinary configuration loaded. Cloud Name: {CloudName}, API Key Present: {ApiKeyPresent}, API Secret Present: {ApiSecretPresent}",
            opts.CloudName,
            !string.IsNullOrWhiteSpace(opts.ApiKey),
            !string.IsNullOrWhiteSpace(opts.ApiSecret));

        var account = new Account(opts.CloudName, opts.ApiKey, opts.ApiSecret);
        _cloudinary = new Cloudinary(account);
        _cloudinary.Api.Secure = true;
    }

    public async Task<ImageUploadResult> UploadImageAsync(
        string folder, byte[] bytes, string contentType, string extension, string? fileName, CancellationToken cancellationToken)
    {
        var displayName = SanitizeFileName(fileName) ?? Guid.NewGuid().ToString("N");
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation(
            "Uploading image to Cloudinary. Folder: {Folder}, FileName: {FileName}, SizeBytes: {SizeBytes}, ContentType: {ContentType}",
            folder, displayName, bytes.Length, contentType);

        try
        {
            using var stream = new MemoryStream(bytes);
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription($"{displayName}.{extension}", stream),
                Folder = folder,
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false,
                Transformation = new Transformation().FetchFormat("auto").Quality("auto"),
            };

            var result = await _cloudinary.UploadAsync(uploadParams, cancellationToken);
            ThrowIfFailed(result, "upload", folder);

            stopwatch.Stop();
            _logger.LogInformation(
                "Uploaded image to Cloudinary. Folder: {Folder}, PublicId: {PublicId}, DurationMs: {DurationMs}",
                folder, result.PublicId, stopwatch.ElapsedMilliseconds);

            return Map(result);
        }
        catch (Exception ex) when (ex is not ImageStorageException)
        {
            _logger.LogError(ex, "Failed to upload image to Cloudinary. Folder: {Folder}, FileName: {FileName}, DurationMs: {DurationMs}", folder, displayName, stopwatch.ElapsedMilliseconds);
            throw new ImageStorageException("Failed to upload image.", ex);
        }
    }

    public async Task<List<ImageUploadResult>> UploadMultipleImagesAsync(
        string folder, IReadOnlyList<(byte[] Bytes, string ContentType, string Extension, string? FileName)> files, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Uploading {Count} image(s) to Cloudinary. Folder: {Folder}", files.Count, folder);

        var uploads = files.Select(f => UploadImageAsync(folder, f.Bytes, f.ContentType, f.Extension, f.FileName, cancellationToken));
        var results = await Task.WhenAll(uploads);

        _logger.LogInformation("Uploaded {Count} image(s) to Cloudinary. Folder: {Folder}", results.Length, folder);
        return results.ToList();
    }

    public async Task DeleteImageAsync(string publicId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            return;
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var result = await _cloudinary.DestroyAsync(new DeletionParams(publicId));
            stopwatch.Stop();

            if (string.Equals(result.Result, "not found", StringComparison.OrdinalIgnoreCase))
            {
                // Already deleted / never existed — idempotent from the caller's perspective.
                _logger.LogWarning("Delete requested for a Cloudinary asset that no longer exists. PublicId: {PublicId}", publicId);
                return;
            }

            if (!string.Equals(result.Result, "ok", StringComparison.OrdinalIgnoreCase))
            {
                throw new ImageStorageException($"Cloudinary delete returned an unexpected result: {result.Result}");
            }

            _logger.LogInformation("Deleted image from Cloudinary. PublicId: {PublicId}, DurationMs: {DurationMs}", publicId, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex) when (ex is not ImageStorageException)
        {
            _logger.LogError(ex, "Failed to delete image from Cloudinary. PublicId: {PublicId}, DurationMs: {DurationMs}", publicId, stopwatch.ElapsedMilliseconds);
            throw new ImageStorageException("Failed to delete image.", ex);
        }
    }

    public async Task<ImageUploadResult> ReplaceImageAsync(
        string folder, string? existingPublicId, byte[] bytes, string contentType, string extension, string? fileName, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Replacing image on Cloudinary. Folder: {Folder}, ExistingPublicId: {ExistingPublicId}", folder, existingPublicId ?? "(none)");

        if (!string.IsNullOrWhiteSpace(existingPublicId))
        {
            await DeleteImageAsync(existingPublicId, cancellationToken);
        }

        return await UploadImageAsync(folder, bytes, contentType, extension, fileName, cancellationToken);
    }

    public async Task<ImageUploadResult> UploadFromUrlAsync(string folder, string sourceUrl, string? fileName, CancellationToken cancellationToken)
    {
        var displayName = SanitizeFileName(fileName) ?? Guid.NewGuid().ToString("N");
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation("Uploading image to Cloudinary from remote URL. Folder: {Folder}, FileName: {FileName}", folder, displayName);

        try
        {
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(displayName, sourceUrl),
                Folder = folder,
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false,
                Transformation = new Transformation().FetchFormat("auto").Quality("auto"),
            };

            var result = await _cloudinary.UploadAsync(uploadParams, cancellationToken);
            ThrowIfFailed(result, "remote-fetch upload", folder);

            stopwatch.Stop();
            _logger.LogInformation(
                "Uploaded image to Cloudinary from remote URL. Folder: {Folder}, PublicId: {PublicId}, DurationMs: {DurationMs}",
                folder, result.PublicId, stopwatch.ElapsedMilliseconds);

            return Map(result);
        }
        catch (Exception ex) when (ex is not ImageStorageException)
        {
            _logger.LogError(ex, "Failed to upload image to Cloudinary from remote URL. Folder: {Folder}, DurationMs: {DurationMs}", folder, stopwatch.ElapsedMilliseconds);
            throw new ImageStorageException("Failed to duplicate image.", ex);
        }
    }

    public async Task<List<string>> ListPublicIdsAsync(string folder, CancellationToken cancellationToken)
    {
        var prefix = folder.EndsWith('/') ? folder : $"{folder}/";
        var publicIds = new List<string>();
        string? nextCursor = null;

        try
        {
            do
            {
                var page = await _cloudinary.ListResourcesByPrefixAsync(prefix, "upload", nextCursor, cancellationToken);
                if (page.Error != null)
                {
                    throw new ImageStorageException($"Cloudinary list failed: {page.Error.Message}");
                }

                publicIds.AddRange(page.Resources.Select(r => r.PublicId));
                nextCursor = page.NextCursor;
            }
            while (!string.IsNullOrEmpty(nextCursor));
        }
        catch (Exception ex) when (ex is not ImageStorageException)
        {
            _logger.LogError(ex, "Failed to list Cloudinary assets. Folder: {Folder}", folder);
            throw new ImageStorageException("Failed to list images.", ex);
        }

        return publicIds;
    }

    private static void ThrowIfFailed(RawUploadResult result, string operation, string folder)
    {
        if (result.Error != null)
        {
            throw new ImageStorageException($"Cloudinary {operation} failed for folder '{folder}': {result.Error.Message}");
        }
    }

    private static ImageUploadResult Map(CloudinaryImageUploadResult result) => new()
    {
        Url = result.Url?.ToString() ?? string.Empty,
        SecureUrl = result.SecureUrl?.ToString() ?? string.Empty,
        PublicId = result.PublicId,
        Width = result.Width,
        Height = result.Height,
        Bytes = result.Bytes,
        Format = result.Format,
    };

    /// <summary>A caller-supplied name becomes the human-readable base of the generated public id, so it must never contain '/', '..', or anything else that could escape the intended folder — only letters, digits, hyphens, and underscores pass through unchanged. Anything else (including null/empty/all-invalid input) falls back to null, which the caller turns into a GUID.</summary>
    private static string? SanitizeFileName(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return null;
        }

        var cleaned = NonAlphanumericPattern().Replace(fileName.Trim(), string.Empty);
        return cleaned.Length == 0 ? null : cleaned;
    }

    [GeneratedRegex(@"[^a-zA-Z0-9\-_]")]
    private static partial Regex NonAlphanumericPattern();
}
