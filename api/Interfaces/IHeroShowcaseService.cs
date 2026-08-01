using Microsoft.AspNetCore.Http;
using Vrindaya.Api.DTOs.Homepage;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Single-responsibility facade for the CMS-driven hero showcase. Owns the
/// heroShowcase object nested inside the homepageConfig/active Firestore
/// document, the hero-showcase/items Cloudinary folder convention, upload
/// validation (type + 10MB ceiling via the shared ImageUploadValidation),
/// and the delete-replaced-image cleanup on save. Public reads are cheap;
/// writes are admin-only at the controller layer.
/// </summary>
public interface IHeroShowcaseService
{
    /// <summary>Returns the hero showcase configuration, or null when none has ever been saved.</summary>
    Task<HeroShowcaseDto?> GetAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Overwrites the heroShowcase object on homepageConfig/active (never
    /// creates a second one). Derives displayOrder from the request array,
    /// enforces the 10-item ceiling and validates transition/interval.
    /// Preserves the original createdAt; stamps updatedAt and updatedBy.
    /// </summary>
    Task<HeroShowcaseDto> SaveAsync(SaveHeroShowcaseRequest request, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Validates and uploads one showcase item image to storage, returning its public URL + storage path. Does not touch Firestore.</summary>
    Task<HeroShowcaseImageUploadResponse> UploadImageAsync(IFormFile file, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes a showcase image from storage by its storage path
    /// (Cloudinary public id). Only assets under the hero-showcase/ folder
    /// prefix can be deleted — anything else is rejected.
    /// </summary>
    Task DeleteImageAsync(string storagePath, CancellationToken cancellationToken);
}
