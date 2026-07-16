using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Homepage;

public class AnnouncementDto
{
    public bool Enabled { get; set; }
    public string? Message { get; set; }
    public string? LinkText { get; set; }
    public string? LinkUrl { get; set; }
}

public class InstagramImageDto
{
    [Required, Url]
    public string Url { get; set; } = string.Empty;

    public string PublicId { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
}

public class InstagramSectionDto
{
    public bool Enabled { get; set; }
    public string? Heading { get; set; }
    public string? Handle { get; set; }
    public string? ProfileUrl { get; set; }
    public List<InstagramImageDto> Images { get; set; } = [];
}

public class FooterBannerDto
{
    public bool Active { get; set; }
    public string? Title { get; set; }
    public string? Subtitle { get; set; }

    [Url]
    public string? ImageUrl { get; set; }

    public string? ImagePublicId { get; set; }
    public string? ButtonText { get; set; }
    public string? ButtonUrl { get; set; }
}

public class HomepageSeoDto
{
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public List<string> MetaKeywords { get; set; } = [];
    public string? OgImage { get; set; }
    public string? CanonicalUrl { get; set; }
}

/// <summary>Admin GET/PUT shape for the homepageConfig/singleton document — which Collection powers Featured/Trending, the New Arrivals override list, plus every single-record section.</summary>
public class HomepageConfigResponse
{
    public string FeaturedCollectionSlug { get; set; } = "featured";
    public string TrendingCollectionSlug { get; set; } = "trending";
    public List<string> NewArrivalsOverrideIds { get; set; } = [];
    public AnnouncementDto Announcement { get; set; } = new();
    public InstagramSectionDto Instagram { get; set; } = new();
    public FooterBannerDto FooterBanner { get; set; } = new();
    public HomepageSeoDto Seo { get; set; } = new();
    public DateTime UpdatedAt { get; set; }
}

public class UpdateHomepageConfigRequest
{
    public string FeaturedCollectionSlug { get; set; } = "featured";
    public string TrendingCollectionSlug { get; set; } = "trending";
    public List<string> NewArrivalsOverrideIds { get; set; } = [];
    public AnnouncementDto Announcement { get; set; } = new();
    public InstagramSectionDto Instagram { get; set; } = new();
    public FooterBannerDto FooterBanner { get; set; } = new();
    public HomepageSeoDto Seo { get; set; } = new();
}
