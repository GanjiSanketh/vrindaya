using Microsoft.Extensions.Caching.Memory;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Brand;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Brand;

/// <summary>
/// GET is public and cached (IMemoryCache, 60s TTL, fixed key) since the
/// content is public/global (footer/about/contact/faq/policy pages all
/// read it) — same reasoning as HomepageService's cache. PUT invalidates
/// the cache immediately rather than waiting out the TTL.
/// </summary>
public class BrandConfigService : IBrandConfigService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly IBrandConfigRepository _repository;
    private readonly IMemoryCache _cache;

    public BrandConfigService(IBrandConfigRepository repository, IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<BrandConfigResponse> GetAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(AppConstants.BrandConfigCacheKey, out BrandConfigResponse? cached) && cached != null)
        {
            return cached;
        }

        var doc = await _repository.GetAsync(cancellationToken) ?? new BrandConfigDocument();
        var response = ToResponse(doc);

        _cache.Set(AppConstants.BrandConfigCacheKey, response, CacheTtl);
        return response;
    }

    public async Task<BrandConfigResponse> UpdateAsync(UpdateBrandConfigRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        var document = new BrandConfigDocument
        {
            AboutUs = new AboutUsSection
            {
                Heading = request.AboutUs.Heading,
                Body = request.AboutUs.Body,
                ImageUrl = request.AboutUs.ImageUrl,
                ImagePublicId = request.AboutUs.ImagePublicId,
            },
            Contact = new ContactSection
            {
                Email = request.Contact.Email,
                Phone = request.Contact.Phone,
                WhatsApp = request.Contact.WhatsApp,
                Address = request.Contact.Address,
                MapEmbedUrl = request.Contact.MapEmbedUrl,
                BusinessHours = request.Contact.BusinessHours,
            },
            StoreInformation = new StoreInformationSection
            {
                LegalName = request.StoreInformation.LegalName,
                Gstin = request.StoreInformation.Gstin,
                RegisteredAddress = request.StoreInformation.RegisteredAddress,
                EstablishedYear = request.StoreInformation.EstablishedYear,
            },
            SocialLinks = new SocialLinksSection
            {
                Instagram = request.SocialLinks.Instagram,
                Flipkart = request.SocialLinks.Flipkart,
            },
            Faqs = request.Faqs.Select(f => new FaqItem
            {
                Id = f.Id,
                Question = f.Question,
                Answer = f.Answer,
                DisplayOrder = f.DisplayOrder,
            }).ToList(),
            Policies = request.Policies.Select(p => new PolicyItem
            {
                Id = p.Id,
                Title = p.Title,
                Content = p.Content,
                DisplayOrder = p.DisplayOrder,
                UpdatedAt = DateTime.UtcNow,
            }).ToList(),
            Footer = new FooterSection
            {
                ShowSocialLinks = request.Footer.ShowSocialLinks,
                ShowPolicyLinks = request.Footer.ShowPolicyLinks,
                CopyrightText = request.Footer.CopyrightText,
            },
            UpdatedBy = updatedBy,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repository.SetAsync(document, cancellationToken);
        _cache.Remove(AppConstants.BrandConfigCacheKey);
        return ToResponse(document);
    }

    private static BrandConfigResponse ToResponse(BrandConfigDocument doc) => new()
    {
        AboutUs = new AboutUsDto
        {
            Heading = doc.AboutUs.Heading,
            Body = doc.AboutUs.Body,
            ImageUrl = doc.AboutUs.ImageUrl,
            ImagePublicId = doc.AboutUs.ImagePublicId,
        },
        Contact = new ContactDto
        {
            Email = doc.Contact.Email,
            Phone = doc.Contact.Phone,
            WhatsApp = doc.Contact.WhatsApp,
            Address = doc.Contact.Address,
            MapEmbedUrl = doc.Contact.MapEmbedUrl,
            BusinessHours = doc.Contact.BusinessHours,
        },
        StoreInformation = new StoreInformationDto
        {
            LegalName = doc.StoreInformation.LegalName,
            Gstin = doc.StoreInformation.Gstin,
            RegisteredAddress = doc.StoreInformation.RegisteredAddress,
            EstablishedYear = doc.StoreInformation.EstablishedYear,
        },
        SocialLinks = new SocialLinksDto
        {
            Instagram = doc.SocialLinks.Instagram,
            Flipkart = doc.SocialLinks.Flipkart,
        },
        Faqs = doc.Faqs
            .OrderBy(f => f.DisplayOrder)
            .Select(f => new FaqDto { Id = f.Id, Question = f.Question, Answer = f.Answer, DisplayOrder = f.DisplayOrder })
            .ToList(),
        Policies = doc.Policies
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new PolicyDto { Id = p.Id, Title = p.Title, Content = p.Content, DisplayOrder = p.DisplayOrder, UpdatedAt = p.UpdatedAt })
            .ToList(),
        Footer = new FooterDto
        {
            ShowSocialLinks = doc.Footer.ShowSocialLinks,
            ShowPolicyLinks = doc.Footer.ShowPolicyLinks,
            CopyrightText = doc.Footer.CopyrightText,
        },
        UpdatedAt = doc.UpdatedAt,
    };
}
