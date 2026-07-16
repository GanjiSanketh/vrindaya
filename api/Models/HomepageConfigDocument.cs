using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// A singleton document (Firestore path homepageConfig/singleton) — one
/// record, PUT-replaced as a whole from the admin's "Homepage Settings"
/// form. Consolidates the curated product-ID lists and every
/// single-record homepage section (Announcement/Instagram/FooterBanner/Seo)
/// to avoid four-plus near-empty collections for content that only ever
/// has one row.
/// </summary>
[FirestoreData]
public class HomepageConfigDocument
{
    /// <summary>Which Collection (by slug) powers the homepage's Featured section. Phase 6 replaced the old raw FeaturedProductIds array with this — editing membership now happens on the Collections admin page, not here.</summary>
    [FirestoreProperty("featuredCollectionSlug")]
    public string FeaturedCollectionSlug { get; set; } = "featured";

    /// <summary>Which Collection (by slug) powers the homepage's Trending section. Same replacement as above.</summary>
    [FirestoreProperty("trendingCollectionSlug")]
    public string TrendingCollectionSlug { get; set; } = "trending";

    /// <summary>Empty = automatic (latest active products, as before). Non-empty = admin's manual order.</summary>
    [FirestoreProperty("newArrivalsOverrideIds")]
    public List<string> NewArrivalsOverrideIds { get; set; } = [];

    [FirestoreProperty("announcement")]
    public AnnouncementSection Announcement { get; set; } = new();

    [FirestoreProperty("instagram")]
    public InstagramSection Instagram { get; set; } = new();

    [FirestoreProperty("footerBanner")]
    public FooterBannerSection FooterBanner { get; set; } = new();

    [FirestoreProperty("seo")]
    public HomepageSeoSection Seo { get; set; } = new();

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[FirestoreData]
public class AnnouncementSection
{
    [FirestoreProperty("enabled")]
    public bool Enabled { get; set; }

    [FirestoreProperty("message")]
    public string? Message { get; set; }

    [FirestoreProperty("linkText")]
    public string? LinkText { get; set; }

    [FirestoreProperty("linkUrl")]
    public string? LinkUrl { get; set; }
}

[FirestoreData]
public class InstagramSection
{
    [FirestoreProperty("enabled")]
    public bool Enabled { get; set; }

    [FirestoreProperty("heading")]
    public string? Heading { get; set; }

    [FirestoreProperty("handle")]
    public string? Handle { get; set; }

    [FirestoreProperty("profileUrl")]
    public string? ProfileUrl { get; set; }

    [FirestoreProperty("images")]
    public List<InstagramImage> Images { get; set; } = [];
}

[FirestoreData]
public class InstagramImage
{
    [FirestoreProperty("url")]
    public string Url { get; set; } = string.Empty;

    [FirestoreProperty("publicId")]
    public string PublicId { get; set; } = string.Empty;

    [FirestoreProperty("linkUrl")]
    public string? LinkUrl { get; set; }
}

[FirestoreData]
public class FooterBannerSection
{
    [FirestoreProperty("active")]
    public bool Active { get; set; }

    [FirestoreProperty("title")]
    public string? Title { get; set; }

    [FirestoreProperty("subtitle")]
    public string? Subtitle { get; set; }

    [FirestoreProperty("imageUrl")]
    public string? ImageUrl { get; set; }

    [FirestoreProperty("imagePublicId")]
    public string? ImagePublicId { get; set; }

    [FirestoreProperty("buttonText")]
    public string? ButtonText { get; set; }

    [FirestoreProperty("buttonUrl")]
    public string? ButtonUrl { get; set; }
}

[FirestoreData]
public class HomepageSeoSection
{
    [FirestoreProperty("metaTitle")]
    public string? MetaTitle { get; set; }

    [FirestoreProperty("metaDescription")]
    public string? MetaDescription { get; set; }

    [FirestoreProperty("metaKeywords")]
    public List<string> MetaKeywords { get; set; } = [];

    [FirestoreProperty("ogImage")]
    public string? OgImage { get; set; }

    [FirestoreProperty("canonicalUrl")]
    public string? CanonicalUrl { get; set; }
}
