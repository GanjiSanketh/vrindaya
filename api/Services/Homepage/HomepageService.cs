using Microsoft.Extensions.Caching.Memory;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>
/// The GET /homepage aggregator — one call resolves every homepage section.
/// Cached (IMemoryCache, 60s TTL, fixed key) since the content is
/// public/global; every homepage-CMS mutation elsewhere calls
/// IHomepageCacheService.Invalidate() so an admin edit is visible
/// immediately rather than waiting out the TTL.
/// </summary>
public class HomepageService : IHomepageService
{
    private const int NewArrivalsAutomaticPageSize = 12;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly IHeroBannerService _heroBannerService;
    private readonly IPromotionalBannerService _promotionalBannerService;
    private readonly ICategoryService _categoryService;
    private readonly ICollectionService _collectionService;
    private readonly IHomepageConfigService _configService;
    private readonly IProductService _productService;
    private readonly IMemoryCache _cache;

    public HomepageService(
        IHeroBannerService heroBannerService,
        IPromotionalBannerService promotionalBannerService,
        ICategoryService categoryService,
        ICollectionService collectionService,
        IHomepageConfigService configService,
        IProductService productService,
        IMemoryCache cache)
    {
        _heroBannerService = heroBannerService;
        _promotionalBannerService = promotionalBannerService;
        _categoryService = categoryService;
        _collectionService = collectionService;
        _configService = configService;
        _productService = productService;
        _cache = cache;
    }

    public async Task<HomepageResponse> GetHomepageAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(AppConstants.HomepageCacheKey, out HomepageResponse? cached) && cached != null)
        {
            return cached;
        }

        var config = await _configService.GetAsync(cancellationToken);

        var heroTask = _heroBannerService.GetActiveBannerAsync(cancellationToken);
        var promoTask = _promotionalBannerService.GetActiveAsync(cancellationToken);
        var categoriesTask = _categoryService.GetActiveAsync(cancellationToken);
        var featuredTask = _collectionService.GetProductsBySlugAsync(config.FeaturedCollectionSlug, cancellationToken);
        var trendingTask = _collectionService.GetProductsBySlugAsync(config.TrendingCollectionSlug, cancellationToken);
        var newArrivalsTask = GetNewArrivalsAsync(config.NewArrivalsOverrideIds, cancellationToken);
        var bestSellersTask = GetBestSellersAsync(cancellationToken);

        await Task.WhenAll(heroTask, promoTask, categoriesTask, featuredTask, trendingTask, newArrivalsTask, bestSellersTask);

        var response = new HomepageResponse
        {
            Hero = heroTask.Result,
            FeaturedProducts = featuredTask.Result,
            NewArrivals = newArrivalsTask.Result,
            TrendingProducts = trendingTask.Result,
            BestSellers = bestSellersTask.Result,
            Categories = categoriesTask.Result,
            PromotionalBanners = promoTask.Result,
            Announcement = config.Announcement.Enabled ? config.Announcement : null,
            Instagram = config.Instagram.Enabled ? config.Instagram : null,
            FooterBanner = config.FooterBanner.Active ? config.FooterBanner : null,
            Seo = config.Seo,
        };

        _cache.Set(AppConstants.HomepageCacheKey, response, CacheTtl);
        return response;
    }

    /// <summary>Empty override = automatic (latest active new-arrival products, as before this phase).</summary>
    private async Task<List<ProductSummaryResponse>> GetNewArrivalsAsync(List<string> overrideIds, CancellationToken cancellationToken)
    {
        if (overrideIds.Count > 0)
        {
            return await _productService.GetSummariesByIdsAsync(overrideIds, cancellationToken);
        }

        var result = await _productService.GetProductsAsync(new ProductQuery
        {
            NewArrival = true,
            SortBy = "createdAt",
            SortDescending = true,
            PageSize = NewArrivalsAutomaticPageSize,
        }, isAdmin: false, cancellationToken);

        return result.Items;
    }

    /// <summary>Auto-computed from the BestSeller flag (admin's bulk "Mark Best Seller" action), same shape as Featured/Trending — no dedicated Collection or override list, matching how NewArrivals worked before Collections existed.</summary>
    private async Task<List<ProductSummaryResponse>> GetBestSellersAsync(CancellationToken cancellationToken)
    {
        var result = await _productService.GetProductsAsync(new ProductQuery
        {
            BestSeller = true,
            PageSize = NewArrivalsAutomaticPageSize,
        }, isAdmin: false, cancellationToken);

        return result.Items;
    }
}
