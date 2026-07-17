using Microsoft.Extensions.Caching.Memory;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Marketplace;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;

namespace Vrindaya.Api.Services.Marketplace;

public class MarketplaceSettingsService : IMarketplaceSettingsService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly IMarketplaceSettingsRepository _repository;
    private readonly IMemoryCache _cache;
    private readonly IAuditLogService _auditLogService;

    public MarketplaceSettingsService(IMarketplaceSettingsRepository repository, IMemoryCache cache, IAuditLogService auditLogService)
    {
        _repository = repository;
        _cache = cache;
        _auditLogService = auditLogService;
    }

    public async Task<FlipkartSettingsResponse> GetAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(AppConstants.FlipkartSettingsCacheKey, out FlipkartSettingsResponse? cached) && cached != null)
        {
            return cached;
        }

        var doc = await _repository.GetAsync(cancellationToken) ?? new MarketplaceSettingsDocument();
        var response = ToResponse(doc);

        _cache.Set(AppConstants.FlipkartSettingsCacheKey, response, CacheTtl);
        return response;
    }

    public async Task<FlipkartSettingsResponse> UpdateAsync(UpdateFlipkartSettingsRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        var document = new MarketplaceSettingsDocument
        {
            MarketplaceName = "Flipkart",
            MarketplaceEnabled = request.MarketplaceEnabled,
            SellerDisplayName = request.SellerDisplayName,
            SellerId = request.SellerId,
            DefaultShippingCharge = request.DefaultShippingCharge,
            DefaultPackagingCharge = request.DefaultPackagingCharge,
            DefaultAdvertisementPercentage = request.DefaultAdvertisementPercentage,
            DefaultFlipkartCommissionPercentage = request.DefaultFlipkartCommissionPercentage,
            DefaultPaymentGatewayCharges = request.DefaultPaymentGatewayCharges,
            DefaultMiscellaneousCharges = request.DefaultMiscellaneousCharges,
            GstPercentage = request.GstPercentage,
            DefaultProfitMargin = request.DefaultProfitMargin,
            UpdatedBy = updatedBy,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repository.SetAsync(document, cancellationToken);
        _cache.Remove(AppConstants.FlipkartSettingsCacheKey);
        try { await _auditLogService.LogUpdateAsync("MarketplaceSettings", null, null, null, AuditLogService.SerializeJson(document), updatedBy, null, null, "Flipkart marketplace settings updated"); } catch { }
        return ToResponse(document);
    }

    public async Task<MarketplaceDefaultsDto> GetDefaultsAsync(string marketplaceType, CancellationToken cancellationToken)
    {
        if (string.Equals(marketplaceType, MarketplaceType.Flipkart, StringComparison.OrdinalIgnoreCase))
        {
            var settings = await GetAsync(cancellationToken);
            return new MarketplaceDefaultsDto
            {
                DefaultCommissionPercent = settings.DefaultFlipkartCommissionPercentage,
                DefaultShippingCharge = settings.DefaultShippingCharge,
                DefaultPackagingCharge = settings.DefaultPackagingCharge,
                DefaultAdvertisementCost = settings.DefaultAdvertisementPercentage,
                DefaultMiscellaneousCharges = settings.DefaultMiscellaneousCharges,
                DefaultClosingFee = settings.DefaultPaymentGatewayCharges,
            };
        }

        return new MarketplaceDefaultsDto();
    }

    private static FlipkartSettingsResponse ToResponse(MarketplaceSettingsDocument doc) => new()
    {
        MarketplaceName = doc.MarketplaceName,
        MarketplaceEnabled = doc.MarketplaceEnabled,
        SellerDisplayName = doc.SellerDisplayName,
        SellerId = doc.SellerId,
        DefaultShippingCharge = doc.DefaultShippingCharge,
        DefaultPackagingCharge = doc.DefaultPackagingCharge,
        DefaultAdvertisementPercentage = doc.DefaultAdvertisementPercentage,
        DefaultFlipkartCommissionPercentage = doc.DefaultFlipkartCommissionPercentage,
        DefaultPaymentGatewayCharges = doc.DefaultPaymentGatewayCharges,
        DefaultMiscellaneousCharges = doc.DefaultMiscellaneousCharges,
        GstPercentage = doc.GstPercentage,
        DefaultProfitMargin = doc.DefaultProfitMargin,
        UpdatedAt = doc.UpdatedAt,
    };
}
