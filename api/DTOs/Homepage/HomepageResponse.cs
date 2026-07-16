using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.DTOs.Homepage;

/// <summary>
/// The single aggregated payload GET /homepage returns — everything the
/// public homepage needs in one call. Sections that are disabled/inactive
/// or have nothing to show are simply absent/empty (never an error).
/// </summary>
public class HomepageResponse
{
    /// <summary>Null if no hero banner currently qualifies (none active/in-date-range) — homepage renders its own fallback in that case.</summary>
    public HeroBannerResponse? Hero { get; set; }
    public List<ProductSummaryResponse> FeaturedProducts { get; set; } = [];
    public List<ProductSummaryResponse> NewArrivals { get; set; } = [];
    public List<ProductSummaryResponse> TrendingProducts { get; set; } = [];
    public List<ProductSummaryResponse> BestSellers { get; set; } = [];
    public List<CategoryResponse> Categories { get; set; } = [];
    public List<PromotionalBannerResponse> PromotionalBanners { get; set; } = [];

    /// <summary>Null when Announcement.Enabled is false.</summary>
    public AnnouncementDto? Announcement { get; set; }

    /// <summary>Null when Instagram.Enabled is false.</summary>
    public InstagramSectionDto? Instagram { get; set; }

    /// <summary>Null when FooterBanner.Active is false.</summary>
    public FooterBannerDto? FooterBanner { get; set; }

    public HomepageSeoDto Seo { get; set; } = new();
}
