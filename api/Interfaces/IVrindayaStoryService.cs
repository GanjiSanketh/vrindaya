using Microsoft.AspNetCore.Http;
using Vrindaya.Api.DTOs.Homepage;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Single-responsibility facade for the CMS-driven Vrindaya Story. Owns the
/// vrindayaStory object nested inside the homepageConfig/active Firestore
/// document, the vrindaya-story/items Cloudinary folder convention, upload
/// validation (type + 10MB ceiling via the shared ImageUploadValidation),
/// and the delete-replaced-image cleanup on save. Public reads are cheap;
/// writes are admin-only at the controller layer.
/// </summary>
public interface IVrindayaStoryService
{
    /// <summary>Returns the brand story configuration, or null when none has ever been saved.</summary>
    Task<VrindayaStoryDto?> GetAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Overwrites the vrindayaStory object on homepageConfig/active (never
    /// creates a second one). Derives displayOrder from the request array,
    /// validates the object-position keywords, and preserves the original
    /// createdAt while stamping updatedAt and updatedBy.
    /// </summary>
    Task<VrindayaStoryDto> SaveAsync(SaveVrindayaStoryRequest request, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Validates and uploads one story image to storage, returning its public URL + storage path. Does not touch Firestore.</summary>
    Task<VrindayaStoryImageUploadResponse> UploadImageAsync(IFormFile file, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes a story image from storage by its storage path (Cloudinary
    /// public id). Only assets under the vrindaya-story/ folder prefix can
    /// be deleted — anything else is rejected.
    /// </summary>
    Task DeleteImageAsync(string storagePath, CancellationToken cancellationToken);
}
