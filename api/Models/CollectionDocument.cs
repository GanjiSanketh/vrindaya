using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's collections collection — id is the
/// slug (e.g. "trending", "festive", "wedding"), same ID/slug-conflation
/// pattern as CategoryDocument, for the same reason (avoids a second join
/// key alongside an editable slug with no functional ask attached).
/// A Collection is an admin-curated, bounded, ordered list of product ids
/// — not a live query — so its landing page needs no pagination.
/// </summary>
[FirestoreData]
public class CollectionDocument
{
    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("image")]
    public string? Image { get; set; }

    [FirestoreProperty("imagePublicId")]
    public string? ImagePublicId { get; set; }

    [FirestoreProperty("bannerImage")]
    public string? BannerImage { get; set; }

    [FirestoreProperty("bannerImagePublicId")]
    public string? BannerImagePublicId { get; set; }

    [FirestoreProperty("displayOrder")]
    public long DisplayOrder { get; set; }

    /// <summary>Collection-level spotlight flag — distinct from Product.Featured and Category.Featured.</summary>
    [FirestoreProperty("featured")]
    public bool Featured { get; set; }

    /// <summary>Visibility gate — public GET /collections and GET /collections/{slug} (for non-admins) only ever return Active == true.</summary>
    [FirestoreProperty("active")]
    public bool Active { get; set; }

    /// <summary>Ordered, admin-picked product ids — the collection's actual membership.</summary>
    [FirestoreProperty("productIds")]
    public List<string> ProductIds { get; set; } = [];

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
