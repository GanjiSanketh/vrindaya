using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

public class HomepageConfigService : IHomepageConfigService
{
    private readonly IHomepageConfigRepository _repository;
    private readonly IHomepageCacheService _cache;

    public HomepageConfigService(IHomepageConfigRepository repository, IHomepageCacheService cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<HomepageConfigResponse> GetAsync(CancellationToken cancellationToken)
    {
        var doc = await _repository.GetAsync(cancellationToken) ?? new HomepageConfigDocument();
        return ToResponse(doc);
    }

    public async Task<HomepageConfigResponse> UpdateAsync(UpdateHomepageConfigRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        var document = new HomepageConfigDocument
        {
            FeaturedCollectionSlug = string.IsNullOrWhiteSpace(request.FeaturedCollectionSlug) ? "featured" : request.FeaturedCollectionSlug,
            TrendingCollectionSlug = string.IsNullOrWhiteSpace(request.TrendingCollectionSlug) ? "trending" : request.TrendingCollectionSlug,
            NewArrivalsOverrideIds = request.NewArrivalsOverrideIds,
            Announcement = new AnnouncementSection
            {
                Enabled = request.Announcement.Enabled,
                Message = request.Announcement.Message,
                LinkText = request.Announcement.LinkText,
                LinkUrl = request.Announcement.LinkUrl,
            },
            Instagram = new InstagramSection
            {
                Enabled = request.Instagram.Enabled,
                Heading = request.Instagram.Heading,
                Handle = request.Instagram.Handle,
                ProfileUrl = request.Instagram.ProfileUrl,
                Images = request.Instagram.Images.Select(i => new InstagramImage { Url = i.Url, PublicId = i.PublicId, LinkUrl = i.LinkUrl }).ToList(),
            },
            FooterBanner = new FooterBannerSection
            {
                Active = request.FooterBanner.Active,
                Title = request.FooterBanner.Title,
                Subtitle = request.FooterBanner.Subtitle,
                ImageUrl = request.FooterBanner.ImageUrl,
                ImagePublicId = request.FooterBanner.ImagePublicId,
                ButtonText = request.FooterBanner.ButtonText,
                ButtonUrl = request.FooterBanner.ButtonUrl,
            },
            Seo = new HomepageSeoSection
            {
                MetaTitle = request.Seo.MetaTitle,
                MetaDescription = request.Seo.MetaDescription,
                MetaKeywords = request.Seo.MetaKeywords,
                OgImage = request.Seo.OgImage,
                CanonicalUrl = request.Seo.CanonicalUrl,
            },
            UpdatedBy = updatedBy,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repository.SetAsync(document, cancellationToken);
        _cache.Invalidate();
        return ToResponse(document);
    }

    private static HomepageConfigResponse ToResponse(HomepageConfigDocument doc) => new()
    {
        FeaturedCollectionSlug = doc.FeaturedCollectionSlug,
        TrendingCollectionSlug = doc.TrendingCollectionSlug,
        NewArrivalsOverrideIds = doc.NewArrivalsOverrideIds,
        Announcement = new AnnouncementDto
        {
            Enabled = doc.Announcement.Enabled,
            Message = doc.Announcement.Message,
            LinkText = doc.Announcement.LinkText,
            LinkUrl = doc.Announcement.LinkUrl,
        },
        Instagram = new InstagramSectionDto
        {
            Enabled = doc.Instagram.Enabled,
            Heading = doc.Instagram.Heading,
            Handle = doc.Instagram.Handle,
            ProfileUrl = doc.Instagram.ProfileUrl,
            Images = doc.Instagram.Images.Select(i => new InstagramImageDto { Url = i.Url, PublicId = i.PublicId, LinkUrl = i.LinkUrl }).ToList(),
        },
        FooterBanner = new FooterBannerDto
        {
            Active = doc.FooterBanner.Active,
            Title = doc.FooterBanner.Title,
            Subtitle = doc.FooterBanner.Subtitle,
            ImageUrl = doc.FooterBanner.ImageUrl,
            ImagePublicId = doc.FooterBanner.ImagePublicId,
            ButtonText = doc.FooterBanner.ButtonText,
            ButtonUrl = doc.FooterBanner.ButtonUrl,
        },
        Seo = new HomepageSeoDto
        {
            MetaTitle = doc.Seo.MetaTitle,
            MetaDescription = doc.Seo.MetaDescription,
            MetaKeywords = doc.Seo.MetaKeywords,
            OgImage = doc.Seo.OgImage,
            CanonicalUrl = doc.Seo.CanonicalUrl,
        },
        UpdatedAt = doc.UpdatedAt,
    };
}
