using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.InventoryManagement;
using Vrindaya.Api.DTOs.ListingManagement;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;

namespace Vrindaya.Api.Services.ListingManagement;

public class ProductListingService : IProductListingService
{
    private readonly IProductListingRepository _repository;
    private readonly IProductRepository _productRepository;
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IListingSyncService _syncService;
    private readonly IAuditLogService _auditLogService;

    public ProductListingService(
        IProductListingRepository repository,
        IProductRepository productRepository,
        IInventoryVariantRepository variantRepository,
        IListingSyncService syncService,
        IAuditLogService auditLogService)
    {
        _repository = repository;
        _productRepository = productRepository;
        _variantRepository = variantRepository;
        _syncService = syncService;
        _auditLogService = auditLogService;
    }

    public async Task<PagedResult<ProductListingResponse>> GetAllAsync(ProductListingQuery query, CancellationToken cancellationToken)
    {
        var page = await _repository.GetAllAsync(query.Cursor, query.PageSize, cancellationToken);

        var items = new List<ProductListingResponse>();
        foreach (var doc in page.Items)
        {
            var product = await _productRepository.GetByIdAsync(doc.ProductId, cancellationToken);
            items.Add(ToResponse(doc, product?.Name));
        }

        return new PagedResult<ProductListingResponse>
        {
            Items = items,
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    public async Task<ProductListingResponse> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Product listing", id);

        var product = await _productRepository.GetByIdAsync(doc.ProductId, cancellationToken);
        return ToResponse(doc, product?.Name);
    }

    public async Task<ProductListingResponse> UpdateAsync(string id, UpdateProductListingRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Product listing", id);

        var now = DateTime.UtcNow;
        var document = new ProductListingDocument
        {
            ProductId = existing.ProductId,
            Marketplace = existing.Marketplace,
            ListingStatus = request.ListingStatus,
            ListingQuality = request.ListingQuality ?? existing.ListingQuality,
            FlipkartListingId = request.FlipkartListingId ?? existing.FlipkartListingId,
            MarketplacePrice = request.MarketplacePrice,
            Inventory = request.Inventory,
            SyncStatus = request.SyncStatus ?? existing.SyncStatus,
            LastSyncedAt = existing.LastSyncedAt,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = now,
            UpdatedBy = updatedBy,
        };

        await _repository.UpsertAsync(id, document, cancellationToken);

        try { await _auditLogService.LogUpdateAsync("ProductListings", id, null, null, AuditLogService.SerializeJson(document), updatedBy, null, null, $"Listing updated (Status: {request.ListingStatus})"); } catch { }

        var product = await _productRepository.GetByIdAsync(document.ProductId, cancellationToken);
        return ToResponse(document, product?.Name);
    }

    public async Task<List<ProductListingResponse>> BulkUpdateStatusAsync(BulkUpdateListingStatusRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        var ids = request.ListingIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        if (ids.Count == 0) throw new RequestValidationException("Select at least one listing.");

        await _repository.BulkUpdateStatusAsync(ids, request.ListingStatus, updatedBy, cancellationToken);

        try { await _auditLogService.LogCustomAsync("BulkUpdate", "ProductListings", null, null, $"Bulk status update to '{request.ListingStatus}' for {ids.Count} listings", updatedBy, null, null); } catch { }

        var results = new List<ProductListingResponse>();
        foreach (var id in ids)
        {
            var doc = await _repository.GetByIdAsync(id, cancellationToken);
            if (doc != null)
            {
                var product = await _productRepository.GetByIdAsync(doc.ProductId, cancellationToken);
                results.Add(ToResponse(doc, product?.Name));
            }
        }

        return results;
    }

    public async Task<MarketplaceDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken)
    {
        var listings = await _repository.GetAllUnpagedAsync(cancellationToken);
        var products = await _productRepository.GetAllUnpagedAsync(cancellationToken);
        var variants = await _variantRepository.GetAllUnpagedAsync(cancellationToken);

        var productMap = products.ToDictionary(p => p.Id, p => p.Data);
        var variantsByProduct = variants.GroupBy(v => v.Data.ProductId).ToDictionary(g => g.Key, g => g.ToList());

        var totalListings = listings.Count;
        var publishedCount = listings.Count(l => l.Data.ListingStatus == Constants.ListingStatus.Published);
        var rejectedCount = listings.Count(l => l.Data.ListingStatus == Constants.ListingStatus.Rejected);
        var draftCount = listings.Count(l => l.Data.ListingStatus == Constants.ListingStatus.Draft);

        double inventoryValue = 0;
        double potentialRevenue = 0;
        double expectedProfit = 0;
        var marginValues = new List<double>();

        var catInv = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        var catProfit = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        var supplierInv = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        var mpMargin = new Dictionary<string, List<double>>(StringComparer.OrdinalIgnoreCase);

        int lowStockCount = 0;
        int outOfStockCount = 0;

        foreach (var variant in variants)
        {
            var v = variant.Data;
            if (v.CurrentStock == 0) outOfStockCount++;
            else if (v.LowStockThreshold > 0 && v.CurrentStock <= v.LowStockThreshold) lowStockCount++;

            var supplierKey = !string.IsNullOrWhiteSpace(v.Supplier) ? v.Supplier : "Unknown";
            if (!supplierInv.ContainsKey(supplierKey)) supplierInv[supplierKey] = 0;
            supplierInv[supplierKey] += v.AveragePurchaseCost * v.CurrentStock;

            foreach (var profile in v.MarketplaceProfiles)
            {
                if (!mpMargin.ContainsKey(profile.MarketplaceType)) mpMargin[profile.MarketplaceType] = [];
                mpMargin[profile.MarketplaceType].Add(profile.MarginPercentage);
            }
        }

        foreach (var listing in listings)
        {
            var l = listing.Data;
            var cat = productMap.TryGetValue(l.ProductId, out var prod) ? (prod.Category ?? "Uncategorized") : "Unknown";

            potentialRevenue += l.MarketplacePrice * l.Inventory;

            var avgCost = 0.0;
            if (variantsByProduct.TryGetValue(l.ProductId, out var prodVariants) && prodVariants.Count > 0)
            {
                avgCost = prodVariants.Average(v => v.Data.AveragePurchaseCost);
            }
            var listingInvValue = avgCost * l.Inventory;
            inventoryValue += listingInvValue;

            if (variantsByProduct.TryGetValue(l.ProductId, out var pv))
            {
                foreach (var v in pv)
                {
                    var profile = v.Data.MarketplaceProfiles
                        .FirstOrDefault(p => string.Equals(p.MarketplaceType, l.Marketplace, StringComparison.OrdinalIgnoreCase));
                    if (profile != null)
                    {
                        expectedProfit += profile.NetProfit * l.Inventory;
                        marginValues.Add(profile.MarginPercentage);
                        break;
                    }
                }
            }

            if (!catInv.ContainsKey(cat)) catInv[cat] = 0;
            catInv[cat] += listingInvValue;

            var listingProfit = 0.0;
            if (variantsByProduct.TryGetValue(l.ProductId, out var pv2))
            {
                foreach (var v in pv2)
                {
                    var profile = v.Data.MarketplaceProfiles
                        .FirstOrDefault(p => string.Equals(p.MarketplaceType, l.Marketplace, StringComparison.OrdinalIgnoreCase));
                    if (profile != null)
                    {
                        listingProfit += profile.NetProfit * l.Inventory;
                        break;
                    }
                }
            }
            if (!catProfit.ContainsKey(cat)) catProfit[cat] = 0;
            catProfit[cat] += listingProfit;
        }

        var averageMargin = marginValues.Count > 0 ? marginValues.Average() : 0;

        return new MarketplaceDashboardResponse
        {
            TotalListings = totalListings,
            PublishedCount = publishedCount,
            RejectedCount = rejectedCount,
            DraftCount = draftCount,
            InventoryValue = Math.Round(inventoryValue, 2),
            PotentialRevenue = Math.Round(potentialRevenue, 2),
            ExpectedProfit = Math.Round(expectedProfit, 2),
            AverageMargin = Math.Round(averageMargin, 2),
            LowStockCount = lowStockCount,
            OutOfStockCount = outOfStockCount,
            InventoryByCategory = catInv.OrderByDescending(kv => kv.Value).Select(kv => new NamedValue { Name = kv.Key, Value = Math.Round(kv.Value, 2) }).ToList(),
            ProfitByCategory = catProfit.OrderByDescending(kv => kv.Value).Select(kv => new NamedValue { Name = kv.Key, Value = Math.Round(kv.Value, 2) }).ToList(),
            InvestmentBySupplier = supplierInv.OrderByDescending(kv => kv.Value).Select(kv => new NamedValue { Name = kv.Key, Value = Math.Round(kv.Value, 2) }).ToList(),
            MarketplaceMargin = mpMargin.OrderBy(kv => kv.Key).Select(kv => new NamedValue { Name = kv.Key, Value = Math.Round(kv.Value.Average(), 2) }).ToList(),
        };
    }

    private static ProductListingResponse ToResponse(ProductListingDocument doc, string? productName) => new()
    {
        Id = string.Empty,
        ProductId = doc.ProductId,
        ProductName = productName,
        Marketplace = doc.Marketplace,
        ListingStatus = doc.ListingStatus,
        ListingQuality = doc.ListingQuality,
        FlipkartListingId = doc.FlipkartListingId,
        MarketplacePrice = doc.MarketplacePrice,
        Inventory = doc.Inventory,
        SyncStatus = doc.SyncStatus,
        LastSyncedAt = doc.LastSyncedAt,
        UpdatedAt = doc.UpdatedAt,
    };
}
