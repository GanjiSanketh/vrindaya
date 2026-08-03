using Google.Cloud.Firestore;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.DTOs.Analytics;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly IProductRepository _productRepository;
    private readonly IProductAnalyticsRepository _analyticsRepository;
    private readonly IAnalyticsSettingsService _settingsService;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(
        IProductRepository productRepository,
        IProductAnalyticsRepository analyticsRepository,
        IAnalyticsSettingsService settingsService,
        ILogger<AnalyticsService> logger)
    {
        _productRepository = productRepository;
        _analyticsRepository = analyticsRepository;
        _settingsService = settingsService;
        _logger = logger;
    }

    /// <summary>
    /// Records a "Buy on Flipkart" click — but ONLY when the website analytics
    /// switches allow it. This is the server-side enforcement boundary for the
    /// legacy click endpoint: the storefront's client-side gate is a first line
    /// of defence, the settings document is the source of truth here.
    /// </summary>
    public async Task RecordProductClickAsync(string productId, CancellationToken cancellationToken)
    {
        var settings = await _settingsService.GetAsync(cancellationToken);

        _logger.LogInformation("WebsiteTracking: {value}", settings.TrackingEnabled);
        _logger.LogInformation("ProductTracking: {value}", settings.ProductClicks);

        if (!settings.TrackingEnabled || !settings.ProductClicks)
        {
            _logger.LogInformation("Skipping analytics event");
            return;
        }

        await _productRepository.IncrementWebsiteClickAsync(productId, cancellationToken);
        _logger.LogInformation("Saved ProductClick event for product '{ProductId}'.", productId);
    }

    public async Task<AnalyticsOverviewResponse> GetOverviewAsync(CancellationToken cancellationToken)
    {
        var totals = await _analyticsRepository.GetAllTotalsAsync(cancellationToken);

        long totalDetail = 0;
        long totalFlipkart = 0;
        foreach (var (_, data) in totals)
        {
            totalDetail += LongOf(data, "totalDetailClicks");
            totalFlipkart += LongOf(data, "totalFlipkartClicks");
        }

        var todayKey = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var todayDocs = await _analyticsRepository.GetDailyByDateAsync(
            totals.Select(t => t.ProductId).ToList(), todayKey, cancellationToken);

        long todayDetail = 0;
        long todayFlipkart = 0;
        foreach (var (_, data) in todayDocs)
        {
            todayDetail += LongOf(data, "detailClicks");
            todayFlipkart += LongOf(data, "flipkartClicks");
        }

        return new AnalyticsOverviewResponse
        {
            TotalDetailClicks = totalDetail,
            TotalFlipkartClicks = totalFlipkart,
            TodayDetailClicks = todayDetail,
            TodayFlipkartClicks = todayFlipkart,
            TotalProductsTracked = totals.Count,
        };
    }

    public async Task<List<TopProductAnalyticsResponse>> GetTopProductsAsync(string sort, int limit, CancellationToken cancellationToken)
    {
        var sortField = sort == "flipkart" ? "totalFlipkartClicks" : "totalDetailClicks";
        var top = await _analyticsRepository.GetTopAsync(sortField, limit, cancellationToken);

        var products = await _productRepository.GetByIdsAsync(top.Select(t => t.ProductId).ToList(), cancellationToken);
        var productById = products.ToDictionary(p => p.Id, p => p.Data);

        return top.Select(t =>
        {
            var product = productById.GetValueOrDefault(t.ProductId);
            return new TopProductAnalyticsResponse
            {
                Id = t.ProductId,
                Name = product?.Name ?? t.ProductId,
                Image = product is null ? null : ImageOf(product),
                DetailClicks = LongOf(t.Data, "totalDetailClicks"),
                FlipkartClicks = LongOf(t.Data, "totalFlipkartClicks"),
                LastClickedAt = TimestampOf(t.Data, "lastClickedAt"),
            };
        }).ToList();
    }

    public async Task<ProductAnalyticsDetailResponse?> GetProductAnalyticsAsync(string productId, CancellationToken cancellationToken)
    {
        var totals = await _analyticsRepository.GetTotalsAsync(productId, cancellationToken);
        if (totals is null)
        {
            return null;
        }

        var product = await _productRepository.GetByIdAsync(productId, cancellationToken);
        var daily = await _analyticsRepository.GetDailyAsync(productId, cancellationToken);

        return new ProductAnalyticsDetailResponse
        {
            Id = productId,
            Name = product?.Name ?? productId,
            Image = product is null ? null : ImageOf(product),
            TotalDetailClicks = LongOf(totals, "totalDetailClicks"),
            TotalFlipkartClicks = LongOf(totals, "totalFlipkartClicks"),
            LastClickedAt = TimestampOf(totals, "lastClickedAt"),
            Daily = daily.Select(d => new DailyProductAnalyticsResponse
            {
                Date = d.Date,
                DetailClicks = LongOf(d.Data, "detailClicks"),
                FlipkartClicks = LongOf(d.Data, "flipkartClicks"),
                LastClickedAt = TimestampOf(d.Data, "lastClickedAt"),
            }).ToList(),
        };
    }

    private static long LongOf(Dictionary<string, object> data, string field)
    {
        return data.TryGetValue(field, out var value) && value is not null ? Convert.ToInt64(value) : 0;
    }

    private static DateTime? TimestampOf(Dictionary<string, object> data, string field)
    {
        return data.TryGetValue(field, out var value) && value is Timestamp ts ? ts.ToDateTime() : null;
    }

    private static string? ImageOf(ProductDocument product)
    {
        return product.Images.OrderBy(i => i.Order).FirstOrDefault()?.Url ?? product.ThumbnailUrl;
    }
}
