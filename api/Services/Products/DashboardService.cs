using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class DashboardService : IDashboardService
{
    private readonly IProductRepository _productRepo;
    private readonly IProductVariantRepository _variantRepo;
    private readonly ISaleRepository _saleRepo;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        IProductRepository productRepo,
        IProductVariantRepository variantRepo,
        ISaleRepository saleRepo,
        ILogger<DashboardService> logger)
    {
        _productRepo = productRepo;
        _variantRepo = variantRepo;
        _saleRepo = saleRepo;
        _logger = logger;
    }

    public async Task<DashboardDto> GetDashboardAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Loading dashboard data");

        var products = await _productRepo.GetAllUnpagedAsync(ct);

        var allProducts = new List<(string Id, ProductDocument Doc)>();
        var allVariants = new List<(string ProductId, string VariantId, ProductVariantDocument Doc)>();

        foreach (var (id, doc) in products)
        {
            allProducts.Add((id, doc));
            var variants = await _variantRepo.GetVariantsAsync(id, ct);
            foreach (var (vid, vdoc) in variants)
            {
                if (!vdoc.IsActive) continue;
                allVariants.Add((id, vid, vdoc));
            }
        }

        var dto = new DashboardDto();
        ComputeAll(dto, allProducts, allVariants);

        try
        {
            var allSales = await _saleRepo.GetAllAsync(ct);
            ComputeSalesSummary(dto, allSales);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load sales data for dashboard");
        }

        return dto;
    }

    private static void ComputeAll(DashboardDto dto,
        List<(string Id, ProductDocument Doc)> products,
        List<(string ProductId, string VariantId, ProductVariantDocument Doc)> variants)
    {
        var activeProducts = products.Where(p => !p.Doc.Deleted && p.Doc.Active).ToList();
        var activeVariants = variants.ToList();

        // ── Summary Cards ──
        long totalUnits = 0;
        double totalCost = 0;
        double totalRevenue = 0;
        var profitPercents = new List<double>();
        var rois = new List<double>();

        foreach (var (_, _, v) in activeVariants)
        {
            var stock = v.Sizes.Sum(s => s.Stock);
            totalUnits += stock;

            var purchaseCost = v.PurchaseCost ?? 0;
            var packagingCost = v.PackagingCost ?? 0;
            var commission = v.FlipkartCommission ?? 0;
            var shipping = v.ShippingCharges ?? 0;
            var marketing = v.MarketingCost ?? 0;
            var other = v.OtherCharges ?? 0;
            var costPerUnit = purchaseCost + packagingCost + commission + shipping + marketing + other;
            var sellingPrice = v.SellingPrice ?? 0;

            totalCost += costPerUnit * stock;
            totalRevenue += sellingPrice * stock;

            if (costPerUnit > 0)
            {
                var profit = sellingPrice - costPerUnit;
                profitPercents.Add(profit / costPerUnit * 100);
                rois.Add(costPerUnit > 0 ? profit / costPerUnit * 100 : 0);
            }
        }

        dto.SummaryCards.TotalProducts = activeProducts.Count;
        dto.SummaryCards.TotalVariants = activeVariants.Count;
        dto.SummaryCards.InventoryQuantity = totalUnits;
        dto.SummaryCards.InventoryValue = Math.Round(totalCost, 2);
        dto.SummaryCards.PotentialSalesValue = Math.Round(totalRevenue, 2);
        dto.SummaryCards.ExpectedProfit = Math.Round(totalRevenue - totalCost, 2);
        dto.SummaryCards.AverageProfitPercent = profitPercents.Count > 0 ? Math.Round(profitPercents.Average(), 1) : 0;
        dto.SummaryCards.AverageRoiPercent = rois.Count > 0 ? Math.Round(rois.Average(), 1) : 0;

        // ── Profit Analytics ──
        ProductProfitInfo? highestMargin = null;
        ProductProfitInfo? lowestMargin = null;
        var sellingPrices = new List<double>();
        var purchaseCosts = new List<double>();

        foreach (var (pid, _, v) in activeVariants)
        {
            var purchaseCost = v.PurchaseCost ?? 0;
            if (purchaseCost > 0) purchaseCosts.Add(purchaseCost);
            var sellingPrice = v.SellingPrice ?? 0;
            if (sellingPrice > 0) sellingPrices.Add(sellingPrice);

            var packagingCost = v.PackagingCost ?? 0;
            var commission = v.FlipkartCommission ?? 0;
            var shipping = v.ShippingCharges ?? 0;
            var marketing = v.MarketingCost ?? 0;
            var other = v.OtherCharges ?? 0;
            var totalCostPerUnit = purchaseCost + packagingCost + commission + shipping + marketing + other;

            if (totalCostPerUnit > 0)
            {
                var profit = sellingPrice - totalCostPerUnit;
                var profitPct = profit / totalCostPerUnit * 100;
                var prodName = products.FirstOrDefault(p => p.Id == pid).Doc?.Name ?? "Unknown";
                var imageUrl = v.Images?.Primary?.Url;
                var info = new ProductProfitInfo
                {
                    ProductId = pid,
                    ProductName = prodName,
                    ImageUrl = imageUrl,
                    VariantName = v.ColourName,
                    ProfitPercent = Math.Round(profitPct, 1),
                    Profit = Math.Round(profit, 2),
                };
                if (highestMargin == null || profitPct > highestMargin.ProfitPercent) highestMargin = info;
                if (lowestMargin == null || profitPct < lowestMargin.ProfitPercent) lowestMargin = info;
            }
        }

        dto.ProfitAnalytics.AverageProfitPercent = dto.SummaryCards.AverageProfitPercent;
        dto.ProfitAnalytics.AverageRoiPercent = dto.SummaryCards.AverageRoiPercent;
        dto.ProfitAnalytics.AverageSellingPrice = sellingPrices.Count > 0 ? Math.Round(sellingPrices.Average(), 2) : 0;
        dto.ProfitAnalytics.AveragePurchaseCost = purchaseCosts.Count > 0 ? Math.Round(purchaseCosts.Average(), 2) : 0;
        dto.ProfitAnalytics.HighestMarginProduct = highestMargin;
        dto.ProfitAnalytics.LowestMarginProduct = lowestMargin;

        // ── Category Analytics ──
        var catData = new Dictionary<string, (int Products, long Stock, double Cost, double Revenue, double Profit)>();
        foreach (var (pid, doc) in activeProducts)
        {
            if (!catData.ContainsKey(doc.Category))
                catData[doc.Category] = (0, 0, 0, 0, 0);
            var e = catData[doc.Category];
            e.Products++;
            catData[doc.Category] = e;
        }
        foreach (var (pid, _, v) in activeVariants)
        {
            var product = activeProducts.FirstOrDefault(p => p.Id == pid).Doc;
            if (product == null) continue;
            var purchaseCost = v.PurchaseCost ?? 0;
            var packagingCost = v.PackagingCost ?? 0;
            var commission = v.FlipkartCommission ?? 0;
            var shipping = v.ShippingCharges ?? 0;
            var marketing = v.MarketingCost ?? 0;
            var other = v.OtherCharges ?? 0;
            var costPerUnit = purchaseCost + packagingCost + commission + shipping + marketing + other;
            var sellingPrice = v.SellingPrice ?? 0;
            var stock = v.Sizes.Sum(s => s.Stock);
            var e = catData[product.Category];
            e.Stock += stock;
            e.Cost += costPerUnit * stock;
            e.Revenue += sellingPrice * stock;
            e.Profit += (sellingPrice - costPerUnit) * stock;
            catData[product.Category] = e;
        }
        dto.CategoryAnalytics = catData
            .Select(kv => new CategoryAnalyticsDto
            {
                Category = kv.Key,
                ProductCount = kv.Value.Products,
                TotalStock = kv.Value.Stock,
                InventoryValue = Math.Round(kv.Value.Cost, 2),
                ExpectedProfit = Math.Round(kv.Value.Profit, 2),
            })
            .OrderBy(c => c.Category).ToList();

        // ── Pie Chart 1: Inventory by Category (stock) ──
        dto.InventoryByCategory = catData
            .Select(kv => new ChartDataPoint { Label = kv.Key, Value = kv.Value.Stock })
            .OrderByDescending(x => x.Value).ToList();

        // ── Pie Chart 2: Inventory Value Distribution (Cost × Stock) ──
        dto.InventoryValueDistribution = catData
            .Select(kv => new ChartDataPoint { Label = kv.Key, Value = Math.Round(kv.Value.Cost, 2) })
            .OrderByDescending(x => x.Value).ToList();

        // ── Pie Chart 3: Revenue Distribution (Selling Price × Stock) ──
        dto.RevenueDistribution = catData
            .Select(kv => new ChartDataPoint { Label = kv.Key, Value = Math.Round(kv.Value.Revenue, 2) })
            .OrderByDescending(x => x.Value).ToList();

        // ── Pie Chart 4: Profit Distribution ──
        dto.ProfitDistribution = catData
            .Select(kv => new ChartDataPoint { Label = kv.Key, Value = Math.Round(kv.Value.Profit, 2) })
            .OrderByDescending(x => x.Value).ToList();

        // ── Pie Chart 5: Product Status ──
        int statusActive = 0, statusInactive = 0, statusOutOfStock = 0, statusHidden = 0;
        foreach (var (_, doc) in products)
        {
            if (doc.Deleted) { statusHidden++; continue; }
            if (!doc.Active) { statusInactive++; continue; }
            if (doc.TotalStock <= 0) { statusOutOfStock++; continue; }
            statusActive++;
        }
        dto.ProductStatusDistribution =
        [
            new() { Label = "Active", Value = statusActive },
            new() { Label = "Inactive", Value = statusInactive },
            new() { Label = "Out of Stock", Value = statusOutOfStock },
            new() { Label = "Hidden", Value = statusHidden },
        ];

        // ── Donut: Product Type Distribution ──
        int typeNewArrival = 0, typeBestSeller = 0, typeFeatured = 0, typeRegular = 0;
        foreach (var (_, doc) in activeProducts)
        {
            if (doc.NewArrival) typeNewArrival++;
            else if (doc.BestSeller) typeBestSeller++;
            else if (doc.Featured) typeFeatured++;
            else typeRegular++;
        }
        dto.ProductTypeDistribution =
        [
            new() { Label = "New Arrival", Value = typeNewArrival },
            new() { Label = "Best Seller", Value = typeBestSeller },
            new() { Label = "Featured", Value = typeFeatured },
            new() { Label = "Regular", Value = typeRegular },
        ];

        // ── Bar Chart 1: Top 10 Highest Revenue Products ──
        var productRevenue = new Dictionary<string, (string Name, string? Image, double Revenue)>();
        foreach (var (pid, _, v) in activeVariants)
        {
            var prod = activeProducts.FirstOrDefault(p => p.Id == pid).Doc;
            var sellingPrice = v.SellingPrice ?? 0;
            var stock = v.Sizes.Sum(s => s.Stock);
            var rev = sellingPrice * stock;
            if (productRevenue.ContainsKey(pid))
            {
                var e = productRevenue[pid];
                e.Revenue += rev;
                productRevenue[pid] = e;
            }
            else
            {
                productRevenue[pid] = (prod?.Name ?? pid, v.Images?.Primary?.Url ?? prod?.ThumbnailUrl, rev);
            }
        }
        dto.TopRevenueProducts = productRevenue
            .OrderByDescending(kv => kv.Value.Revenue)
            .Take(10)
            .Select(kv => new BarDataPoint { Label = kv.Value.Name, Value = Math.Round(kv.Value.Revenue, 2) })
            .ToList();

        // ── Bar Chart 2: Top 10 Most Profitable Products ──
        var productProfit = new Dictionary<string, (string Name, double Profit)>();
        foreach (var (pid, _, v) in activeVariants)
        {
            var prod = activeProducts.FirstOrDefault(p => p.Id == pid).Doc;
            var purchaseCost = v.PurchaseCost ?? 0;
            var packagingCost = v.PackagingCost ?? 0;
            var commission = v.FlipkartCommission ?? 0;
            var shipping = v.ShippingCharges ?? 0;
            var marketing = v.MarketingCost ?? 0;
            var other = v.OtherCharges ?? 0;
            var costPerUnit = purchaseCost + packagingCost + commission + shipping + marketing + other;
            var sellingPrice = v.SellingPrice ?? 0;
            var stock = v.Sizes.Sum(s => s.Stock);
            var profit = (sellingPrice - costPerUnit) * stock;
            if (productProfit.ContainsKey(pid))
            {
                var e = productProfit[pid];
                e.Profit += profit;
                productProfit[pid] = e;
            }
            else
            {
                productProfit[pid] = (prod?.Name ?? pid, profit);
            }
        }
        dto.TopProfitProducts = productProfit
            .Where(kv => kv.Value.Profit > 0)
            .OrderByDescending(kv => kv.Value.Profit)
            .Take(10)
            .Select(kv => new BarDataPoint { Label = kv.Value.Name, Value = Math.Round(kv.Value.Profit, 2) })
            .ToList();

        // ── Bar Chart 3: Current Stock per Product ──
        dto.StockPerProduct = activeProducts
            .Select(p =>
            {
                var stock = activeVariants.Where(v => v.ProductId == p.Id).Sum(v => v.Doc.Sizes.Sum(s => s.Stock));
                return new BarDataPoint { Label = p.Doc.Name, Value = stock };
            })
            .OrderByDescending(x => x.Value)
            .Take(10)
            .ToList();

        // ── Bar Chart 4: Purchase Cost vs Selling Price per Category ──
        var catCostPrice = new Dictionary<string, (double TotalCost, double TotalRevenue, long Count)>();
        foreach (var (pId, _, v) in activeVariants)
        {
            var product = activeProducts.FirstOrDefault(p => p.Id == pId).Doc;
            if (product == null) continue;
            if (!catCostPrice.ContainsKey(product.Category))
                catCostPrice[product.Category] = (0, 0, 0);
            var e = catCostPrice[product.Category];
            e.TotalCost += v.PurchaseCost ?? 0;
            e.TotalRevenue += v.SellingPrice ?? 0;
            e.Count++;
            catCostPrice[product.Category] = e;
        }
        dto.PurchaseCostVsSellingPrice = catCostPrice
            .Select(kv => new CategoryCostPriceDto
            {
                Category = kv.Key,
                PurchaseCost = Math.Round(kv.Value.TotalCost / kv.Value.Count, 2),
                SellingPrice = Math.Round(kv.Value.TotalRevenue / kv.Value.Count, 2),
            })
            .OrderBy(c => c.Category).ToList();

        // ── Low Stock Products ──
        var lowStock = new List<LowStockProductDto>();
        foreach (var (pid, doc) in activeProducts)
        {
            if (doc.LowStockThreshold == null || doc.LowStockThreshold <= 0) continue;
            var variantList = activeVariants.Where(v => v.ProductId == pid).ToList();
            var totalStk = variantList.Sum(v => v.Doc.Sizes.Sum(s => s.Stock));
            if (totalStk <= doc.LowStockThreshold.Value)
            {
                var firstVariant = variantList.FirstOrDefault().Doc;
                lowStock.Add(new LowStockProductDto
                {
                    ProductId = pid, ProductName = doc.Name,
                    ImageUrl = firstVariant?.Images?.Primary?.Url,
                    Category = doc.Category, Stock = totalStk,
                    SellingPrice = firstVariant?.SellingPrice ?? 0,
                });
            }
        }
        dto.LowStockProducts = lowStock.OrderBy(l => l.Stock).ToList();

        // ── Out of Stock Products ──
        var oosStock = activeVariants
            .GroupBy(v => v.ProductId)
            .Select(g => (ProductId: g.Key, Stock: g.Sum(v => v.Doc.Sizes.Sum(s => s.Stock))))
            .Where(x => x.Stock == 0)
            .ToList();
        dto.OutOfStockProducts = oosStock
            .Select(x =>
            {
                var prod = activeProducts.FirstOrDefault(p => p.Id == x.ProductId).Doc;
                return new OutOfStockProductDto
                {
                    ProductId = x.ProductId, ProductName = prod?.Name ?? string.Empty,
                    ImageUrl = activeVariants.FirstOrDefault(v => v.ProductId == x.ProductId).Doc?.Images?.Primary?.Url ?? prod?.ThumbnailUrl,
                    Category = prod?.Category ?? string.Empty, Stock = 0,
                };
            })
            .ToList();

        // ── Top Expensive Products (Top 5) ──
        dto.TopExpensiveProducts = activeVariants
            .Where(v => v.Doc.SellingPrice.HasValue && v.Doc.SellingPrice > 0)
            .OrderByDescending(v => v.Doc.SellingPrice)
            .Take(5)
            .Select(v =>
            {
                var prod = activeProducts.FirstOrDefault(p => p.Id == v.ProductId).Doc;
                return new ProductSummaryDto
                {
                    ProductId = v.ProductId, ProductName = prod?.Name ?? string.Empty,
                    ImageUrl = v.Doc.Images?.Primary?.Url, Category = prod?.Category ?? string.Empty,
                    SellingPrice = v.Doc.SellingPrice ?? 0,
                };
            })
            .ToList();

        // ── Most Profitable Products (Top 5, by total profit) ──
        dto.MostProfitableProducts = productProfit
            .Where(kv => kv.Value.Profit > 0)
            .OrderByDescending(kv => kv.Value.Profit)
            .Take(5)
            .Select(kv =>
            {
                var prod = activeProducts.FirstOrDefault(p => p.Id == kv.Key).Doc;
                var firstV = activeVariants.FirstOrDefault(v => v.ProductId == kv.Key).Doc;
                var purchaseCost = firstV?.PurchaseCost ?? 0;
                var packagingCost = firstV?.PackagingCost ?? 0;
                var commission = firstV?.FlipkartCommission ?? 0;
                var shipping = firstV?.ShippingCharges ?? 0;
                var marketing = firstV?.MarketingCost ?? 0;
                var other = firstV?.OtherCharges ?? 0;
                var costPerUnit = purchaseCost + packagingCost + commission + shipping + marketing + other;
                var sellingPrice = firstV?.SellingPrice ?? 0;
                var profitPct = costPerUnit > 0 ? (sellingPrice - costPerUnit) / costPerUnit * 100 : 0;
                return new ProductProfitDto
                {
                    ProductId = kv.Key, ProductName = prod?.Name ?? string.Empty,
                    ImageUrl = activeVariants.FirstOrDefault(v => v.ProductId == kv.Key).Doc?.Images?.Primary?.Url,
                    Category = prod?.Category ?? string.Empty, SellingPrice = sellingPrice,
                    TotalCost = costPerUnit, Profit = Math.Round(kv.Value.Profit, 2), ProfitPercent = Math.Round(profitPct, 1),
                };
            })
            .ToList();

        // ── Recently Added Products ──
        dto.RecentlyAddedProducts = activeProducts
            .OrderByDescending(p => p.Doc.CreatedAt)
            .Take(5)
            .Select(p =>
            {
                var firstV = activeVariants.FirstOrDefault(v => v.ProductId == p.Id).Doc;
                return new ProductSummaryDto
                {
                    ProductId = p.Id, ProductName = p.Doc.Name,
                    ImageUrl = firstV?.Images?.Primary?.Url, Category = p.Doc.Category,
                    SellingPrice = firstV?.SellingPrice ?? 0, CreatedAt = p.Doc.CreatedAt,
                };
            })
            .ToList();

        // ── TodaySnapshot (Summary Panel) ──
        dto.TodaySnapshot = new TodaySnapshotDto
        {
            Products = dto.SummaryCards.TotalProducts,
            Variants = dto.SummaryCards.TotalVariants,
            TotalUnits = dto.SummaryCards.InventoryQuantity,
            InventoryCost = dto.SummaryCards.InventoryValue,
            PotentialRevenue = dto.SummaryCards.PotentialSalesValue,
            ExpectedProfit = dto.SummaryCards.ExpectedProfit,
            AverageMarginPercent = dto.SummaryCards.AverageProfitPercent,
            AverageRoiPercent = dto.SummaryCards.AverageRoiPercent,
        };
    }

    private static void ComputeSalesSummary(DashboardDto dto, List<(string Id, SaleDocument Data)> sales)
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        double totalRevenue = 0, totalProfit = 0;
        double todayRevenue = 0, todayProfit = 0;
        double monthlyRevenue = 0, monthlyProfit = 0;
        int totalOrders = 0, todayOrders = 0, monthlyOrders = 0;

        var revByCategory = new Dictionary<string, double>();
        var revByChannel = new Dictionary<string, double>();
        var profitByCategory = new Dictionary<string, double>();
        var ordersByChannel = new Dictionary<string, int>();
        var payMethodDist = new Dictionary<string, int>();
        var monthlyTrend = new Dictionary<string, (double Revenue, double Profit, int Orders)>();
        var topProducts = new Dictionary<string, (string Name, string? Image, int Quantity, double Revenue, double Profit)>();

        foreach (var (_, s) in sales)
        {
            totalRevenue += s.AmountReceived;
            totalProfit += s.Profit;
            totalOrders++;
            AddToDict(revByCategory, s.Category, s.AmountReceived);
            AddToDict(revByChannel, s.SaleChannel, s.AmountReceived);
            AddToDict(profitByCategory, s.Category, s.Profit);
            AddToDictInt(ordersByChannel, s.SaleChannel, 1);
            AddToDictInt(payMethodDist, s.PaymentMethod, 1);

            var monthKey = s.SoldAt.ToString("yyyy-MM");
            if (!monthlyTrend.ContainsKey(monthKey))
                monthlyTrend[monthKey] = (0, 0, 0);
            var mt = monthlyTrend[monthKey];
            mt.Revenue += s.AmountReceived;
            mt.Profit += s.Profit;
            mt.Orders++;
            monthlyTrend[monthKey] = mt;

            if (!topProducts.ContainsKey(s.ProductId))
                topProducts[s.ProductId] = (s.ProductName, s.ProductImage, 0, 0, 0);
            var tp = topProducts[s.ProductId];
            tp.Quantity += s.Quantity;
            tp.Revenue += s.AmountReceived;
            tp.Profit += s.Profit;
            topProducts[s.ProductId] = tp;

            if (s.SoldAt >= todayStart)
            {
                todayRevenue += s.AmountReceived;
                todayProfit += s.Profit;
                todayOrders++;
            }
            if (s.SoldAt >= monthStart)
            {
                monthlyRevenue += s.AmountReceived;
                monthlyProfit += s.Profit;
                monthlyOrders++;
            }
        }

        dto.SalesSummary = new SalesSummaryDto
        {
            TotalRevenue = Math.Round(totalRevenue, 2),
            TotalProfit = Math.Round(totalProfit, 2),
            TotalOrders = totalOrders,
            TodayRevenue = Math.Round(todayRevenue, 2),
            TodayProfit = Math.Round(todayProfit, 2),
            TodayOrders = todayOrders,
            MonthlyRevenue = Math.Round(monthlyRevenue, 2),
            MonthlyProfit = Math.Round(monthlyProfit, 2),
            MonthlyOrders = monthlyOrders,
            RevenueByCategory = revByCategory.Select(kv => new ChartDataPoint { Label = kv.Key, Value = Math.Round(kv.Value, 2) }).OrderByDescending(x => x.Value).ToList(),
            RevenueByChannel = revByChannel.Select(kv => new ChartDataPoint { Label = kv.Key, Value = Math.Round(kv.Value, 2) }).OrderByDescending(x => x.Value).ToList(),
            ProfitByCategory = profitByCategory.Select(kv => new ChartDataPoint { Label = kv.Key, Value = Math.Round(kv.Value, 2) }).OrderByDescending(x => x.Value).ToList(),
            OrdersByChannel = ordersByChannel.Select(kv => new ChartDataPoint { Label = kv.Key, Value = kv.Value }).OrderByDescending(x => x.Value).ToList(),
            PaymentMethodDistribution = payMethodDist.Select(kv => new ChartDataPoint { Label = kv.Key, Value = kv.Value }).OrderByDescending(x => x.Value).ToList(),
            MonthlyTrend = monthlyTrend.Select(kv => new MonthlySalesTrend
            {
                Month = kv.Key,
                Revenue = Math.Round(kv.Value.Revenue, 2),
                Profit = Math.Round(kv.Value.Profit, 2),
                Orders = kv.Value.Orders,
            }).OrderBy(x => x.Month).ToList(),
            TopSellingProducts = topProducts
                .OrderByDescending(kv => kv.Value.Quantity)
                .Take(10)
                .Select(kv => new ProductSalesDto
                {
                    ProductId = kv.Key,
                    ProductName = kv.Value.Name,
                    ProductImage = kv.Value.Image,
                    Quantity = kv.Value.Quantity,
                    Revenue = Math.Round(kv.Value.Revenue, 2),
                    Profit = Math.Round(kv.Value.Profit, 2),
                })
                .ToList(),
        };
    }

    private static void AddToDict(Dictionary<string, double> dict, string key, double value)
    {
        if (!dict.ContainsKey(key)) dict[key] = 0;
        dict[key] += value;
    }

    private static void AddToDictInt(Dictionary<string, int> dict, string key, int value)
    {
        if (!dict.ContainsKey(key)) dict[key] = 0;
        dict[key] += value;
    }
}
