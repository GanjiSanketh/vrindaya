using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's categories collection — id is the
/// existing slug (long-kurtas, etc.), matching Product.Category's
/// vocabulary exactly. Evolved from a static in-memory list (Phase 4) so
/// admin can reorder/hide/edit categories without a code deploy.
/// </summary>
[FirestoreData]
public class CategoryDocument
{
    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Short code used in auto-generated SKUs (e.g. "LKT" for Long Kurtas). Unique across categories.</summary>
    [FirestoreProperty("code")]
    public string? Code { get; set; }

    [FirestoreProperty("subtitle")]
    public string? Subtitle { get; set; }

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("image")]
    public string Image { get; set; } = string.Empty;

    [FirestoreProperty("imagePublicId")]
    public string? ImagePublicId { get; set; }

    /// <summary>Larger hero-style image for the category landing page — distinct from Image (the small card thumbnail used in the homepage's category grid).</summary>
    [FirestoreProperty("bannerImage")]
    public string? BannerImage { get; set; }

    [FirestoreProperty("bannerImagePublicId")]
    public string? BannerImagePublicId { get; set; }

    [FirestoreProperty("displayOrder")]
    public long DisplayOrder { get; set; }

    /// <summary>Category-level spotlight flag — distinct from Product.Featured.</summary>
    [FirestoreProperty("featured")]
    public bool Featured { get; set; }

    /// <summary>Visibility gate — public GET /categories only ever returns Active == true.</summary>
    [FirestoreProperty("active")]
    public bool Active { get; set; }

    [FirestoreProperty("seoTitle")]
    public string? SeoTitle { get; set; }

    [FirestoreProperty("seoDescription")]
    public string? SeoDescription { get; set; }

    [FirestoreProperty("seoKeywords")]
    public List<string> SeoKeywords { get; set; } = [];

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
