using System.Text;
using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Reports;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.InventoryManagement;

namespace Vrindaya.Api.Services.Reports;

public class ReportsService : IReportsService
{
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IProductRepository _productRepository;
    private readonly IStockMovementRepository _stockMovementRepository;
    private readonly IPurchaseEntryRepository _purchaseEntryRepository;
    private readonly IPurchaseItemRepository _purchaseItemRepository;
    private readonly ISupplierRepository _supplierRepository;
    private readonly ICollectionRepository _collectionRepository;

    public ReportsService(
        IInventoryVariantRepository variantRepository,
        IProductRepository productRepository,
        IStockMovementRepository stockMovementRepository,
        IPurchaseEntryRepository purchaseEntryRepository,
        IPurchaseItemRepository purchaseItemRepository,
        ISupplierRepository supplierRepository,
        ICollectionRepository collectionRepository)
    {
        _variantRepository = variantRepository;
        _productRepository = productRepository;
        _stockMovementRepository = stockMovementRepository;
        _purchaseEntryRepository = purchaseEntryRepository;
        _purchaseItemRepository = purchaseItemRepository;
        _supplierRepository = supplierRepository;
        _collectionRepository = collectionRepository;
    }

    public async Task<PagedResult<InventoryValuationRow>> GetInventoryValuationAsync(ReportQuery query, CancellationToken ct)
    {
        var allVariants = await _variantRepository.GetAllUnpagedAsync(ct);
        var (productMap, _) = await BuildMapsAsync(ct);
        var filtered = await FilterVariantsByProductAsync(allVariants, productMap, query, ct);

        var rows = filtered.Select(v =>
        {
            var product = productMap.GetValueOrDefault(v.Data.ProductId);
            var websiteProfile = v.Data.MarketplaceProfiles
                .FirstOrDefault(p => p.MarketplaceType == MarketplaceType.Website);
            var effectivePrice = websiteProfile?.ManualSellingPriceOverride ?? websiteProfile?.SuggestedSellingPrice;
            var totalCost = websiteProfile?.TotalCost ?? v.Data.AveragePurchaseCost;
            var stockValue = v.Data.CurrentStock * v.Data.AveragePurchaseCost;

            return new InventoryValuationRow
            {
                ProductId = v.Data.ProductId,
                ProductName = product?.Name,
                Category = product?.Category,
                Color = v.Data.Color,
                Size = v.Data.Size,
                Sku = v.Data.Sku,
                CurrentStock = v.Data.CurrentStock,
                AverageCost = v.Data.AveragePurchaseCost,
                StockValue = stockValue,
                SellingPrice = effectivePrice,
                ProfitMargin = effectivePrice.HasValue && effectivePrice > 0
                    ? Math.Round((effectivePrice.Value - totalCost) / effectivePrice.Value * 100, 2)
                    : null,
                Status = ComputeStatus(v.Data),
            };
        }).ToList();

        return ApplyPagingSort(rows.AsQueryable(), query,
            ["productName", "category", "stockValue", "currentStock", "averageCost", "sellingPrice", "status"],
            "productName");
    }

    public async Task<PagedResult<StockSummaryRow>> GetStockSummaryAsync(ReportQuery query, CancellationToken ct)
    {
        var allVariants = await _variantRepository.GetAllUnpagedAsync(ct);
        var (productMap, _) = await BuildMapsAsync(ct);
        var filtered = await FilterVariantsByProductAsync(allVariants, productMap, query, ct);

        var grouped = filtered
            .GroupBy(x => x.Data.ProductId)
            .Select(g =>
            {
                var product = productMap.GetValueOrDefault(g.Key);
                return new StockSummaryRow
                {
                    ProductId = g.Key,
                    ProductName = product?.Name,
                    Category = product?.Category,
                    VariantCount = g.Count(),
                    TotalStock = g.Sum(v => v.Data.CurrentStock),
                    ReservedStock = g.Sum(v => v.Data.ReservedStock),
                    SoldStock = g.Sum(v => v.Data.SoldStock),
                    ReturnedStock = g.Sum(v => v.Data.ReturnedStock),
                    DamagedStock = g.Sum(v => v.Data.DamagedStock),
                    AverageCost = g.Average(v => v.Data.AveragePurchaseCost),
                    TotalValue = g.Sum(v => v.Data.CurrentStock * v.Data.AveragePurchaseCost),
                };
            })
            .ToList();

        return ApplyPagingSort(grouped.AsQueryable(), query,
            ["productName", "category", "totalStock", "totalValue", "variantCount"],
            "productName");
    }

    public async Task<PagedResult<SupplierReportRow>> GetSupplierReportAsync(ReportQuery query, CancellationToken ct)
    {
        var allEntries = await _purchaseEntryRepository.GetAllUnpagedAsync(ct);

        var filtered = allEntries.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(query.SupplierId))
            filtered = filtered.Where(e => e.Data.SupplierId == query.SupplierId);
        if (!string.IsNullOrWhiteSpace(query.Search))
            filtered = filtered.Where(e => e.Data.Supplier.Contains(query.Search, StringComparison.OrdinalIgnoreCase));
        if (query.DateFrom.HasValue)
            filtered = filtered.Where(e => e.Data.PurchaseDate >= query.DateFrom.Value);
        if (query.DateTo.HasValue)
            filtered = filtered.Where(e => e.Data.PurchaseDate <= query.DateTo.Value);

        var grouped = filtered
            .GroupBy(e => new { e.Data.Supplier, Sid = e.Data.SupplierId ?? "" })
            .Select(g =>
            {
                // Use OrderedEnumerable since MaxBy doesn't work well with value tuples
                var last = g.OrderByDescending(e => e.Data.PurchaseDate).FirstOrDefault();
                return new SupplierReportRow
                {
                    SupplierId = string.IsNullOrEmpty(g.Key.Sid) ? null : g.Key.Sid,
                    SupplierName = g.Key.Supplier,
                    TotalPurchases = g.Count(),
                    TotalAmount = 0,
                    LastPurchaseDate = last.Data?.PurchaseDate,
                };
            })
            .ToList();

        return ApplyPagingSort(grouped.AsQueryable(), query,
            ["supplierName", "totalPurchases", "totalAmount", "lastPurchaseDate"],
            "totalAmount");
    }

    public async Task<PagedResult<PurchaseReportRow>> GetPurchaseReportAsync(ReportQuery query, CancellationToken ct)
    {
        var allEntries = await _purchaseEntryRepository.GetAllUnpagedAsync(ct);
        var (productMap, _) = await BuildMapsAsync(ct);

        var entryIds = allEntries.Select(e => e.Id).ToList();
        var allItems = new List<(string Id, PurchaseItemDocument Data)>();
        foreach (var eid in entryIds)
        {
            var items = await _purchaseItemRepository.GetByPurchaseEntryIdAsync(eid, ct);
            allItems.AddRange(items.Select(i => (i.Id, i.Data)));
        }
        var itemsByEntry = allItems.GroupBy(i => i.Data.PurchaseEntryId).ToDictionary(g => g.Key, g => g.ToList());

        var entries = allEntries.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(query.SupplierId))
            entries = entries.Where(e => e.Data.SupplierId == query.SupplierId);
        if (!string.IsNullOrWhiteSpace(query.ProductId))
            entries = entries.Where(e => itemsByEntry.GetValueOrDefault(e.Id)?.Any(i => i.Data.ProductId == query.ProductId) == true);
        if (query.DateFrom.HasValue)
            entries = entries.Where(e => e.Data.PurchaseDate >= query.DateFrom.Value);
        if (query.DateTo.HasValue)
            entries = entries.Where(e => e.Data.PurchaseDate <= query.DateTo.Value);

        var rows = new List<PurchaseReportRow>();
        foreach (var (entryId, entry) in entries)
        {
            var items = itemsByEntry.GetValueOrDefault(entryId) ?? [];

            foreach (var (itemId, item) in items)
            {
                if (!string.IsNullOrWhiteSpace(query.Search))
                {
                    var search = query.Search;
                    var product = productMap.GetValueOrDefault(item.ProductId);
                    var matchName = product?.Name?.Contains(search, StringComparison.OrdinalIgnoreCase) == true;
                    var matchId = item.ProductId.Contains(search, StringComparison.OrdinalIgnoreCase);
                    if (!matchName && !matchId) continue;
                }

                var prod = productMap.GetValueOrDefault(item.ProductId);
                rows.Add(new PurchaseReportRow
                {
                    EntryId = entryId,
                    PurchaseDate = entry.PurchaseDate,
                    InvoiceNumber = entry.InvoiceNumber,
                    Supplier = entry.Supplier,
                    ProductName = prod?.Name,
                    Color = item.Color,
                    Size = item.Size,
                    Quantity = item.Quantity,
                    PurchasePrice = item.PurchasePrice,
                    Discount = item.Discount,
                    Gst = item.Gst,
                    Total = item.Total,
                    Status = entry.Status,
                });
            }
        }

        return ApplyPagingSort(rows.AsQueryable(), query,
            ["purchaseDate", "supplier", "productName", "quantity", "total", "status"],
            "purchaseDate");
    }

    public async Task<PagedResult<DeadStockRow>> GetDeadStockReportAsync(ReportQuery query, CancellationToken ct)
    {
        var allVariants = await _variantRepository.GetAllUnpagedAsync(ct);
        var (productMap, _) = await BuildMapsAsync(ct);
        var filtered = await FilterVariantsByProductAsync(allVariants, productMap, query, ct);

        var now = DateTime.UtcNow;
        var ninetyDaysAgo = now.AddDays(-90);
        var movements = await _stockMovementRepository.GetAllInRangeAsync(ninetyDaysAgo, now, ct);
        var lastMovementByVariant = movements
            .GroupBy(m => InventoryVariantRepository.ComputeVariantId(m.Data.ProductId, m.Data.Color ?? "", m.Data.Size ?? ""))
            .ToDictionary(g => g.Key, g =>
            {
                var last = g.OrderByDescending(m => m.Data.CreatedAt).FirstOrDefault();
                return (HasValue: last.Data != null, Id: last.Id, Data: last.Data);
            });

        var rows = new List<DeadStockRow>();
        foreach (var (variantId, v) in filtered)
        {
            if (v.CurrentStock <= 0) continue;

            var hasLastMove = lastMovementByVariant.TryGetValue(variantId, out var lastMove) && lastMove.HasValue;
            var product = productMap.GetValueOrDefault(v.ProductId);
            var daysSince = hasLastMove
                ? (int)(now.Date - lastMove.Data.CreatedAt.Date).TotalDays
                : (int)(now.Date - v.UpdatedAt.Date).TotalDays;

            rows.Add(new DeadStockRow
            {
                VariantId = variantId,
                ProductId = v.ProductId,
                ProductName = product?.Name,
                Color = v.Color,
                Size = v.Size,
                Sku = v.Sku,
                CurrentStock = v.CurrentStock,
                StockValue = v.CurrentStock * v.AveragePurchaseCost,
                LastMovementDate = hasLastMove ? lastMove.Data.CreatedAt : v.UpdatedAt,
                DaysSinceLastMovement = daysSince,
            });
        }

        return ApplyPagingSort(rows.AsQueryable(), query,
            ["productName", "currentStock", "stockValue", "daysSinceLastMovement"],
            "daysSinceLastMovement");
    }

    public async Task<PagedResult<LowStockReportRow>> GetLowStockReportAsync(ReportQuery query, CancellationToken ct)
    {
        var allVariants = await _variantRepository.GetAllUnpagedAsync(ct);
        var (productMap, _) = await BuildMapsAsync(ct);
        var filtered = await FilterVariantsByProductAsync(allVariants, productMap, query, ct);

        var rows = filtered
            .Where(v => ComputeStatus(v.Data) != InventoryStatus.Healthy)
            .Select(v =>
            {
                var product = productMap.GetValueOrDefault(v.Data.ProductId);
                return new LowStockReportRow
                {
                    VariantId = v.Id,
                    ProductId = v.Data.ProductId,
                    ProductName = product?.Name,
                    Color = v.Data.Color,
                    Size = v.Data.Size,
                    Sku = v.Data.Sku,
                    CurrentStock = v.Data.CurrentStock,
                    ReservedStock = v.Data.ReservedStock,
                    LowStockThreshold = v.Data.LowStockThreshold,
                    CriticalStockThreshold = ResolveCriticalThreshold(v.Data),
                    Status = ComputeStatus(v.Data),
                };
            })
            .ToList();

        return ApplyPagingSort(rows.AsQueryable(), query,
            ["productName", "currentStock", "lowStockThreshold", "status"],
            "status");
    }

    public async Task<PagedResult<MovementReportRow>> GetMovementReportAsync(ReportQuery query, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var from = query.DateFrom ?? now.AddYears(-1);
        var to = query.DateTo ?? now;

        var allMovements = await _stockMovementRepository.GetAllInRangeAsync(from, to, ct);
        var productIds = allMovements.Select(m => m.Data.ProductId).Distinct().ToList();
        var products = await _productRepository.GetByIdsAsync(productIds, ct);
        var productMap = products.ToDictionary(p => p.Id, p => p.Data);

        var variantIds = allMovements.Select(m =>
            InventoryVariantRepository.ComputeVariantId(m.Data.ProductId, m.Data.Color ?? "", m.Data.Size ?? ""))
            .Distinct().ToList();
        var variantMap = new Dictionary<string, string>();
        foreach (var vid in variantIds)
        {
            var variant = await _variantRepository.GetByIdAsync(vid, ct);
            if (variant != null) variantMap[vid] = variant.Sku;
        }

        var filtered = allMovements.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(query.ProductId))
            filtered = filtered.Where(m => m.Data.ProductId == query.ProductId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search;
            filtered = filtered.Where(m =>
                m.Data.ProductId.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (productMap.GetValueOrDefault(m.Data.ProductId)?.Name?.Contains(search, StringComparison.OrdinalIgnoreCase) == true) ||
                (m.Data.Reason?.Contains(search, StringComparison.OrdinalIgnoreCase) == true));
        }

        var rows = filtered.Select(m =>
        {
            var product = productMap.GetValueOrDefault(m.Data.ProductId);
            var vid = InventoryVariantRepository.ComputeVariantId(m.Data.ProductId, m.Data.Color ?? "", m.Data.Size ?? "");
            return new MovementReportRow
            {
                MovementId = m.Id,
                CreatedAt = m.Data.CreatedAt,
                ProductName = product?.Name,
                Color = m.Data.Color,
                Size = m.Data.Size,
                Sku = variantMap.GetValueOrDefault(vid) ?? "",
                MovementType = m.Data.MovementType,
                Quantity = m.Data.Quantity,
                Delta = m.Data.Delta,
                Reason = m.Data.Reason,
                CreatedBy = m.Data.CreatedBy,
            };
        }).ToList();

        return ApplyPagingSort(rows.AsQueryable(), query,
            ["createdAt", "productName", "movementType", "quantity", "delta"],
            "createdAt");
    }

    public async Task<string> ExportCsvAsync(string reportType, ReportQuery query, CancellationToken ct)
    {
        var unlimited = new ReportQuery
        {
            DateFrom = query.DateFrom,
            DateTo = query.DateTo,
            CategoryId = query.CategoryId,
            SupplierId = query.SupplierId,
            ProductId = query.ProductId,
            CollectionId = query.CollectionId,
            Search = query.Search,
            SortBy = query.SortBy,
            SortDesc = query.SortDesc,
            Page = 1,
            PageSize = int.MaxValue,
        };

        return reportType.ToLowerInvariant() switch
        {
            "inventory-valuation" => CsvWriter.Write((await GetInventoryValuationAsync(unlimited, ct)).Items, [
                ("ProductId", r => r.ProductId),
                ("ProductName", r => r.ProductName ?? ""),
                ("Category", r => r.Category ?? ""),
                ("Color", r => r.Color),
                ("Size", r => r.Size),
                ("SKU", r => r.Sku),
                ("CurrentStock", r => r.CurrentStock.ToString()),
                ("AvgCost", r => r.AverageCost.ToString("F2")),
                ("StockValue", r => r.StockValue.ToString("F2")),
                ("SellingPrice", r => r.SellingPrice?.ToString("F2") ?? ""),
                ("ProfitMargin(%)", r => r.ProfitMargin?.ToString("F2") ?? ""),
                ("Status", r => r.Status),
            ]),
            "stock-summary" => CsvWriter.Write((await GetStockSummaryAsync(unlimited, ct)).Items, [
                ("ProductId", r => r.ProductId),
                ("ProductName", r => r.ProductName ?? ""),
                ("Category", r => r.Category ?? ""),
                ("Variants", r => r.VariantCount.ToString()),
                ("TotalStock", r => r.TotalStock.ToString()),
                ("Reserved", r => r.ReservedStock.ToString()),
                ("Sold", r => r.SoldStock.ToString()),
                ("Returned", r => r.ReturnedStock.ToString()),
                ("Damaged", r => r.DamagedStock.ToString()),
                ("AvgCost", r => r.AverageCost.ToString("F2")),
                ("TotalValue", r => r.TotalValue.ToString("F2")),
            ]),
            "supplier" => CsvWriter.Write((await GetSupplierReportAsync(unlimited, ct)).Items, [
                ("Supplier", r => r.SupplierName),
                ("Purchases", r => r.TotalPurchases.ToString()),
                ("TotalAmount", r => r.TotalAmount.ToString("F2")),
                ("LastPurchase", r => r.LastPurchaseDate?.ToString("yyyy-MM-dd") ?? ""),
            ]),
            "purchase" => CsvWriter.Write((await GetPurchaseReportAsync(unlimited, ct)).Items, [
                ("Date", r => r.PurchaseDate.ToString("yyyy-MM-dd")),
                ("Invoice", r => r.InvoiceNumber),
                ("Supplier", r => r.Supplier),
                ("Product", r => r.ProductName ?? ""),
                ("Color", r => r.Color ?? ""),
                ("Size", r => r.Size ?? ""),
                ("Qty", r => r.Quantity.ToString()),
                ("Price", r => r.PurchasePrice.ToString("F2")),
                ("Discount", r => r.Discount.ToString("F2")),
                ("GST", r => r.Gst.ToString("F2")),
                ("Total", r => r.Total.ToString("F2")),
                ("Status", r => r.Status),
            ]),
            "dead-stock" => CsvWriter.Write((await GetDeadStockReportAsync(unlimited, ct)).Items, [
                ("Product", r => r.ProductName ?? ""),
                ("Color", r => r.Color),
                ("Size", r => r.Size),
                ("SKU", r => r.Sku),
                ("Stock", r => r.CurrentStock.ToString()),
                ("Value", r => r.StockValue.ToString("F2")),
                ("LastMove", r => r.LastMovementDate?.ToString("yyyy-MM-dd") ?? ""),
                ("DaysInactive", r => r.DaysSinceLastMovement.ToString()),
            ]),
            "low-stock" => CsvWriter.Write((await GetLowStockReportAsync(unlimited, ct)).Items, [
                ("Product", r => r.ProductName ?? ""),
                ("Color", r => r.Color),
                ("Size", r => r.Size),
                ("SKU", r => r.Sku),
                ("Stock", r => r.CurrentStock.ToString()),
                ("Reserved", r => r.ReservedStock.ToString()),
                ("LowThreshold", r => r.LowStockThreshold.ToString()),
                ("CriticalThreshold", r => r.CriticalStockThreshold.ToString()),
                ("Status", r => r.Status),
            ]),
            "movement" => CsvWriter.Write((await GetMovementReportAsync(unlimited, ct)).Items, [
                ("Date", r => r.CreatedAt.ToString("yyyy-MM-dd HH:mm")),
                ("Product", r => r.ProductName ?? ""),
                ("Color", r => r.Color ?? ""),
                ("Size", r => r.Size ?? ""),
                ("SKU", r => r.Sku),
                ("Type", r => r.MovementType),
                ("Qty", r => r.Quantity.ToString()),
                ("Delta", r => r.Delta.ToString()),
                ("Reason", r => r.Reason ?? ""),
                ("By", r => r.CreatedBy),
            ]),
            _ => throw new RequestValidationException($"Unknown report type '{reportType}'."),
        };
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private async Task<(Dictionary<string, ProductDocument> Products, Dictionary<string, List<string>> Collections)>
        BuildMapsAsync(CancellationToken ct)
    {
        var products = await _productRepository.GetAllUnpagedAsync(ct);
        var productMap = products.ToDictionary(p => p.Id, p => p.Data);

        var allCollections = await _collectionRepository.GetAllAsync(ct);
        var collectionProductIds = allCollections
            .SelectMany(c => c.Data.ProductIds.Select(pid => (ProductId: pid, CollectionId: c.Id)))
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.CollectionId).ToList());

        return (productMap, collectionProductIds);
    }

    private async Task<List<(string Id, InventoryVariantDocument Data)>> FilterVariantsByProduct(
        List<(string Id, InventoryVariantDocument Data)> variants,
        Dictionary<string, ProductDocument> productMap,
        Dictionary<string, List<string>> collectionProductMap,
        ReportQuery query)
    {
        var filtered = variants.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(query.ProductId))
            filtered = filtered.Where(v => v.Data.ProductId == query.ProductId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search;
            filtered = filtered.Where(v =>
                v.Data.Sku.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                v.Data.Color.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                v.Data.Size.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (productMap.GetValueOrDefault(v.Data.ProductId)?.Name?.Contains(search, StringComparison.OrdinalIgnoreCase) == true));
        }

        if (!string.IsNullOrWhiteSpace(query.CategoryId))
        {
            filtered = filtered.Where(v =>
            {
                var p = productMap.GetValueOrDefault(v.Data.ProductId);
                return p != null && string.Equals(p.Category, query.CategoryId, StringComparison.OrdinalIgnoreCase);
            });
        }

        if (!string.IsNullOrWhiteSpace(query.CollectionId))
        {
            filtered = filtered.Where(v =>
                collectionProductMap.TryGetValue(v.Data.ProductId, out var colIds) &&
                colIds.Contains(query.CollectionId));
        }

        return filtered.ToList();
    }

    private async Task<List<(string Id, InventoryVariantDocument Data)>> FilterVariantsByProductAsync(
        List<(string Id, InventoryVariantDocument Data)> variants,
        Dictionary<string, ProductDocument> productMap,
        ReportQuery query,
        CancellationToken ct)
    {
        var allCollections = await _collectionRepository.GetAllAsync(ct);
        var collectionProductMap = allCollections
            .SelectMany(c => c.Data.ProductIds.Select(pid => (ProductId: pid, CollectionId: c.Id)))
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.CollectionId).ToList());

        return await Task.Run(() => FilterVariantsByProduct(variants, productMap, collectionProductMap, query), ct);
    }

    private static PagedResult<T> ApplyPagingSort<T>(
        IQueryable<T> query, ReportQuery rq,
        string[] allowSort, string defaultSort)
    {
        var sortBy = allowSort.FirstOrDefault(s =>
            string.Equals(s, rq.SortBy, StringComparison.OrdinalIgnoreCase)) ?? defaultSort;

        var prop = typeof(T).GetProperty(sortBy, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        if (prop != null)
        {
            query = rq.SortDesc
                ? query.OrderByDescending(x => prop.GetValue(x))
                : query.OrderBy(x => prop.GetValue(x));
        }

        var totalCount = query.Count();
        var page = Math.Max(1, rq.Page);
        var pageSize = Math.Clamp(rq.PageSize, 1, 200);
        var items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new PagedResult<T>
        {
            Items = items,
            NextCursor = null,
            TotalCount = totalCount,
        };
    }

    private static string ComputeStatus(InventoryVariantDocument v)
    {
        var available = v.CurrentStock - v.ReservedStock;
        if (available <= 0) return InventoryStatus.OutOfStock;
        if (available <= ResolveCriticalThreshold(v)) return InventoryStatus.Critical;
        return available <= v.LowStockThreshold ? InventoryStatus.Low : InventoryStatus.Healthy;
    }

    private static long ResolveCriticalThreshold(InventoryVariantDocument v)
    {
        return v.CriticalStockThreshold ?? Math.Min(v.LowStockThreshold, 2);
    }
}

internal static class CsvWriter
{
    public static string Write<T>(List<T> items, (string Header, Func<T, string?> Value)[] columns)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", columns.Select(c => EscapeCsv(c.Header))));
        foreach (var item in items)
        {
            sb.AppendLine(string.Join(",", columns.Select(c => EscapeCsv(c.Value(item) ?? ""))));
        }
        return sb.ToString();
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
