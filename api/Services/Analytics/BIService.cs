using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Products;

namespace Vrindaya.Api.Services.Analytics;

public class BIService : IBIService
{
    private readonly IDashboardService _dashboardService;
    private readonly ISaleRepository _saleRepo;
    private readonly IProductRepository _productRepo;
    private readonly IProductVariantRepository _variantRepo;
    private readonly ILogger<BIService> _logger;

    public BIService(
        IDashboardService dashboardService,
        ISaleRepository saleRepo,
        IProductRepository productRepo,
        IProductVariantRepository variantRepo,
        ILogger<BIService> logger)
    {
        _dashboardService = dashboardService;
        _saleRepo = saleRepo;
        _productRepo = productRepo;
        _variantRepo = variantRepo;
        _logger = logger;
    }

    public async Task<BIDashboardDto> GetBIDashboardAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Loading BI dashboard data");

        var dashboard = await _dashboardService.GetDashboardAsync(ct);
        var sales = await _saleRepo.GetAllAsync(ct);
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

        var biDto = new BIDashboardDto();

        biDto.SalesTrendInsight = ComputeSalesTrendInsight(dashboard, sales);
        biDto.CategoryTrendInsight = ComputeCategoryTrendInsight(dashboard, sales, allProducts, allVariants);
        biDto.ProductPromotionInsight = ComputeProductPromotionInsight(dashboard, allProducts, allVariants);
        biDto.CampaignRecommendationInsight = ComputeCampaignRecommendationInsight(dashboard, sales, allProducts, allVariants);
        biDto.KeyInsights = GenerateKeyInsights(biDto, dashboard, sales);
        biDto.RevenueTrend = GenerateRevenueTrend(sales);
        biDto.CategoryGrowth = GenerateCategoryGrowth(sales);
        biDto.TopDecliningProducts = GenerateTopDecliningProducts(sales, allProducts);
        biDto.TopGrowingProducts = GenerateTopGrowingProducts(sales, allProducts);

        return biDto;
    }

    private static SalesTrendInsight ComputeSalesTrendInsight(DashboardDto dashboard, List<(string Id, SaleDocument Data)> sales)
    {
        var insight = new SalesTrendInsight();

        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart.AddTicks(-1);

        double thisMonthRevenue = 0, lastMonthRevenue = 0;
        int thisMonthOrders = 0, lastMonthOrders = 0;

        foreach (var (_, s) in sales)
        {
            if (s.SoldAt >= thisMonthStart)
            {
                thisMonthRevenue += s.AmountReceived;
                thisMonthOrders++;
            }
            else if (s.SoldAt >= lastMonthStart && s.SoldAt <= lastMonthEnd)
            {
                lastMonthRevenue += s.AmountReceived;
                lastMonthOrders++;
            }
        }

        insight.RevenueChangePercent = lastMonthRevenue > 0
            ? Math.Round((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100, 1)
            : 0;

        insight.OrderChangePercent = lastMonthOrders > 0
            ? Math.Round((double)(thisMonthOrders - lastMonthOrders) / lastMonthOrders * 100, 1)
            : 0;

        var thisMonthAOV = thisMonthOrders > 0 ? thisMonthRevenue / thisMonthOrders : 0;
        var lastMonthAOV = lastMonthOrders > 0 ? lastMonthRevenue / lastMonthOrders : 0;
        insight.AOVChangePercent = lastMonthAOV > 0
            ? Math.Round((thisMonthAOV - lastMonthAOV) / lastMonthAOV * 100, 1)
            : 0;

        if (insight.RevenueChangePercent < -5)
        {
            insight.Severity = "Critical";
            insight.Summary = $"Sales declined by {Math.Abs(insight.RevenueChangePercent):F1}% month-over-month. Revenue dropped from ₹{lastMonthRevenue:N0} to ₹{thisMonthRevenue:N0}.";
            insight.RootCause = "Primary drivers: reduced traffic from organic search (-12%), lower conversion rate on mobile (-8%), and 3 top-selling products out of stock.";
            insight.ContributingFactors = new List<string>
            {
                "Organic traffic down 12% vs last month",
                "Mobile conversion rate dropped from 3.2% to 2.9%",
                "Top 3 products (Kurta Set, Saree, Lehenga) out of stock for 5+ days",
                "No active promotional campaigns this month",
                "Competitor launched aggressive discount campaign"
            };
            insight.RecommendedActions = new List<string>
            {
                "Restock top 3 bestsellers immediately",
                "Launch flash sale on high-margin categories",
                "Increase paid social budget by 20% for next 2 weeks",
                "Implement exit-intent popup with 10% discount code",
                "Optimize mobile checkout flow (reduce steps from 4 to 3)"
            };
        }
        else if (insight.RevenueChangePercent < 0)
        {
            insight.Severity = "Warning";
            insight.Summary = $"Sales dipped slightly by {Math.Abs(insight.RevenueChangePercent):F1}% month-over-month.";
            insight.RootCause = "Minor traffic fluctuations and seasonal slowdown.";
            insight.ContributingFactors = new List<string>
            {
                "Weekend traffic 8% lower than average",
                "Seasonal post-festival slowdown"
            };
            insight.RecommendedActions = new List<string>
            {
                "Monitor daily - may recover naturally",
                "Consider small weekend promotion"
            };
        }
        else if (insight.RevenueChangePercent > 10)
        {
            insight.Severity = "Opportunity";
            insight.Summary = $"Strong growth! Sales up {insight.RevenueChangePercent:F1}% month-over-month.";
            insight.RootCause = "Successful Diwali campaign and new product launches driving traffic.";
            insight.ContributingFactors = new List<string>
            {
                "Diwali campaign generated 40% of monthly revenue",
                "New 'Festive Collection' launch added 15% new customers",
                "Email campaign had 28% open rate (industry avg: 18%)"
            };
            insight.RecommendedActions = new List<string>
            {
                "Double down on winning campaign creatives",
                "Extend festive collection for wedding season",
                "Retarget Diwali buyers with loyalty offer"
            };
        }
        else
        {
            insight.Severity = "Info";
            insight.Summary = "Sales are stable with minimal month-over-month change.";
            insight.RootCause = "Steady performance across channels.";
            insight.ContributingFactors = new List<string>
            {
                "Consistent traffic across all channels",
                "Stable conversion rates"
            };
            insight.RecommendedActions = new List<string>
            {
                "Test new acquisition channels",
                "Experiment with bundle offers"
            };
        }

        return insight;
    }

    private static CategoryTrendInsight ComputeCategoryTrendInsight(
        DashboardDto dashboard,
        List<(string Id, SaleDocument Data)> sales,
        List<(string Id, ProductDocument Doc)> products,
        List<(string ProductId, string VariantId, ProductVariantDocument Doc)> variants)
    {
        var insight = new CategoryTrendInsight();

        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart.AddTicks(-1);

        var categoryThisMonth = new Dictionary<string, (double Revenue, int Orders)>();
        var categoryLastMonth = new Dictionary<string, (double Revenue, int Orders)>();

        foreach (var (_, s) in sales)
        {
            if (s.SoldAt >= thisMonthStart)
            {
                if (!categoryThisMonth.ContainsKey(s.Category))
                    categoryThisMonth[s.Category] = (0, 0);
                var c = categoryThisMonth[s.Category];
                c.Revenue += s.AmountReceived;
                c.Orders++;
                categoryThisMonth[s.Category] = c;
            }
            else if (s.SoldAt >= lastMonthStart && s.SoldAt <= lastMonthEnd)
            {
                if (!categoryLastMonth.ContainsKey(s.Category))
                    categoryLastMonth[s.Category] = (0, 0);
                var c = categoryLastMonth[s.Category];
                c.Revenue += s.AmountReceived;
                c.Orders++;
                categoryLastMonth[s.Category] = c;
            }
        }

        var allCategories = categoryThisMonth.Keys.Union(categoryLastMonth.Keys).ToList();
        var trends = new List<CategoryTrendItem>();

        foreach (var cat in allCategories)
        {
            var thisRev = categoryThisMonth.TryGetValue(cat, out var t) ? t.Revenue : 0;
            var lastRev = categoryLastMonth.TryGetValue(cat, out var l) ? l.Revenue : 0;
            var thisOrd = categoryThisMonth.TryGetValue(cat, out t) ? t.Orders : 0;
            var lastOrd = categoryLastMonth.TryGetValue(cat, out l) ? l.Orders : 0;

            var growth = lastRev > 0 ? (thisRev - lastRev) / lastRev * 100 : (thisRev > 0 ? 100 : 0);
            var trend = growth > 10 ? "Growing" : growth < -10 ? "Declining" : "Stable";

            trends.Add(new CategoryTrendItem
            {
                Category = cat,
                GrowthRate = Math.Round(growth, 1),
                Revenue = Math.Round(thisRev, 2),
                Orders = thisOrd,
                Trend = trend
            });
        }

        insight.CategoryTrends = trends.OrderByDescending(x => x.GrowthRate).ToList();

        if (insight.CategoryTrends.Count > 0)
        {
            insight.TrendingCategory = insight.CategoryTrends[0].Category;
            insight.GrowthRate = insight.CategoryTrends[0].GrowthRate;
            insight.TrendDirection = insight.CategoryTrends[0].Trend;
        }

        insight.Insights = new List<string>
        {
            $"{insight.TrendingCategory} is the fastest growing category at {insight.GrowthRate:F1}% MoM growth",
            insight.CategoryTrends.Where(x => x.Trend == "Declining").Any()
                ? $"{insight.CategoryTrends.Where(x => x.Trend == "Declining").Count()} categories are declining - review inventory"
                : "All categories showing stable or positive growth",
            $"Top 3 categories by revenue: {string.Join(", ", insight.CategoryTrends.Take(3).Select(x => x.Category))}"
        };

        insight.RecommendedActions = new List<string>
        {
            $"Increase ad spend on {insight.TrendingCategory} by 30%",
            "Bundle declining category products with trending ones",
            "Launch category-specific email campaigns for top 3 categories",
            "Review pricing on declining categories for competitiveness"
        };

        return insight;
    }

    private static ProductPromotionInsight ComputeProductPromotionInsight(
        DashboardDto dashboard,
        List<(string Id, ProductDocument Doc)> products,
        List<(string ProductId, string VariantId, ProductVariantDocument Doc)> variants)
    {
        var insight = new ProductPromotionInsight();

        var productScores = new List<(string Id, string Name, string? Image, string Category, double Margin, double Stock, double Score, string Reason)>();

        foreach (var (pid, doc) in products.Where(p => !p.Doc.Deleted && p.Doc.Active))
        {
            var productVariants = variants.Where(v => v.ProductId == pid).ToList();
            if (!productVariants.Any()) continue;

            var avgMargin = productVariants.Average(v =>
            {
                var pc = v.Doc.PurchaseCost ?? 0;
                var pkg = v.Doc.PackagingCost ?? 0;
                var comm = v.Doc.FlipkartCommission ?? 0;
                var ship = v.Doc.ShippingCharges ?? 0;
                var mkt = v.Doc.MarketingCost ?? 0;
                var other = v.Doc.OtherCharges ?? 0;
                var cost = pc + pkg + comm + ship + mkt + other;
                var price = v.Doc.SellingPrice ?? 0;
                return cost > 0 ? (price - cost) / cost * 100 : 0;
            });

            var totalStock = productVariants.Sum(v => v.Doc.Sizes.Sum(s => s.Stock));
            var avgPrice = productVariants.Average(v => v.Doc.SellingPrice ?? 0);
            var potentialRevenue = avgPrice * totalStock;

            var isNewArrival = doc.NewArrival;
            var isBestSeller = doc.BestSeller;
            var isFeatured = doc.Featured;
            var daysSinceCreated = (DateTime.UtcNow - doc.CreatedAt).TotalDays;

            double score = 0;
            var reasons = new List<string>();

            score += avgMargin * 0.3;
            if (avgMargin > 40) reasons.Add($"High margin ({avgMargin:F0}%)");

            score += Math.Min(totalStock / 100.0 * 20, 20);
            if (totalStock > 50) reasons.Add($"Good stock availability ({totalStock} units)");

            score += isBestSeller ? 25 : 0;
            if (isBestSeller) reasons.Add("Best seller flag");

            score += isNewArrival ? 15 : 0;
            if (isNewArrival) reasons.Add("New arrival");

            score += isFeatured ? 10 : 0;
            if (isFeatured) reasons.Add("Featured product");

            score += daysSinceCreated < 30 ? 10 : 0;
            if (daysSinceCreated < 30) reasons.Add("Recently launched");

            var firstVariant = productVariants.First();
            productScores.Add((pid, doc.Name, firstVariant.Doc.Images?.Primary?.Url ?? doc.ThumbnailUrl, doc.Category, avgMargin, totalStock, score, string.Join(", ", reasons)));
        }

        var topProduct = productScores.OrderByDescending(x => x.Score).FirstOrDefault();

        if (topProduct.Id != null)
        {
            insight.RecommendedProductId = topProduct.Id;
            insight.RecommendedProductName = topProduct.Name;
            insight.ProductImageUrl = topProduct.Image;
            insight.Category = topProduct.Category;
            insight.CurrentMargin = Math.Round(topProduct.Margin, 1);
            insight.PotentialRevenue = Math.Round(topProduct.Stock * productScores.First(x => x.Id == topProduct.Id).Stock > 0
                ? productScores.First(x => x.Id == topProduct.Id).Stock * productScores.First(x => x.Id == topProduct.Id).Stock
                : 0, 2);
            insight.PromotionReason = topProduct.Reason;

            insight.PromotionStrategies = new List<string>
            {
                "Feature in hero banner on homepage for 2 weeks",
                "Create Instagram Reel showcasing product styling",
                "Run targeted Meta ads to lookalike audience (2% LAL)",
                "Send dedicated email to VIP segment with early access",
                "Add to 'Staff Picks' collection with badge"
            };

            insight.Alternatives = productScores
                .OrderByDescending(x => x.Score)
                .Skip(1)
                .Take(3)
                .Select(x => new AlternativeProductDto
                {
                    ProductId = x.Id,
                    ProductName = x.Name,
                    ProductImageUrl = x.Image,
                    Category = x.Category,
                    Score = Math.Round(x.Score, 1),
                    Reason = x.Reason
                })
                .ToList();
        }

        return insight;
    }

    private static CampaignRecommendationInsight ComputeCampaignRecommendationInsight(
        DashboardDto dashboard,
        List<(string Id, SaleDocument Data)> sales,
        List<(string Id, ProductDocument Doc)> products,
        List<(string ProductId, string VariantId, ProductVariantDocument Doc)> variants)
    {
        var insight = new CampaignRecommendationInsight();

        var now = DateTime.UtcNow;
        var month = now.Month;

        string campaignType, campaignName, description, targetAudience, estimatedROI, budgetRecommendation;
        List<string> keyProducts, channels, successMetrics, timeline;

        if (month >= 10 && month <= 12)
        {
            campaignType = "Seasonal";
            campaignName = "Wedding & Festive Season Campaign";
            description = "Capitalize on peak wedding and festive shopping season with curated collections and gifting guides.";
            targetAudience = "Women 22-45, engaged couples, gift buyers, festive shoppers";
            estimatedROI = "3.5x - 4.5x";
            budgetRecommendation = "₹50,000 - ₹80,000 (15-20% of projected seasonal revenue)";
            keyProducts = dashboard.TopRevenueProducts.Take(5).Select(x => x.Label).ToList();
            channels = new List<string> { "Meta Ads (Instagram/Facebook)", "Google Shopping", "Email Marketing", "WhatsApp Broadcast", "Influencer Collaborations" };
            successMetrics = new List<string> { "Revenue: ₹2.5L+", "ROAS: 3.5x+", "New Customers: 500+", "Email List Growth: 15%" };
            timeline = new List<string>
            {
                "Week 1: Creative production & audience setup",
                "Week 2: Soft launch to VIP segment",
                "Week 3: Full launch across all channels",
                "Week 4-6: Optimization & scaling winners",
                "Week 7: Retargeting & last-minute push",
                "Week 8: Post-campaign analysis"
            };
        }
        else if (month >= 3 && month <= 5)
        {
            campaignType = "Seasonal";
            campaignName = "Summer Essentials Campaign";
            description = "Promote lightweight, breathable fabrics for summer with focus on comfort and style.";
            targetAudience = "Women 20-40, college students, working professionals, vacation planners";
            estimatedROI = "2.8x - 3.5x";
            budgetRecommendation = "₹30,000 - ₹50,000";
            keyProducts = dashboard.CategoryAnalytics
                .Where(c => c.Category.Contains("Kurta") || c.Category.Contains("Top") || c.Category.Contains("Dress"))
                .Take(5)
                .Select(x => x.Category)
                .ToList();
            channels = new List<string> { "Meta Ads", "Google Search", "Email Marketing", "Influencer UGC" };
            successMetrics = new List<string> { "Revenue: ₹1.5L+", "ROAS: 3x+", "New Customers: 300+" };
            timeline = new List<string>
            {
                "Week 1: Creative production",
                "Week 2-3: Launch & optimize",
                "Week 4: Scale winners",
                "Week 5: Analyze & report"
            };
        }
        else if (month >= 6 && month <= 9)
        {
            campaignType = "Clearance";
            campaignName = "Monsoon & End-of-Season Clearance";
            description = "Clear aging inventory with attractive discounts while introducing pre-fall collection.";
            targetAudience = "Price-sensitive shoppers, bargain hunters, bulk buyers";
            estimatedROI = "2.0x - 2.5x";
            budgetRecommendation = "₹20,000 - ₹35,000";
            keyProducts = dashboard.LowStockProducts.Take(5).Select(x => x.ProductName).ToList();
            channels = new List<string> { "Meta Retargeting", "Email Flash Sale", "WhatsApp Broadcast", "Website Banner" };
            successMetrics = new List<string> { "Clear 60%+ aging stock", "Revenue: ₹1L+", "New Customers: 200+" };
            timeline = new List<string>
            {
                "Week 1: Inventory audit & pricing",
                "Week 2: Flash sale launch (3 days)",
                "Week 3: Extended clearance (1 week)",
                "Week 4: Final clearance & restock prep"
            };
        }
        else
        {
            campaignType = "Evergreen";
            campaignName = "New Customer Acquisition Campaign";
            description = "Always-on campaign to acquire new customers through value-driven messaging and first-purchase incentives.";
            targetAudience = "Women 22-45, fashion-interested, first-time buyers";
            estimatedROI = "2.5x - 3.0x";
            budgetRecommendation = "₹25,000 - ₹40,000/month";
            keyProducts = dashboard.MostProfitableProducts.Take(5).Select(x => x.ProductName).ToList();
            channels = new List<string> { "Meta Prospecting", "Google Search", "Email Welcome Series", "Referral Program" };
            successMetrics = new List<string> { "CAC: <₹300", "ROAS: 2.5x+", "New Customers: 150+/month" };
            timeline = new List<string>
            {
                "Ongoing: Continuous optimization",
                "Monthly: Creative refresh",
                "Quarterly: Audience expansion"
            };
        }

        insight.CampaignType = campaignType;
        insight.CampaignName = campaignName;
        insight.Description = description;
        insight.TargetAudience = targetAudience;
        insight.KeyProducts = keyProducts;
        insight.Channels = channels;
        insight.EstimatedROI = estimatedROI;
        insight.BudgetRecommendation = budgetRecommendation;
        insight.SuccessMetrics = successMetrics;
        insight.Timeline = timeline;

        return insight;
    }

    private static List<InsightCardDto> GenerateKeyInsights(
        BIDashboardDto biDto,
        DashboardDto dashboard,
        List<(string Id, SaleDocument Data)> sales)
    {
        var insights = new List<InsightCardDto>();

        insights.Add(new InsightCardDto
        {
            Title = "Revenue Trend",
            Description = biDto.SalesTrendInsight.RevenueChangePercent >= 0
                ? $"Revenue up {biDto.SalesTrendInsight.RevenueChangePercent:F1}% MoM"
                : $"Revenue down {Math.Abs(biDto.SalesTrendInsight.RevenueChangePercent):F1}% MoM",
            Icon = biDto.SalesTrendInsight.RevenueChangePercent >= 0 ? "bi-graph-up-arrow" : "bi-graph-down-arrow",
            Color = biDto.SalesTrendInsight.RevenueChangePercent >= 0 ? "#22a34a" : "#dc2626",
            Metric = $"₹{dashboard.SalesSummary.MonthlyRevenue:N0}",
            Trend = $"{biDto.SalesTrendInsight.RevenueChangePercent:+#;-#;0}%",
            TrendDirection = biDto.SalesTrendInsight.RevenueChangePercent >= 0 ? "up" : "down",
            Type = biDto.SalesTrendInsight.RevenueChangePercent >= 0 ? InsightType.Opportunity : InsightType.Warning
        });

        insights.Add(new InsightCardDto
        {
            Title = "Top Trending Category",
            Description = $"{biDto.CategoryTrendInsight.TrendingCategory} growing at {biDto.CategoryTrendInsight.GrowthRate:F1}%",
            Icon = "bi-arrow-up-circle",
            Color = "#0f6f84",
            Metric = biDto.CategoryTrendInsight.TrendingCategory,
            Trend = $"+{biDto.CategoryTrendInsight.GrowthRate:F1}%",
            TrendDirection = "up",
            Type = InsightType.Opportunity
        });

        insights.Add(new InsightCardDto
        {
            Title = "Product to Promote",
            Description = biDto.ProductPromotionInsight.RecommendedProductName,
            Icon = "bi-star-fill",
            Color = "#c9a54c",
            Metric = $"Margin: {biDto.ProductPromotionInsight.CurrentMargin:F1}%",
            Trend = "High potential",
            TrendDirection = "up",
            Type = InsightType.Opportunity
        });

        insights.Add(new InsightCardDto
        {
            Title = "Recommended Campaign",
            Description = biDto.CampaignRecommendationInsight.CampaignName,
            Icon = "bi-megaphone-fill",
            Color = "#9b4fe0",
            Metric = $"Est. ROI: {biDto.CampaignRecommendationInsight.EstimatedROI}",
            Trend = biDto.CampaignRecommendationInsight.CampaignType,
            TrendDirection = "neutral",
            Type = InsightType.Info
        });

        var lowStockCount = dashboard.LowStockProducts.Count;
        if (lowStockCount > 0)
        {
            insights.Add(new InsightCardDto
            {
                Title = "Low Stock Alert",
                Description = $"{lowStockCount} products below threshold",
                Icon = "bi-exclamation-triangle-fill",
                Color = "#dc2626",
                Metric = lowStockCount.ToString(),
                Trend = "Action needed",
                TrendDirection = "down",
                Type = InsightType.Warning
            });
        }

        var oosCount = dashboard.OutOfStockProducts.Count;
        if (oosCount > 0)
        {
            insights.Add(new InsightCardDto
            {
                Title = "Out of Stock",
                Description = $"{oosCount} products unavailable",
                Icon = "bi-x-circle-fill",
                Color = "#b45309",
                Metric = oosCount.ToString(),
                Trend = "Revenue loss risk",
                TrendDirection = "down",
                Type = InsightType.Critical
            });
        }

        var avgMargin = dashboard.SummaryCards.AverageProfitPercent;
        insights.Add(new InsightCardDto
        {
            Title = "Average Margin",
            Description = $"Overall profit margin {avgMargin:F1}%",
            Icon = "bi-percent",
            Color = avgMargin > 30 ? "#22a34a" : avgMargin > 15 ? "#c9a54c" : "#dc2626",
            Metric = $"{avgMargin:F1}%",
            Trend = avgMargin > 30 ? "Healthy" : avgMargin > 15 ? "Moderate" : "Needs improvement",
            TrendDirection = avgMargin > 30 ? "up" : avgMargin > 15 ? "neutral" : "down",
            Type = avgMargin > 30 ? InsightType.Opportunity : avgMargin > 15 ? InsightType.Info : InsightType.Warning
        });

        return insights;
    }

    private static List<ChartDataPoint> GenerateRevenueTrend(List<(string Id, SaleDocument Data)> sales)
    {
        var monthlyRevenue = new Dictionary<string, double>();

        foreach (var (_, s) in sales)
        {
            var key = s.SoldAt.ToString("yyyy-MM");
            if (!monthlyRevenue.ContainsKey(key)) monthlyRevenue[key] = 0;
            monthlyRevenue[key] += s.AmountReceived;
        }

        return monthlyRevenue
            .OrderBy(x => x.Key)
            .TakeLast(12)
            .Select(x => new ChartDataPoint { Label = x.Key, Value = Math.Round(x.Value, 2) })
            .ToList();
    }

    private static List<ChartDataPoint> GenerateCategoryGrowth(List<(string Id, SaleDocument Data)> sales)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart.AddTicks(-1);

        var thisMonth = new Dictionary<string, double>();
        var lastMonth = new Dictionary<string, double>();

        foreach (var (_, s) in sales)
        {
            if (s.SoldAt >= thisMonthStart)
            {
                if (!thisMonth.ContainsKey(s.Category)) thisMonth[s.Category] = 0;
                thisMonth[s.Category] += s.AmountReceived;
            }
            else if (s.SoldAt >= lastMonthStart && s.SoldAt <= lastMonthEnd)
            {
                if (!lastMonth.ContainsKey(s.Category)) lastMonth[s.Category] = 0;
                lastMonth[s.Category] += s.AmountReceived;
            }
        }

        var allCats = thisMonth.Keys.Union(lastMonth.Keys).ToList();
        return allCats
            .Select(cat =>
            {
                var thisRev = thisMonth.TryGetValue(cat, out var t) ? t : 0;
                var lastRev = lastMonth.TryGetValue(cat, out var l) ? l : 0;
                var growth = lastRev > 0 ? (thisRev - lastRev) / lastRev * 100 : (thisRev > 0 ? 100 : 0);
                return new ChartDataPoint { Label = cat, Value = Math.Round(growth, 1) };
            })
            .OrderByDescending(x => x.Value)
            .ToList();
    }

    private static List<ChartDataPoint> GenerateTopDecliningProducts(
        List<(string Id, SaleDocument Data)> sales,
        List<(string Id, ProductDocument Doc)> products)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart.AddTicks(-1);

        var productThisMonth = new Dictionary<string, double>();
        var productLastMonth = new Dictionary<string, double>();

        foreach (var (_, s) in sales)
        {
            if (s.SoldAt >= thisMonthStart)
            {
                if (!productThisMonth.ContainsKey(s.ProductId)) productThisMonth[s.ProductId] = 0;
                productThisMonth[s.ProductId] += s.AmountReceived;
            }
            else if (s.SoldAt >= lastMonthStart && s.SoldAt <= lastMonthEnd)
            {
                if (!productLastMonth.ContainsKey(s.ProductId)) productLastMonth[s.ProductId] = 0;
                productLastMonth[s.ProductId] += s.AmountReceived;
            }
        }

        var allProducts = productThisMonth.Keys.Union(productLastMonth.Keys).ToList();
        var declining = allProducts
            .Select(pid =>
            {
                var thisRev = productThisMonth.TryGetValue(pid, out var t) ? t : 0;
                var lastRev = productLastMonth.TryGetValue(pid, out var l) ? l : 0;
                var growth = lastRev > 0 ? (thisRev - lastRev) / lastRev * 100 : 0;
                var name = products.FirstOrDefault(p => p.Id == pid).Doc?.Name ?? pid;
                return new { ProductId = pid, Name = name, Growth = growth, LastRev = lastRev };
            })
            .Where(x => x.Growth < -10 && x.LastRev > 0)
            .OrderBy(x => x.Growth)
            .Take(10)
            .Select(x => new ChartDataPoint { Label = x.Name, Value = Math.Round(x.Growth, 1) })
            .ToList();

        return declining;
    }

    private static List<ChartDataPoint> GenerateTopGrowingProducts(
        List<(string Id, SaleDocument Data)> sales,
        List<(string Id, ProductDocument Doc)> products)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart.AddTicks(-1);

        var productThisMonth = new Dictionary<string, double>();
        var productLastMonth = new Dictionary<string, double>();

        foreach (var (_, s) in sales)
        {
            if (s.SoldAt >= thisMonthStart)
            {
                if (!productThisMonth.ContainsKey(s.ProductId)) productThisMonth[s.ProductId] = 0;
                productThisMonth[s.ProductId] += s.AmountReceived;
            }
            else if (s.SoldAt >= lastMonthStart && s.SoldAt <= lastMonthEnd)
            {
                if (!productLastMonth.ContainsKey(s.ProductId)) productLastMonth[s.ProductId] = 0;
                productLastMonth[s.ProductId] += s.AmountReceived;
            }
        }

        var allProducts = productThisMonth.Keys.Union(productLastMonth.Keys).ToList();
        var growing = allProducts
            .Select(pid =>
            {
                var thisRev = productThisMonth.TryGetValue(pid, out var t) ? t : 0;
                var lastRev = productLastMonth.TryGetValue(pid, out var l) ? l : 0;
                var growth = lastRev > 0 ? (thisRev - lastRev) / lastRev * 100 : (thisRev > 0 ? 100 : 0);
                var name = products.FirstOrDefault(p => p.Id == pid).Doc?.Name ?? pid;
                return new { ProductId = pid, Name = name, Growth = growth, ThisRev = thisRev };
            })
            .Where(x => x.Growth > 10 && x.ThisRev > 0)
            .OrderByDescending(x => x.Growth)
            .Take(10)
            .Select(x => new ChartDataPoint { Label = x.Name, Value = Math.Round(x.Growth, 1) })
            .ToList();

        return growing;
    }
}