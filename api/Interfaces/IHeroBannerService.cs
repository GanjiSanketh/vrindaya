using Microsoft.AspNetCore.Http;
using Vrindaya.Api.DTOs.HeroBanners;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Single-responsibility facade for the homepage hero banner. Owns the
/// heroBanners/active Firestore document, the hero-banners/* Cloudinary
/// folder convention, upload validation (type + 10MB ceiling), and the
/// delete-replaced-image cleanup on save. Public reads are cheap; writes
/// are admin-only at the controller layer.
/// </summary>
public interface IHeroBannerService
{
    /// <summary>Returns the active banner, or null when none has ever been saved.</summary>
    Task<HeroBannerDto?> GetActiveAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Overwrites the active banner document (never creates a second one).
    /// Preserves the original createdAt; stamps updatedAt and updatedBy.
    /// <paramref name="updatedBy"/> is the authenticated admin's email.
    /// </summary>
    Task<HeroBannerDto> SaveAsync(SaveHeroBannerRequest request, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Validates and uploads a desktop banner image to storage, returning its public URL + storage path. Does not touch Firestore.</summary>
    Task<HeroBannerImageUploadResponse> UploadDesktopImageAsync(IFormFile file, CancellationToken cancellationToken);

    /// <summary>Validates and uploads a mobile banner image to storage, returning its public URL + storage path. Does not touch Firestore.</summary>
    Task<HeroBannerImageUploadResponse> UploadMobileImageAsync(IFormFile file, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes a hero-banner image from storage by its storage path
    /// (Cloudinary public id). Only assets under the hero-banners/ folder
    /// prefix can be deleted — anything else is rejected.
    /// </summary>
    Task DeleteImageAsync(string storagePath, CancellationToken cancellationToken);
}
