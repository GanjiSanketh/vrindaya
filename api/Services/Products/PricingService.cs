using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class PricingService : IPricingService
{
    private readonly IProductRepository _productRepo;

    public PricingService(IProductRepository productRepo)
    {
        _productRepo = productRepo;
    }

    public async Task<PricingDashboardResponse> GetDashboardAsync(CancellationToken ct = default)
    {
        var products = await _productRepo.GetAllUnpagedAsync(ct);

        var pricingDtos = new List<ProductPricingDto>();

        foreach (var (id, doc) in products)
        {
            if (doc.Deleted || !doc.Active) continue;
            if (doc.MarketplacePrice == null || doc.MarketplacePrice <= 0) continue;

            var dto = ComputePricing(id, doc);
            pricingDtos.Add(dto);
        }

        var sortedByProfit = pricingDtos.OrderByDescending(p => p.Profit).ToList();
        var lossProducts = pricingDtos.Where(p => p.IsLoss).ToList();

        return new PricingDashboardResponse
        {
            Summary = new PricingSummary
            {
                TotalProducts = pricingDtos.Count,
                ProfitableCount = pricingDtos.Count(p => !p.IsLoss),
                LossCount = lossProducts.Count,
                AverageProfitPercent = pricingDtos.Count > 0
                    ? Math.Round(pricingDtos.Average(p => p.ProfitPercent), 1)
                    : 0,
                TotalProfit = Math.Round(pricingDtos.Sum(p => p.Profit), 2),
            },
            TopProfitable = sortedByProfit.Take(10).ToList(),
            LeastProfitable = sortedByProfit.TakeLast(10).Where(p => !p.IsLoss).Reverse().ToList(),
            SellingAtLoss = lossProducts.OrderBy(p => p.ProfitPercent).Take(10).ToList(),
            AllProducts = pricingDtos,
        };
    }

    private static ProductPricingDto ComputePricing(string id, ProductDocument doc)
    {
        var sellingPrice = doc.MarketplacePrice ?? 0;
        var costPrice = doc.Pricing?.TotalCost ?? doc.Pricing?.PurchaseCost ?? 0;
        var mrp = doc.MarketplaceMrp;

        // Hardcoded defaults (previously read from marketplaceSettings collection)
        const double commissionPercent = 15.0;
        const double packagingCharge = 25.0;
        const double shippingCharge = 50.0;
        const double gstPercent = 18.0;
        const double targetMargin = 30.0;

        var commissionAmount = sellingPrice * commissionPercent / 100;
        var gstBase = commissionAmount + packagingCharge + shippingCharge;
        var gstAmount = gstBase * gstPercent / 100;
        var totalCost = costPrice + packagingCharge + shippingCharge + commissionAmount + gstAmount;
        var profit = sellingPrice - totalCost;
        var profitPercent = totalCost > 0 ? profit / totalCost * 100 : 0;
        var marginPercent = sellingPrice > 0 ? profit / sellingPrice * 100 : 0;
        var recommendedSellingPrice = totalCost * (1 + targetMargin / 100);
        var minimumSellingPrice = totalCost;

        return new ProductPricingDto
        {
            ProductId = id,
            ProductName = doc.Name,
            ProductImage = doc.Images?.FirstOrDefault()?.Url,
            SellingPrice = Math.Round(sellingPrice, 2),
            Mrp = mrp.HasValue ? Math.Round(mrp.Value, 2) : null,
            CostPrice = costPrice > 0 ? Math.Round(costPrice, 2) : null,
            PackagingCost = Math.Round(packagingCharge, 2),
            ShippingCost = Math.Round(shippingCharge, 2),
            CommissionPercent = commissionPercent,
            CommissionAmount = Math.Round(commissionAmount, 2),
            GstPercent = gstPercent,
            GstAmount = Math.Round(gstAmount, 2),
            TotalCost = Math.Round(totalCost, 2),
            Profit = Math.Round(profit, 2),
            ProfitPercent = Math.Round(profitPercent, 1),
            MarginPercent = Math.Round(marginPercent, 1),
            RecommendedSellingPrice = Math.Round(recommendedSellingPrice, 2),
            MinimumSellingPrice = Math.Round(minimumSellingPrice, 2),
            IsLoss = profit < 0,
        };
    }
}
