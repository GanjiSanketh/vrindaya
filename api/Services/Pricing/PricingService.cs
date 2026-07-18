using Microsoft.AspNetCore.Http;
using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Pricing;
using Vrindaya.Api.Helpers;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;
using System.Security.Claims;

namespace Vrindaya.Api.Services.Pricing;

public class PricingService : IPricingService
{
    private readonly IPricingRepository _pricingRepository;
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IProductRepository _productRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IPricingHistoryRepository _historyRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IDateTimeProvider _dateTimeProvider;

    public PricingService(
        IPricingRepository pricingRepository,
        IInventoryVariantRepository variantRepository,
        IProductRepository productRepository,
        IAuditLogService auditLogService,
        IPricingHistoryRepository historyRepository,
        IHttpContextAccessor httpContextAccessor,
        IDateTimeProvider dateTimeProvider)
    {
        _pricingRepository = pricingRepository;
        _variantRepository = variantRepository;
        _productRepository = productRepository;
        _auditLogService = auditLogService;
        _historyRepository = historyRepository;
        _httpContextAccessor = httpContextAccessor;
        _dateTimeProvider = dateTimeProvider;
    }

    private string GetCurrentUserEmail() =>
        _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email)
        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("email") ?? "unknown";

    public async Task<PricingResponse> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _pricingRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Pricing", id);
        return await ToResponseAsync(id, doc, cancellationToken);
    }

    public async Task<PagedResult<PricingResponse>> GetPricingAsync(PricingQuery query, CancellationToken cancellationToken)
    {
        var page = await _pricingRepository.GetAllAsync(
            query.Cursor, query.PageSize, query.Search, query.Marketplace,
            query.IsActive, query.InventoryVariantId,
            query.SortBy ?? "marketplace", query.SortDescending, cancellationToken);

        var responses = new List<PricingResponse>();
        foreach (var (id, data) in page.Items)
        {
            responses.Add(await ToResponseAsync(id, data, cancellationToken));
        }

        return new PagedResult<PricingResponse>
        {
            Items = responses,
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    public async Task<List<PricingResponse>> GetByVariantIdAsync(string variantId, CancellationToken cancellationToken)
    {
        var docs = await _pricingRepository.GetByVariantIdAsync(variantId, cancellationToken);
        var responses = new List<PricingResponse>();
        foreach (var (id, data) in docs)
        {
            responses.Add(await ToResponseAsync(id, data, cancellationToken));
        }
        return responses;
    }

    public async Task<PricingResponse> CreateAsync(CreatePricingRequest request, CancellationToken cancellationToken)
    {
        var variant = await _variantRepository.GetByIdAsync(request.InventoryVariantId, cancellationToken)
            ?? throw new NotFoundException("InventoryVariant", request.InventoryVariantId);

        if (await _pricingRepository.ExistsByVariantAndMarketplaceAsync(request.InventoryVariantId, request.Marketplace, null, cancellationToken))
        {
            throw new ConflictException($"A pricing record for variant '{request.InventoryVariantId}' on marketplace '{request.Marketplace}' already exists.");
        }

        var now = _dateTimeProvider.UtcNow;
        var user = GetCurrentUserEmail();

        var doc = BuildDocument(request, now, user);
        var id = await _pricingRepository.CreateAsync(doc, cancellationToken);

        try { await _auditLogService.LogCreateAsync("Pricing", id, $"{request.InventoryVariantId} / {request.Marketplace}", AuditLogService.SerializeJson(doc), user, null, null, "Pricing record created"); } catch { }
        return await ToResponseAsync(id, doc, cancellationToken);
    }

    public async Task<PricingResponse> UpdateAsync(string id, UpdatePricingRequest request, CancellationToken cancellationToken)
    {
        var existing = await _pricingRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Pricing", id);

        var oldListingPrice = existing.ListingPrice;
        var oldProfit = existing.ActualProfit;

        var beforeData = AuditLogService.SerializeJson(existing);
        var now = _dateTimeProvider.UtcNow;
        var user = GetCurrentUserEmail();

        ApplyUpdate(existing, request, now, user);
        await _pricingRepository.UpdateAsync(id, existing, cancellationToken);

        try { await _auditLogService.LogUpdateAsync("Pricing", id, $"{existing.InventoryVariantId} / {existing.Marketplace}", beforeData, AuditLogService.SerializeJson(existing), user, null, null, "Pricing record updated"); } catch { }

        if (oldListingPrice != existing.ListingPrice)
        {
            try
            {
                var variant = await _variantRepository.GetByIdAsync(existing.InventoryVariantId, cancellationToken);
                if (variant is not null)
                {
                    var productId = variant.ProductId;
                    if (!string.IsNullOrWhiteSpace(productId))
                    {
                        await _productRepository.UpdateAsync(productId, new Dictionary<string, object?>
                        {
                            ["price"] = existing.ListingPrice,
                            ["updatedAt"] = now,
                        }, cancellationToken);
                    }
                }
            }
            catch { }
        }

        try
        {
            await _historyRepository.CreateAsync(new Models.PricingHistoryDocument
            {
                PricingId = id,
                InventoryVariantId = existing.InventoryVariantId,
                Marketplace = existing.Marketplace,
                OldListingPrice = oldListingPrice,
                NewListingPrice = existing.ListingPrice,
                OldProfit = oldProfit,
                NewProfit = existing.ActualProfit,
                ChangedBy = user,
                Reason = request.Reason ?? "No reason provided",
                Timestamp = now,
            }, cancellationToken);
        }
        catch { }

        return await ToResponseAsync(id, existing, cancellationToken);
    }

    public async Task<List<ProductPricingSummaryResponse>> GetProductPricingAsync(string productId, CancellationToken cancellationToken)
    {
        var variants = await _variantRepository.GetAllByProductIdAsync(productId, cancellationToken);
        var results = new List<ProductPricingSummaryResponse>();

        foreach (var (variantId, variant) in variants)
        {
            var pricingDocs = await _pricingRepository.GetByVariantIdAsync(variantId, cancellationToken);

            foreach (var (pricingId, pricing) in pricingDocs)
            {
                results.Add(new ProductPricingSummaryResponse
                {
                    PricingId = pricingId,
                    InventoryVariantId = variantId,
                    Marketplace = pricing.Marketplace,
                    Color = variant.Color,
                    Size = variant.Size,
                    Sku = variant.Sku,
                    CostPrice = pricing.CostPrice,
                    TotalCost = ComputeTotalCost(pricing),
                    ListingPrice = pricing.ListingPrice,
                    ActualProfit = pricing.ActualProfit,
                    MarginPercentage = pricing.MarginPercentage,
                    SuggestedSellingPrice = pricing.SuggestedSellingPrice,
                    IsOutdated = pricing.UpdatedAt < variant.UpdatedAt,
                    PricingUpdatedAt = pricing.UpdatedAt,
                    VariantUpdatedAt = variant.UpdatedAt,
                });
            }
        }

        return results;
    }

    public async Task<PricingResponse> RecalculateAsync(string id, CancellationToken cancellationToken)
    {
        var existing = await _pricingRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Pricing", id);

        var now = _dateTimeProvider.UtcNow;
        var user = GetCurrentUserEmail();

        RecomputeComputedFields(existing);
        existing.UpdatedBy = user;
        existing.UpdatedAt = now;

        await _pricingRepository.UpdateAsync(id, existing, cancellationToken);

        return await ToResponseAsync(id, existing, cancellationToken);
    }

    public async Task<BulkPricingPreviewResponse> BulkPreviewAsync(BulkPricingUpdateRequest request, CancellationToken cancellationToken)
    {
        var items = new List<PricingPreviewItem>();

        foreach (var pricingId in request.PricingIds)
        {
            var doc = await _pricingRepository.GetByIdAsync(pricingId, cancellationToken);
            if (doc is null) continue;

            var newPackingCharge = ApplyBulkField(doc.PackingCharge, request.PackingCharge);
            var newAdvertisingCharge = ApplyBulkField(doc.AdvertisingCharge, request.AdvertisingCharge);
            var newDesiredProfit = ApplyBulkField(doc.DesiredProfit, request.DesiredProfit);
            var newMarketplaceCommission = ApplyBulkField(doc.MarketplaceCommission, request.MarketplaceCommission);

            var snapshot = new PricingDocument
            {
                CostPrice = doc.CostPrice,
                PackingCharge = newPackingCharge,
                ShippingCharge = doc.ShippingCharge,
                AdvertisingCharge = newAdvertisingCharge,
                MarketplaceCommission = newMarketplaceCommission,
                FixedMarketplaceFee = doc.FixedMarketplaceFee,
                PaymentGatewayCharge = doc.PaymentGatewayCharge,
                OtherCharges = doc.OtherCharges,
                GstPercentage = doc.GstPercentage,
                DesiredProfit = newDesiredProfit,
                Mrp = doc.Mrp,
                ListingPrice = doc.ListingPrice,
                OfferPrice = doc.OfferPrice,
            };
            RecomputeComputedFields(snapshot);

            var currentTotalCost = ComputeTotalCost(doc);
            items.Add(new PricingPreviewItem
            {
                PricingId = pricingId,
                Marketplace = doc.Marketplace,
                CurrentPackingCharge = doc.PackingCharge,
                NewPackingCharge = request.PackingCharge is not null ? newPackingCharge : null,
                CurrentAdvertisingCharge = doc.AdvertisingCharge,
                NewAdvertisingCharge = request.AdvertisingCharge is not null ? newAdvertisingCharge : null,
                CurrentDesiredProfit = doc.DesiredProfit,
                NewDesiredProfit = request.DesiredProfit is not null ? newDesiredProfit : null,
                CurrentMarketplaceCommission = doc.MarketplaceCommission,
                NewMarketplaceCommission = request.MarketplaceCommission is not null ? newMarketplaceCommission : null,
                CurrentTotalCost = currentTotalCost,
                NewTotalCost = ComputeTotalCost(snapshot),
                CurrentListingPrice = doc.ListingPrice,
                NewListingPrice = doc.ListingPrice,
                CurrentProfit = doc.ActualProfit,
                NewProfit = snapshot.ActualProfit,
                ProfitDifference = Math.Round(snapshot.ActualProfit - doc.ActualProfit, 2),
            });
        }

        return new BulkPricingPreviewResponse { Items = items, AffectedCount = items.Count };
    }

    public async Task<int> BulkApplyAsync(BulkPricingUpdateRequest request, CancellationToken cancellationToken)
    {
        var now = _dateTimeProvider.UtcNow;
        var user = GetCurrentUserEmail();
        var count = 0;

        foreach (var pricingId in request.PricingIds)
        {
            var doc = await _pricingRepository.GetByIdAsync(pricingId, cancellationToken);
            if (doc is null) continue;

            if (request.PackingCharge is not null)
                doc.PackingCharge = ApplyBulkField(doc.PackingCharge, request.PackingCharge);
            if (request.AdvertisingCharge is not null)
                doc.AdvertisingCharge = ApplyBulkField(doc.AdvertisingCharge, request.AdvertisingCharge);
            if (request.DesiredProfit is not null)
                doc.DesiredProfit = ApplyBulkField(doc.DesiredProfit, request.DesiredProfit);
            if (request.MarketplaceCommission is not null)
                doc.MarketplaceCommission = ApplyBulkField(doc.MarketplaceCommission, request.MarketplaceCommission);

            doc.UpdatedBy = user;
            doc.UpdatedAt = now;
            RecomputeComputedFields(doc);
            await _pricingRepository.UpdateAsync(pricingId, doc, cancellationToken);
            count++;
        }

        return count;
    }

    private static double ApplyBulkField(double currentValue, BulkFieldUpdate? update)
    {
        if (update is null) return currentValue;
        return update.Operation switch
        {
            BulkOperation.IncreasePercent => Math.Round(currentValue * (1 + update.Value / 100.0), 2),
            BulkOperation.DecreasePercent => Math.Round(currentValue * (1 - update.Value / 100.0), 2),
            BulkOperation.FixedAmount => update.Value,
            _ => currentValue,
        };
    }

    // ── Computations ──────────────────────────────────────────────────────

    private static double ComputeTotalCost(PricingDocument doc)
    {
        return doc.CostPrice
            + doc.PackingCharge
            + doc.ShippingCharge
            + doc.AdvertisingCharge
            + doc.MarketplaceCommission
            + doc.FixedMarketplaceFee
            + doc.PaymentGatewayCharge
            + doc.OtherCharges
            + doc.CostPrice * doc.GstPercentage / 100.0;
    }

    private static double ComputeActualProfit(double listingPrice, double totalCost)
    {
        return listingPrice - totalCost;
    }

    private static double ComputeMarginPercentage(double actualProfit, double listingPrice)
    {
        return listingPrice > 0 ? Math.Round(actualProfit / listingPrice * 100, 2) : 0;
    }

    private static double ComputeSuggestedSellingPrice(double totalCost, double desiredProfit)
    {
        return Math.Round(totalCost + desiredProfit, 2);
    }

    // ── Document builders ─────────────────────────────────────────────────

    private PricingDocument BuildDocument(CreatePricingRequest request, DateTime now, string user)
    {
        var doc = new PricingDocument
        {
            InventoryVariantId = request.InventoryVariantId,
            Marketplace = request.Marketplace,
            CostPrice = request.CostPrice,
            PackingCharge = request.PackingCharge,
            ShippingCharge = request.ShippingCharge,
            AdvertisingCharge = request.AdvertisingCharge,
            MarketplaceCommission = request.MarketplaceCommission,
            FixedMarketplaceFee = request.FixedMarketplaceFee,
            PaymentGatewayCharge = request.PaymentGatewayCharge,
            OtherCharges = request.OtherCharges,
            GstPercentage = request.GstPercentage,
            DesiredProfit = request.DesiredProfit,
            Mrp = request.Mrp,
            ListingPrice = request.ListingPrice,
            OfferPrice = request.OfferPrice,
            Currency = request.Currency,
            IsActive = request.IsActive,
            CreatedBy = user,
            UpdatedBy = user,
            CreatedAt = now,
            UpdatedAt = now,
        };

        RecomputeComputedFields(doc);
        return doc;
    }

    private static void ApplyUpdate(PricingDocument doc, UpdatePricingRequest request, DateTime now, string user)
    {
        if (request.CostPrice.HasValue) doc.CostPrice = request.CostPrice.Value;
        if (request.PackingCharge.HasValue) doc.PackingCharge = request.PackingCharge.Value;
        if (request.ShippingCharge.HasValue) doc.ShippingCharge = request.ShippingCharge.Value;
        if (request.AdvertisingCharge.HasValue) doc.AdvertisingCharge = request.AdvertisingCharge.Value;
        if (request.MarketplaceCommission.HasValue) doc.MarketplaceCommission = request.MarketplaceCommission.Value;
        if (request.FixedMarketplaceFee.HasValue) doc.FixedMarketplaceFee = request.FixedMarketplaceFee.Value;
        if (request.PaymentGatewayCharge.HasValue) doc.PaymentGatewayCharge = request.PaymentGatewayCharge.Value;
        if (request.OtherCharges.HasValue) doc.OtherCharges = request.OtherCharges.Value;
        if (request.GstPercentage.HasValue) doc.GstPercentage = request.GstPercentage.Value;
        if (request.DesiredProfit.HasValue) doc.DesiredProfit = request.DesiredProfit.Value;
        if (request.Mrp.HasValue) doc.Mrp = request.Mrp.Value;
        if (request.ListingPrice.HasValue) doc.ListingPrice = request.ListingPrice.Value;
        if (request.OfferPrice.HasValue) doc.OfferPrice = request.OfferPrice.Value;
        if (request.Currency is not null) doc.Currency = request.Currency;
        if (request.IsActive.HasValue) doc.IsActive = request.IsActive.Value;

        doc.UpdatedBy = user;
        doc.UpdatedAt = now;

        RecomputeComputedFields(doc);
    }

    private static void RecomputeComputedFields(PricingDocument doc)
    {
        doc.SuggestedSellingPrice = ComputeSuggestedSellingPrice(ComputeTotalCost(doc), doc.DesiredProfit);
        doc.ActualProfit = ComputeActualProfit(doc.ListingPrice, ComputeTotalCost(doc));
        doc.MarginPercentage = ComputeMarginPercentage(doc.ActualProfit, doc.ListingPrice);
    }

    public async Task<PricingDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken)
    {
        var pricingTask = _pricingRepository.GetAllUnpagedAsync(cancellationToken);
        var variantsTask = _variantRepository.GetAllUnpagedAsync(cancellationToken);
        await Task.WhenAll(pricingTask, variantsTask);

        var pricingRecords = pricingTask.Result;
        var variantRecords = variantsTask.Result;
        var variantMap = variantRecords.ToDictionary(v => v.Id, v => v.Data);

        if (pricingRecords.Count == 0)
        {
            return new PricingDashboardResponse
            {
                ProductsWithoutPricing = variantRecords.Count,
            };
        }

        var avgProfit = Math.Round(pricingRecords.Average(p => p.Data.ActualProfit), 2);
        var avgMargin = Math.Round(pricingRecords.Average(p => p.Data.MarginPercentage), 2);

        var sortedByProfit = pricingRecords
            .Select(p => BuildTopProduct(p.Id, p.Data, variantMap))
            .OrderByDescending(p => p.ActualProfit)
            .ToList();

        var highest = sortedByProfit.First();
        var lowest = sortedByProfit.Last();

        var belowTarget = pricingRecords.Count(p => p.Data.ActualProfit < p.Data.DesiredProfit);
        var negativeProfit = pricingRecords.Count(p => p.Data.ActualProfit < 0);

        // Variants with at least one pricing record
        var variantIdsWithPricing = pricingRecords.Select(p => p.Data.InventoryVariantId).Distinct().ToHashSet();
        var withoutPricing = variantRecords.Count(v => !variantIdsWithPricing.Contains(v.Id));

        var outdated = variantRecords
            .Join(pricingRecords,
                v => v.Id,
                p => p.Data.InventoryVariantId,
                (v, p) => (Variant: v.Data, Pricing: p.Data))
            .Count(x => x.Pricing.UpdatedAt < x.Variant.UpdatedAt);

        var profitBuckets = BuildProfitBuckets(pricingRecords.Select(p => p.Data.ActualProfit));
        var marginBuckets = BuildMarginBuckets(pricingRecords.Select(p => p.Data.MarginPercentage));

        var marketplaceBreakdown = pricingRecords
            .GroupBy(p => p.Data.Marketplace)
            .Select(g => new MarketplaceBreakdown
            {
                Marketplace = g.Key,
                Count = g.Count(),
                TotalProfit = Math.Round(g.Sum(p => p.Data.ActualProfit), 2),
                AverageProfit = Math.Round(g.Average(p => p.Data.ActualProfit), 2),
                AverageMargin = Math.Round(g.Average(p => p.Data.MarginPercentage), 2),
            })
            .ToList();

        var top20 = sortedByProfit.Take(20).ToList();

        return new PricingDashboardResponse
        {
            AverageProfit = avgProfit,
            AverageMargin = avgMargin,
            HighestProfitProduct = highest,
            LowestProfitProduct = lowest,
            ProductsBelowTargetProfit = belowTarget,
            ProductsWithNegativeProfit = negativeProfit,
            ProductsWithoutPricing = withoutPricing,
            ProductsWithOutdatedPricing = outdated,
            ProfitDistribution = profitBuckets,
            MarginDistribution = marginBuckets,
            MarketplaceComparison = marketplaceBreakdown,
            Top20ProfitableProducts = top20,
        };
    }

    private static PricingDashboardTopProduct BuildTopProduct(string id, PricingDocument doc, Dictionary<string, InventoryVariantDocument> variantMap)
    {
        variantMap.TryGetValue(doc.InventoryVariantId, out var variant);
        return new PricingDashboardTopProduct
        {
            PricingId = id,
            InventoryVariantId = doc.InventoryVariantId,
            Marketplace = doc.Marketplace,
            Color = variant?.Color ?? string.Empty,
            Size = variant?.Size ?? string.Empty,
            Sku = variant?.Sku ?? string.Empty,
            ListingPrice = doc.ListingPrice,
            ActualProfit = doc.ActualProfit,
            MarginPercentage = doc.MarginPercentage,
        };
    }

    private static List<DistributionBucket> BuildProfitBuckets(IEnumerable<double> profits)
    {
        var buckets = new Dictionary<string, int>
        {
            ["Loss"] = 0,
            ["₹0 – 100"] = 0,
            ["₹100 – 500"] = 0,
            ["₹500 – 1K"] = 0,
            ["₹1K – 5K"] = 0,
            ["> ₹5K"] = 0,
        };
        foreach (var p in profits)
        {
            if (p < 0) buckets["Loss"]++;
            else if (p <= 100) buckets["₹0 – 100"]++;
            else if (p <= 500) buckets["₹100 – 500"]++;
            else if (p <= 1000) buckets["₹500 – 1K"]++;
            else if (p <= 5000) buckets["₹1K – 5K"]++;
            else buckets["> ₹5K"]++;
        }
        return buckets.Select(kv => new DistributionBucket { Label = kv.Key, Count = kv.Value }).ToList();
    }

    private static List<DistributionBucket> BuildMarginBuckets(IEnumerable<double> margins)
    {
        var buckets = new Dictionary<string, int>
        {
            ["< 0%"] = 0,
            ["0 – 10%"] = 0,
            ["10 – 20%"] = 0,
            ["20 – 30%"] = 0,
            ["30 – 50%"] = 0,
            ["> 50%"] = 0,
        };
        foreach (var m in margins)
        {
            if (m < 0) buckets["< 0%"]++;
            else if (m <= 10) buckets["0 – 10%"]++;
            else if (m <= 20) buckets["10 – 20%"]++;
            else if (m <= 30) buckets["20 – 30%"]++;
            else if (m <= 50) buckets["30 – 50%"]++;
            else buckets["> 50%"]++;
        }
        return buckets.Select(kv => new DistributionBucket { Label = kv.Key, Count = kv.Value }).ToList();
    }

    public async Task<PricingRecommendationResponse> GetRecommendationsAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _pricingRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Pricing", id);

        var totalCost = ComputeTotalCost(doc);
        var list = new List<PricingRecommendation>();
        var severityMap = new Dictionary<string, int> { ["Critical"] = 0, ["Warning"] = 0, ["Info"] = 0 };

        // ── Selling Below Cost (Critical) ──
        if (doc.ListingPrice < totalCost)
        {
            AddRec("SellingBelowCost", "Critical",
                "Selling Below Cost",
                $"Listing price ({doc.ListingPrice:C}) is below total cost ({totalCost:C}).",
                $"Increase listing price to at least {totalCost + 150:C} to reach minimum profit target.",
                list, severityMap);
        }

        // ── Negative Profit (Critical) ──
        else if (doc.ActualProfit < 0)
        {
            AddRec("NegativeProfit", "Critical",
                "Negative Profit",
                $"Actual profit is {doc.ActualProfit:C}. This product is losing money.",
                $"Increase listing price to {totalCost + 150:C} or reduce costs to achieve positive profit.",
                list, severityMap);
        }

        // ── Low Margin (Warning) ──
        if (doc.MarginPercentage < 10 && doc.ActualProfit >= 0)
        {
            AddRec("LowMargin", "Warning",
                "Low Margin",
                $"Margin is only {doc.MarginPercentage:F1}%. Target: 10%+.",
                $"Consider increasing listing price or reducing cost inputs (packing, shipping, advertising).",
                list, severityMap);
        }

        // ── High Ad Cost (Warning) ──
        var adRatio = totalCost > 0 ? doc.AdvertisingCharge / totalCost : 0;
        if (adRatio > 0.15)
        {
            AddRec("HighAdCost", "Warning",
                "High Ad Cost",
                $"Advertising charge ({doc.AdvertisingCharge:C}) is {adRatio:P0} of total cost ({totalCost:C}).",
                "Reduce advertising spend or increase listing price to maintain margins.",
                list, severityMap);
        }

        // ── High Commission (Warning) ──
        var commissionRatio = doc.ListingPrice > 0 ? doc.MarketplaceCommission / doc.ListingPrice : 0;
        if (commissionRatio > 0.15)
        {
            AddRec("HighCommission", "Warning",
                "High Commission",
                $"Marketplace commission ({doc.MarketplaceCommission:C}) is {commissionRatio:P0} of listing price ({doc.ListingPrice:C}).",
                "Review marketplace fee structure or adjust pricing to compensate.",
                list, severityMap);
        }

        // ── Profit below target range (Warning) ──
        if (doc.ActualProfit >= 0 && doc.ActualProfit < 150)
        {
            var suggested = Math.Round(totalCost + 175, 2);
            AddRec("IncreasePrice", "Warning",
                "Profit Below Target",
                $"Actual profit ({doc.ActualProfit:C}) is below the ₹150–₹200 target range.",
                $"Increase listing price to approximately {suggested:C} (current: {doc.ListingPrice:C}).",
                list, severityMap);
        }

        // ── Profit exceeds target — suggest decrease (Info) ──
        if (doc.MarginPercentage > 40 && doc.ActualProfit > 200)
        {
            var suggested = Math.Round(totalCost + 175, 2);
            AddRec("DecreasePrice", "Info",
                "High Margin — Consider Price Reduction",
                $"Margin ({doc.MarginPercentage:F1}%) and profit ({doc.ActualProfit:C}) are well above targets.",
                $"Consider lowering listing price to {suggested:C} for competitive positioning.",
                list, severityMap);
        }

        // ── Overall health ──
        string overall;
        if (severityMap["Critical"] > 0) overall = "ActionRequired";
        else if (severityMap["Warning"] > 0) overall = "Review";
        else overall = "Healthy";

        // ── Suggested listing price to hit midpoint of target profit ──
        var suggestedListingPrice = Math.Round(totalCost + 175, 2);

        return new PricingRecommendationResponse
        {
            OverallHealth = overall,
            Summary = new PricingRecommendationSummary
            {
                TotalCost = totalCost,
                ListingPrice = doc.ListingPrice,
                ActualProfit = doc.ActualProfit,
                MarginPercentage = doc.MarginPercentage,
                DesiredProfit = doc.DesiredProfit,
                SuggestedListingPrice = suggestedListingPrice,
                ProfitToTarget = Math.Round(175 - doc.ActualProfit, 2),
            },
            Recommendations = list,
        };
    }

    private static void AddRec(string type, string severity, string title, string message, string? action,
        List<PricingRecommendation> list, Dictionary<string, int> severityMap)
    {
        list.Add(new PricingRecommendation
        {
            Type = type,
            Severity = severity,
            Title = title,
            Message = message,
            SuggestedAction = action,
        });
        if (severityMap.ContainsKey(severity))
            severityMap[severity]++;
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _pricingRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Pricing", id);
        var user = GetCurrentUserEmail();
        await _pricingRepository.DeleteAsync(id, cancellationToken);
        try { await _auditLogService.LogDeleteAsync("Pricing", id, $"{doc.InventoryVariantId} / {doc.Marketplace}", AuditLogService.SerializeJson(doc), user, null, null, "Pricing record deleted"); } catch { }
    }

    public async Task<List<PricingResponse>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var docs = await _pricingRepository.GetAllUnpagedAsync(cancellationToken);
        var responses = new List<PricingResponse>();
        foreach (var (id, data) in docs)
        {
            responses.Add(await ToResponseAsync(id, data, cancellationToken));
        }
        return responses;
    }

    // ── Response mapper ───────────────────────────────────────────────────

    private Task<PricingResponse> ToResponseAsync(string id, PricingDocument doc, CancellationToken cancellationToken)
    {
        return Task.FromResult(new PricingResponse
        {
            Id = id,
            InventoryVariantId = doc.InventoryVariantId,
            Marketplace = doc.Marketplace,
            CostPrice = doc.CostPrice,
            PackingCharge = doc.PackingCharge,
            ShippingCharge = doc.ShippingCharge,
            AdvertisingCharge = doc.AdvertisingCharge,
            MarketplaceCommission = doc.MarketplaceCommission,
            FixedMarketplaceFee = doc.FixedMarketplaceFee,
            PaymentGatewayCharge = doc.PaymentGatewayCharge,
            OtherCharges = doc.OtherCharges,
            GstPercentage = doc.GstPercentage,
            DesiredProfit = doc.DesiredProfit,
            Mrp = doc.Mrp,
            ListingPrice = doc.ListingPrice,
            OfferPrice = doc.OfferPrice,
            SuggestedSellingPrice = doc.SuggestedSellingPrice,
            ActualProfit = doc.ActualProfit,
            MarginPercentage = doc.MarginPercentage,
            Currency = doc.Currency,
            IsActive = doc.IsActive,
            CreatedBy = doc.CreatedBy,
            UpdatedBy = doc.UpdatedBy,
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt,
        });
    }
}
