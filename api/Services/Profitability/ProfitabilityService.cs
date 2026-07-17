using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Profitability;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Profitability;

public class ProfitabilityService : IProfitabilityService
{
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IProductRepository _productRepository;
    private readonly IProductListingRepository _listingRepository;

    public ProfitabilityService(
        IInventoryVariantRepository variantRepository,
        IProductRepository productRepository,
        IProductListingRepository listingRepository)
    {
        _variantRepository = variantRepository;
        _productRepository = productRepository;
        _listingRepository = listingRepository;
    }

    public async Task<PagedResult<ProductProfitabilityResponse>> GetProfitabilityAsync(ProfitabilityQuery query, CancellationToken cancellationToken)
    {
        var variants = await _variantRepository.GetAllUnpagedAsync(cancellationToken);
        var products = await _productRepository.GetAllUnpagedAsync(cancellationToken);
        var listings = await _listingRepository.GetAllUnpagedAsync(cancellationToken);

        var productMap = products.ToDictionary(p => p.Id, p => p.Data);
        var listingByProduct = listings
            .GroupBy(l => l.Data.ProductId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var rows = new List<ProductProfitabilityResponse>();

        foreach (var productGroup in variants.GroupBy(v => v.Data.ProductId))
        {
            var productId = productGroup.Key;
            if (!productMap.TryGetValue(productId, out var product)) continue;

            var variantList = productGroup.ToList();
            if (variantList.Count == 0) continue;

            var avgPurchaseCost = variantList.Average(v => v.Data.PurchaseCost);
            var avgTransportCost = variantList.Average(v => v.Data.TransportationCost);
            var avgPackagingCost = variantList.Average(v => v.Data.PackagingCost);
            var avgAdCost = variantList.Average(v => v.Data.AdvertisingCost);
            var avgShippingCost = variantList.Average(v => v.Data.ShippingCost);
            var avgMiscCost = variantList.Average(v => v.Data.MiscellaneousCost);
            var avgGstPercent = variantList.Average(v => v.Data.GstPercent);
            var avgPgPercent = variantList.Average(v => v.Data.PaymentGatewayChargePercent);
            var totalStock = variantList.Sum(v => v.Data.CurrentStock);
            var totalSoldStock = variantList.Sum(v => v.Data.SoldStock);
            var totalInvestment = Math.Round(variantList.Sum(v => v.Data.AveragePurchaseCost * v.Data.CurrentStock), 2);

            var marketplaceTypes = variantList
                .SelectMany(v => v.Data.MarketplaceProfiles)
                .Select(p => p.MarketplaceType)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (marketplaceTypes.Count == 0) continue;

            foreach (var mp in marketplaceTypes)
            {
                var profile = variantList
                    .Select(v => v.Data.MarketplaceProfiles
                        .FirstOrDefault(p => string.Equals(p.MarketplaceType, mp, StringComparison.OrdinalIgnoreCase)))
                    .FirstOrDefault(p => p != null);

                if (profile == null) continue;

                var sellingPrice = profile.SellingPrice;
                var commissionAmount = sellingPrice * profile.CommissionPercent / 100.0;
                var marketplaceCommission = commissionAmount + profile.ClosingFee;

                var flatCost = avgPurchaseCost + avgTransportCost;
                var totalCost = flatCost + avgPackagingCost + avgAdCost + avgShippingCost + avgMiscCost
                    + (avgPurchaseCost * avgGstPercent / 100.0)
                    + (sellingPrice * avgPgPercent / 100.0)
                    + profile.ClosingFee
                    + (profile.ShippingCharge ?? 0)
                    + (profile.PackagingCharge ?? 0)
                    + (profile.AdvertisementCost ?? 0)
                    + (profile.MiscellaneousCharges ?? 0);

                var expectedSettlement = sellingPrice - commissionAmount - profile.ClosingFee
                    - (profile.ShippingCharge ?? 0) - (profile.PackagingCharge ?? 0)
                    - (profile.AdvertisementCost ?? 0) - (profile.MiscellaneousCharges ?? 0);

                var netProfit = profile.NetProfit > 0
                    ? profile.NetProfit
                    : Math.Round(expectedSettlement - flatCost, 2);

                var profitPercentage = totalCost > 0
                    ? Math.Round(netProfit / totalCost * 100, 2)
                    : 0;

                var roiPercentage = flatCost > 0
                    ? Math.Round(netProfit / flatCost * 100, 2)
                    : 0;

                var productListings = listingByProduct.TryGetValue(productId, out var pl) ? pl : null;
                var listingInvValue = 0.0;
                if (productListings != null)
                {
                    var match = productListings
                        .FirstOrDefault(l => string.Equals(l.Data.Marketplace, mp, StringComparison.OrdinalIgnoreCase));
                    if (match.Data != null)
                        listingInvValue = match.Data.MarketplacePrice * match.Data.Inventory;
                }

                var invValue = listingInvValue > 0
                    ? Math.Round(listingInvValue, 2)
                    : Math.Round(totalStock * sellingPrice, 2);

                rows.Add(new ProductProfitabilityResponse
                {
                    ProductId = productId,
                    ProductName = product.Name,
                    Category = product.Category ?? "Uncategorized",
                    Marketplace = mp,

                    PurchaseCost = Math.Round(avgPurchaseCost, 2),
                    PackagingCost = Math.Round(avgPackagingCost + (profile.PackagingCharge ?? 0), 2),
                    AdvertisementCost = Math.Round(avgAdCost + (profile.AdvertisementCost ?? 0), 2),
                    MarketplaceCommission = Math.Round(marketplaceCommission, 2),
                    ShippingCost = Math.Round(avgShippingCost + (profile.ShippingCharge ?? 0), 2),
                    MiscellaneousCost = Math.Round(avgMiscCost + (profile.MiscellaneousCharges ?? 0), 2),
                    TotalCost = Math.Round(totalCost, 2),

                    SellingPrice = sellingPrice,
                    ExpectedSettlement = Math.Round(expectedSettlement, 2),
                    NetProfit = netProfit,
                    ProfitPercentage = profitPercentage,
                    RoiPercentage = roiPercentage,

                    CurrentStock = totalStock,
                    SoldStock = totalSoldStock,
                    Investment = totalInvestment,
                    InventoryValue = invValue,
                    ExpectedRevenue = Math.Round(totalStock * sellingPrice, 2),
                    ExpectedProfit = Math.Round(totalStock * netProfit, 2),
                });
            }
        }

        rows = ApplyFilters(rows, query);

        var totalCount = rows.Count;

        var sortAsc = false;
        Func<ProductProfitabilityResponse, IComparable> sortKey = query.Filter?.ToLowerInvariant() switch
        {
            "lowestProfit" => r => r.ProfitPercentage,
            "negativeMargin" => r => r.NetProfit,
            "highInvestment" => r => r.Investment,
            "deadStock" => r => r.SoldStock,
            "fastMoving" => r => r.SoldStock,
            _ => r => r.ProfitPercentage,
        };

        if (query.Filter?.ToLowerInvariant() is "lowestProfit")
            sortAsc = true;
        else if (query.Filter?.ToLowerInvariant() is "negativeMargin" or "deadStock")
            sortAsc = true;

        rows = sortAsc ? rows.OrderBy(sortKey).ToList() : rows.OrderByDescending(sortKey).ToList();

        int skip = 0;
        if (!string.IsNullOrWhiteSpace(query.Cursor) && int.TryParse(query.Cursor, out var cursorIndex))
            skip = cursorIndex;

        var page = rows.Skip(skip).Take(query.PageSize).ToList();

        var nextCursor = (skip + page.Count < totalCount) ? (skip + page.Count).ToString() : null;

        return new PagedResult<ProductProfitabilityResponse>
        {
            Items = page,
            NextCursor = nextCursor,
            TotalCount = totalCount,
        };
    }

    private static List<ProductProfitabilityResponse> ApplyFilters(List<ProductProfitabilityResponse> rows, ProfitabilityQuery query)
    {
        var filtered = rows.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            filtered = filtered.Where(r =>
                r.ProductName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                r.ProductId.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.Marketplace))
        {
            var mp = query.Marketplace.Trim();
            filtered = filtered.Where(r =>
                string.Equals(r.Marketplace, mp, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var cat = query.Category.Trim();
            filtered = filtered.Where(r =>
                string.Equals(r.Category, cat, StringComparison.OrdinalIgnoreCase));
        }

        var filterType = query.Filter?.ToLowerInvariant();
        if (filterType == "negativeMargin")
            filtered = filtered.Where(r => r.NetProfit < 0);

        return filtered.ToList();
    }
}
