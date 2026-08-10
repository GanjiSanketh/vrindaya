using Vrindaya.Api.AI.Dashboard.DTOs;
using Vrindaya.Api.AI.Dashboard.Interfaces;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.AI.Dashboard.Services;

/// <summary>
/// Default <see cref="IDashboardInsightSource"/>. Reads the catalog through the
/// existing <see cref="IProductRepository"/> and <see cref="ISaleRepository"/>
/// (both request-cached) and projects each active product onto the
/// <see cref="FlipkartProduct"/> and <see cref="ListingEvaluationInput"/> views
/// the AI engines consume. No new Firestore query shapes are introduced.
/// </summary>
public sealed class DashboardInsightSource : IDashboardInsightSource
{
    private readonly IProductRepository _productRepository;
    private readonly ISaleRepository _saleRepository;
    private readonly ILogger<DashboardInsightSource> _logger;

    public DashboardInsightSource(
        IProductRepository productRepository,
        ISaleRepository saleRepository,
        ILogger<DashboardInsightSource> logger)
    {
        _productRepository = productRepository ?? throw new ArgumentNullException(nameof(productRepository));
        _saleRepository = saleRepository ?? throw new ArgumentNullException(nameof(saleRepository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<DashboardInsightsRequestDto> BuildRequestAsync(
        int maximumPerSection,
        CancellationToken cancellationToken = default)
    {
        var documents = await _productRepository.GetAllUnpagedAsync(cancellationToken);
        var sales = await _saleRepository.GetDashboardSalesAsync(cancellationToken);

        var unitsSold = sales
            .Where(s => !string.IsNullOrWhiteSpace(s.Data.ProductId))
            .GroupBy(s => s.Data.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(s => s.Data.Quantity));

        var request = new DashboardInsightsRequestDto
        {
            MaximumPerSection = maximumPerSection,
        };

        foreach (var (id, doc) in documents)
        {
            if (doc.Deleted || !doc.Active)
                continue;

            request.Products.Add(ToFlipkartProduct(id, doc, unitsSold));
            request.Listings[id] = ToListingInput(id, doc);
        }

        _logger.LogInformation(
            "DashboardInsightSource: projected {ProductCount} active products from {DocumentCount} catalog documents.",
            request.Products.Count, documents.Count);

        return request;
    }

    // -------------------------------------------------------------------
    // Projections
    // -------------------------------------------------------------------

    private static FlipkartProduct ToFlipkartProduct(
        string id,
        ProductDocument doc,
        IReadOnlyDictionary<string, int> unitsSold)
    {
        var purchaseCost = doc.Pricing?.PurchaseCost ?? 0d;
        var sellingPrice = doc.Pricing?.SellingPrice ?? doc.Price;
        var stock = (int)Math.Max(doc.TotalStock, doc.Stock);

        return new FlipkartProduct(
            id,
            doc.Name,
            doc.Category,
            doc.Price,
            purchaseCost,
            sellingPrice,
            stock,
            unitsSold.TryGetValue(id, out var sold) ? sold : 0,
            doc.CreatedAt,
            Brand: doc.Brand,
            Description: doc.Description,
            ShortDescription: doc.ShortDescription,
            FlipkartProductUrl: doc.FlipkartProductUrl,
            FlipkartProductId: doc.FlipkartProductId,
            FlipkartSellerSku: doc.FlipkartSellerSku,
            FlipkartFsn: doc.FlipkartFsn);
    }

    private static ListingEvaluationInput ToListingInput(string id, ProductDocument doc) => new()
    {
        ProductId = id,
        ProductName = doc.Name,
        Brand = doc.Brand,
        Category = doc.Category,
        Title = string.IsNullOrWhiteSpace(doc.SeoTitle) ? doc.Name : doc.SeoTitle,
        Description = doc.Description ?? string.Empty,
        BulletPoints = BuildBulletPoints(doc),
        ImageCount = doc.Images.Count,
        SeoKeywords = doc.SeoKeywords,
        Attributes = BuildAttributes(doc),
    };

    /// <summary>
    /// Uses the short description as the listing's feature bullets when present;
    /// no copy is invented here.
    /// </summary>
    private static List<string> BuildBulletPoints(ProductDocument doc) =>
        string.IsNullOrWhiteSpace(doc.ShortDescription)
            ? []
            : [.. doc.ShortDescription.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];

    private static Dictionary<string, string> BuildAttributes(ProductDocument doc)
    {
        var attributes = new Dictionary<string, string>();

        AddIfPresent(attributes, "Fabric", doc.Fabric);
        AddIfPresent(attributes, "Pattern", doc.Pattern);
        AddIfPresent(attributes, "Fit", doc.Fit);
        AddIfPresent(attributes, "Sleeve", doc.Sleeve);
        AddIfPresent(attributes, "Neck", doc.Neck);
        AddIfPresent(attributes, "Occasion", doc.Occasion);
        AddIfPresent(attributes, "Color", doc.Color);
        AddIfPresent(attributes, "WashCare", doc.WashCare);

        return attributes;
    }

    private static void AddIfPresent(Dictionary<string, string> target, string key, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
            target[key] = value;
    }
}
