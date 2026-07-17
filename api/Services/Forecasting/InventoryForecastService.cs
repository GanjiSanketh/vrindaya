using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Forecasting;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Forecasting;

public class InventoryForecastService : IInventoryForecastService
{
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IProductRepository _productRepository;
    private readonly ISalesVelocityProvider _velocityProvider;
    private readonly ILeadTimeProvider _leadTimeProvider;

    public InventoryForecastService(
        IInventoryVariantRepository variantRepository,
        IProductRepository productRepository,
        ISalesVelocityProvider velocityProvider,
        ILeadTimeProvider leadTimeProvider)
    {
        _variantRepository = variantRepository;
        _productRepository = productRepository;
        _velocityProvider = velocityProvider;
        _leadTimeProvider = leadTimeProvider;
    }

    public async Task<PagedResult<InventoryForecastResponse>> GetForecastAsync(ForecastQuery query, CancellationToken cancellationToken)
    {
        var variants = await _variantRepository.GetAllUnpagedAsync(cancellationToken);
        var products = await _productRepository.GetAllUnpagedAsync(cancellationToken);
        var productMap = products.ToDictionary(p => p.Id, p => p.Data);

        var rows = new List<InventoryForecastResponse>();

        foreach (var (variantId, variant) in variants)
        {
            if (!productMap.TryGetValue(variant.ProductId, out var product)) continue;

            var avgMonthlySales = await _velocityProvider.GetAverageMonthlySalesAsync(
                variantId, variant.SoldStock, variant.CreatedAt, cancellationToken);
            var dailyRate = await _velocityProvider.GetDailyConsumptionRateAsync(
                variantId, variant.SoldStock, variant.CreatedAt, cancellationToken);
            var leadTimeDays = await _leadTimeProvider.GetLeadTimeDaysAsync(
                variant.Supplier, cancellationToken);

            var daysRemaining = dailyRate > 0
                ? Math.Round(variant.CurrentStock / dailyRate, 1)
                : 999;

            var minimumStock = (long)Math.Ceiling(dailyRate * leadTimeDays);
            if (minimumStock < 1) minimumStock = 1;

            var maximumStock = minimumStock * 3;
            var idealStock = minimumStock + (long)Math.Ceiling(dailyRate * 30);

            var reorderQty = Math.Max(0, idealStock - variant.CurrentStock);

            var status = ComputeForecastStatus(variant, minimumStock, maximumStock);

            rows.Add(new InventoryForecastResponse
            {
                VariantId = variantId,
                ProductId = variant.ProductId,
                ProductName = product.Name,
                Category = product.Category ?? "Uncategorized",
                Color = variant.Color,
                Size = variant.Size,
                Sku = variant.Sku,
                Supplier = variant.Supplier,

                CurrentStock = variant.CurrentStock,
                SoldStock = variant.SoldStock,
                AverageMonthlySales = avgMonthlySales,
                DailyConsumptionRate = dailyRate,
                EstimatedDaysRemaining = daysRemaining,
                MinimumStock = minimumStock,
                MaximumStock = maximumStock,
                IdealStock = idealStock,
                RecommendedReorderQuantity = reorderQty,
                Status = status,
                LeadTimeDays = leadTimeDays,
            });
        }

        // Apply filters
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            rows = rows.Where(r =>
                r.ProductName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                r.Sku.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (r.Supplier?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false))
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var statusFilter = query.Status.Trim();
            rows = rows.Where(r =>
                string.Equals(r.Status, statusFilter, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Supplier))
        {
            var supplierFilter = query.Supplier.Trim();
            rows = rows.Where(r =>
                string.Equals(r.Supplier, supplierFilter, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var catFilter = query.Category.Trim();
            rows = rows.Where(r =>
                string.Equals(r.Category, catFilter, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        // Sort: Overstock/Critical first, then by days remaining asc
        rows = rows
            .OrderBy(r => r.Status switch
            {
                InventoryForecastStatus.Critical => 0,
                InventoryForecastStatus.OutOfStock => 1,
                InventoryForecastStatus.Low => 2,
                InventoryForecastStatus.Overstock => 3,
                _ => 4,
            })
            .ThenBy(r => r.EstimatedDaysRemaining)
            .ToList();

        var totalCount = rows.Count;

        int skip = 0;
        if (!string.IsNullOrWhiteSpace(query.Cursor) && int.TryParse(query.Cursor, out var cursorIndex))
            skip = cursorIndex;

        var page = rows.Skip(skip).Take(query.PageSize).ToList();

        var nextCursor = (skip + page.Count < totalCount) ? (skip + page.Count).ToString() : null;

        return new PagedResult<InventoryForecastResponse>
        {
            Items = page,
            NextCursor = nextCursor,
            TotalCount = totalCount,
        };
    }

    private static string ComputeForecastStatus(InventoryVariantDocument variant, long minimumStock, long maximumStock)
    {
        var available = variant.CurrentStock - variant.ReservedStock;

        if (available <= 0) return InventoryForecastStatus.OutOfStock;

        var criticalThreshold = variant.CriticalStockThreshold ?? Math.Min(variant.LowStockThreshold, 2);
        if (available <= criticalThreshold) return InventoryForecastStatus.Critical;

        if (available <= variant.LowStockThreshold) return InventoryForecastStatus.Low;

        if (available > maximumStock) return InventoryForecastStatus.Overstock;

        return InventoryForecastStatus.Healthy;
    }
}
