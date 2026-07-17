using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.InventoryManagement;
using Vrindaya.Api.DTOs.Marketplace;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;

namespace Vrindaya.Api.Services.InventoryManagement;

public class InventoryManagementService : IInventoryManagementService
{
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IPurchaseEntryRepository _purchaseEntryRepository;
    private readonly IPurchaseItemRepository _purchaseItemRepository;
    private readonly IStockMovementRepository _stockMovementRepository;
    private readonly IProductRepository _productRepository;
    private readonly ICollectionRepository _collectionRepository;
    private readonly ISupplierRepository _supplierRepository;
    private readonly IStockAlertNotificationService _notificationService;
    private readonly ISkuGenerationService _skuGenerationService;
    private readonly IAuditLogService _auditLogService;
    private readonly IMarketplaceSettingsService _marketplaceSettingsService;

    public InventoryManagementService(
        IInventoryVariantRepository variantRepository,
        IPurchaseEntryRepository purchaseEntryRepository,
        IPurchaseItemRepository purchaseItemRepository,
        IStockMovementRepository stockMovementRepository,
        IProductRepository productRepository,
        ICollectionRepository collectionRepository,
        ISupplierRepository supplierRepository,
        IStockAlertNotificationService notificationService,
        ISkuGenerationService skuGenerationService,
        IAuditLogService auditLogService,
        IMarketplaceSettingsService marketplaceSettingsService)
    {
        _variantRepository = variantRepository;
        _purchaseEntryRepository = purchaseEntryRepository;
        _purchaseItemRepository = purchaseItemRepository;
        _stockMovementRepository = stockMovementRepository;
        _productRepository = productRepository;
        _collectionRepository = collectionRepository;
        _supplierRepository = supplierRepository;
        _notificationService = notificationService;
        _skuGenerationService = skuGenerationService;
        _auditLogService = auditLogService;
        _marketplaceSettingsService = marketplaceSettingsService;
    }

    // ── Variant inventory (per Product+Color+Size) ────────────────────────

    public async Task<InventoryVariantResponse> GetVariantAsync(string variantId, CancellationToken cancellationToken)
    {
        var document = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        var product = await _productRepository.GetByIdAsync(document.ProductId, cancellationToken);
        return ToResponse(variantId, document, product?.Name);
    }

    public async Task<List<InventoryVariantResponse>> GetVariantsByProductAsync(string productId, CancellationToken cancellationToken)
    {
        var variants = await _variantRepository.GetAllByProductIdAsync(productId, cancellationToken);
        var product = await _productRepository.GetByIdAsync(productId, cancellationToken);
        return variants.Select(v => ToResponse(v.Id, v.Data, product?.Name)).ToList();
    }

    public async Task<PagedResult<InventoryVariantResponse>> GetAllVariantsAsync(string? cursor, int pageSize, CancellationToken cancellationToken)
    {
        var page = await _variantRepository.GetAllAsync(cursor, pageSize, cancellationToken);
        var items = new List<InventoryVariantResponse>();
        foreach (var (id, data) in page.Items)
        {
            var product = await _productRepository.GetByIdAsync(data.ProductId, cancellationToken);
            items.Add(ToResponse(id, data, product?.Name));
        }

        return new PagedResult<InventoryVariantResponse>
        {
            Items = items,
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    public async Task<List<InventoryVariantResponse>> GetVariantsByStatusAsync(string status, CancellationToken cancellationToken)
    {
        if (!IsKnownInventoryStatus(status))
        {
            throw new RequestValidationException($"Unsupported inventory status '{status}'.");
        }

        var variants = await _variantRepository.GetAllUnpagedAsync(cancellationToken);
        var results = new List<InventoryVariantResponse>();
        foreach (var (id, data) in variants)
        {
            if (ComputeVariantStatus(data) != status) continue;
            var product = await _productRepository.GetByIdAsync(data.ProductId, cancellationToken);
            results.Add(ToResponse(id, data, product?.Name));
        }

        return results;
    }

    public async Task<InventoryVariantResponse> UpsertVariantAsync(string productId, UpsertInventoryVariantRequest request, string updatedBy, bool isSuperAdmin, CancellationToken cancellationToken)
    {
        ValidateThresholds(request.LowStockThreshold, request.CriticalStockThreshold);
        var variantId = InventoryVariantRepository.ComputeVariantId(productId, request.Color, request.Size);
        var existing = await _variantRepository.GetByIdAsync(variantId, cancellationToken);
        var now = DateTime.UtcNow;

        // Determine SKU
        string sku;
        if (existing == null)
        {
            sku = await _skuGenerationService.GenerateSkuAsync(productId, request.Color, request.Size, cancellationToken);
        }
        else if (isSuperAdmin && !string.IsNullOrWhiteSpace(request.Sku) && !string.Equals(existing.Sku, request.Sku, StringComparison.Ordinal))
        {
            if (!await _skuGenerationService.IsSkuAvailableAsync(request.Sku, cancellationToken))
                throw new RequestValidationException($"SKU '{request.Sku}' is already in use.");
            await _skuGenerationService.RegisterSkuAsync(existing.Sku, cancellationToken);
            sku = request.Sku;
        }
        else
        {
            sku = existing.Sku;
        }

        var document = new InventoryVariantDocument
        {
            ProductId = productId,
            Color = request.Color,
            Size = request.Size,
            Sku = sku,
            Barcode = request.Barcode,
            QrCode = request.QrCode,
            Supplier = request.Supplier,
            Warehouse = request.Warehouse,
            LowStockThreshold = request.LowStockThreshold,
            CriticalStockThreshold = request.CriticalStockThreshold,
            AveragePurchaseCost = existing?.AveragePurchaseCost ?? 0,
            CurrentStock = existing?.CurrentStock ?? 0,
            ReservedStock = existing?.ReservedStock ?? 0,
            SoldStock = existing?.SoldStock ?? 0,
            ReturnedStock = existing?.ReturnedStock ?? 0,
            DamagedStock = existing?.DamagedStock ?? 0,
            PurchaseCost = request.PurchaseCost,
            TransportationCost = request.TransportationCost,
            PackagingCost = request.PackagingCost,
            AdvertisingCost = request.AdvertisingCost,
            PaymentGatewayChargePercent = request.PaymentGatewayChargePercent,
            ShippingCost = request.ShippingCost,
            GstPercent = request.GstPercent,
            MiscellaneousCost = request.MiscellaneousCost,
            DesiredProfitPercent = request.DesiredProfitPercent,
            CreatedAt = existing?.CreatedAt ?? now,
            UpdatedAt = now,
        };

        document.MarketplaceProfiles = await ComputeAllProfilesAsync(document, request.MarketplaceProfiles, existing == null, cancellationToken);

        await _variantRepository.UpsertAsync(variantId, document, cancellationToken);

        var product = await _productRepository.GetByIdAsync(productId, cancellationToken);
        var desc = existing == null ? $"Inventory variant created (SKU: {sku})" : $"Inventory variant updated (SKU: {sku})";
        try { await _auditLogService.LogCustomAsync(existing == null ? "Create" : "Update", "InventoryVariants", variantId, $"SKU: {sku}", desc, updatedBy, null, null, afterData: AuditLogService.SerializeJson(document)); } catch { }
        return ToResponse(variantId, document, product?.Name);
    }

    public async Task<List<InventoryVariantResponse>> BulkUpdateStockThresholdsAsync(BulkUpdateStockThresholdsRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        ValidateThresholds(request.LowStockThreshold, request.CriticalStockThreshold);

        var ids = request.VariantIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        if (ids.Count == 0) throw new RequestValidationException("Select at least one inventory variant.");

        var variants = new List<(string Id, InventoryVariantDocument Data)>();
        foreach (var id in ids)
        {
            var variant = await _variantRepository.GetByIdAsync(id, cancellationToken);
            if (variant is null) throw new NotFoundException("Inventory variant", id);
            variants.Add((id, variant));
        }

        var now = DateTime.UtcNow;
        var results = new List<InventoryVariantResponse>();
        foreach (var (id, data) in variants)
        {
            var oldStatus = ComputeVariantStatus(data);
            data.LowStockThreshold = request.LowStockThreshold;
            data.CriticalStockThreshold = request.CriticalStockThreshold;
            data.UpdatedAt = now;
            await _variantRepository.UpsertAsync(id, data, cancellationToken);
            await NotifyIfStatusChangedAsync(id, data, oldStatus, cancellationToken);

            var product = await _productRepository.GetByIdAsync(data.ProductId, cancellationToken);
            results.Add(ToResponse(id, data, product?.Name));
        }

        try { await _auditLogService.LogCustomAsync("BulkUpdate", "InventoryVariants", null, null, $"Bulk stock threshold update: {request.VariantIds.Count} variants", updatedBy, null, null); } catch { }
        return results;
    }

    /// <summary>
    /// The Stock Movement Engine's generic recorder — every non-Purchase
    /// movement type flows through here (Purchase stays exclusively driven
    /// by the Purchase Register via ApplyInventoryTransitionAsync below, so
    /// it's excluded from RecordStockMovementRequest.MovementType's allowed
    /// values entirely). See ComputeMovementEffect for the per-type table.
    /// </summary>
    public async Task<InventoryVariantResponse> RecordMovementAsync(string variantId, RecordStockMovementRequest request, string actorEmail, CancellationToken cancellationToken)
    {
        var existing = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        var oldStatus = ComputeVariantStatus(existing);

        var (delta, soldDelta, returnedDelta, damagedDelta) = ComputeMovementEffect(request, existing.CurrentStock);

        existing.CurrentStock = Math.Max(0, existing.CurrentStock + delta);
        existing.SoldStock += soldDelta;
        existing.ReturnedStock += returnedDelta;
        existing.DamagedStock += damagedDelta;
        existing.UpdatedAt = DateTime.UtcNow;

        await _variantRepository.UpsertAsync(variantId, existing, cancellationToken);
        await NotifyIfStatusChangedAsync(variantId, existing, oldStatus, cancellationToken);

        var product = await _productRepository.GetByIdAsync(existing.ProductId, cancellationToken);

        await _stockMovementRepository.CreateAsync(new StockMovementDocument
        {
            ProductId = existing.ProductId,
            Color = existing.Color,
            Size = existing.Size,
            MovementType = request.MovementType,
            Quantity = Math.Abs(delta),
            Delta = delta,
            Reason = request.Reason,
            CreatedBy = actorEmail,
            CreatedAt = DateTime.UtcNow,
            SearchKeywords = BuildMovementSearchKeywords(product?.Name, existing.Sku, existing.Color, existing.Size, request.MovementType, request.Reason),
        }, cancellationToken);

        try { await _auditLogService.LogCustomAsync("StockMovement", "InventoryVariants", variantId, $"SKU: {existing.Sku}", $"Stock movement: {request.MovementType} ({Math.Abs(delta)} units)", actorEmail, null, null); } catch { }
        return ToResponse(variantId, existing, product?.Name);
    }

    /// <summary>
    /// Purchase is deliberately excluded — stays exclusively driven by
    /// Purchase Entries. Otherwise:
    ///   - Sale/Damage: Quantity (a positive count) subtracts from CurrentStock; Sale also adds to SoldStock, Damage to DamagedStock.
    ///   - Return: Quantity (a positive count) adds to CurrentStock and ReturnedStock.
    ///   - ManualAdjustment/Transfer: Quantity is a signed delta applied directly. Transfer models a single-location ledger entry (Reason names the counterpart location), not a real multi-warehouse split — InventoryVariantDocument has only one free-text Warehouse field, so a genuine two-sided transfer is out of scope here.
    ///   - StockCorrection: NewQuantity is the counted total; the delta is computed as NewQuantity minus the variant's current stock, so the ledger always shows exactly what changed.
    /// </summary>
    private static (long Delta, long SoldDelta, long ReturnedDelta, long DamagedDelta) ComputeMovementEffect(RecordStockMovementRequest request, long currentStock)
    {
        switch (request.MovementType)
        {
            case StockMovementType.Sale:
                var soldQty = RequirePositiveQuantity(request);
                return (-soldQty, soldQty, 0, 0);

            case StockMovementType.Return:
                var returnedQty = RequirePositiveQuantity(request);
                return (returnedQty, 0, returnedQty, 0);

            case StockMovementType.Damage:
                var damagedQty = RequirePositiveQuantity(request);
                return (-damagedQty, 0, 0, damagedQty);

            case StockMovementType.ManualAdjustment:
            case StockMovementType.Transfer:
                if (!request.Quantity.HasValue) throw new RequestValidationException("Quantity is required for this movement type.");
                if (request.Quantity.Value == 0) throw new RequestValidationException("Quantity must be non-zero.");
                return (request.Quantity.Value, 0, 0, 0);

            case StockMovementType.StockCorrection:
                if (!request.NewQuantity.HasValue) throw new RequestValidationException("NewQuantity is required for a Stock Correction.");
                return (request.NewQuantity.Value - currentStock, 0, 0, 0);

            default:
                throw new RequestValidationException($"Unsupported movement type '{request.MovementType}'.");
        }
    }

    private static long RequirePositiveQuantity(RecordStockMovementRequest request)
    {
        if (!request.Quantity.HasValue) throw new RequestValidationException("Quantity is required for this movement type.");
        if (request.Quantity.Value <= 0) throw new RequestValidationException("Quantity must be greater than zero for this movement type.");
        return request.Quantity.Value;
    }

    private static List<string> BuildMovementSearchKeywords(string? productName, string? sku, string? color, string? size, string movementType, string? reason)
    {
        var text = string.Join(' ', new[] { productName, sku, color, size, movementType, reason }.Where(s => !string.IsNullOrWhiteSpace(s)));
        return SearchTokenizer.Tokenize(text);
    }

    public async Task<List<InventoryVariantResponse>> GetLowStockVariantsAsync(CancellationToken cancellationToken)
    {
        var all = await _variantRepository.GetAllUnpagedAsync(cancellationToken);
        var results = new List<InventoryVariantResponse>();
        foreach (var (id, data) in all)
        {
            if (ComputeVariantStatus(data) == InventoryStatus.Healthy) continue;
            var product = await _productRepository.GetByIdAsync(data.ProductId, cancellationToken);
            results.Add(ToResponse(id, data, product?.Name));
        }
        return results;
    }

    // ── Purchase Register ──────────────────────────────────────────────────

    public async Task<PurchaseEntryResponse> CreatePurchaseAsync(CreatePurchaseEntryRequest request, string createdBy, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var entryDocument = new PurchaseEntryDocument
        {
            Supplier = request.Supplier,
            SupplierId = request.SupplierId,
            InvoiceNumber = request.InvoiceNumber,
            InvoiceDate = request.InvoiceDate,
            PurchaseDate = request.PurchaseDate,
            Remarks = request.Remarks,
            Status = request.Status,
            CreatedAt = now,
            CreatedBy = createdBy,
            UpdatedAt = now,
            UpdatedBy = createdBy,
        };

        var entryId = await _purchaseEntryRepository.CreateAsync(entryDocument, cancellationToken);

        var itemDocuments = request.Items.Select(i => BuildItemDocument(entryId, request.SupplierId, request.Status, i, now)).ToList();
        await _purchaseItemRepository.CreateManyAsync(itemDocuments, cancellationToken);

        // Nothing to reverse on a brand-new purchase — an empty "old" side
        // makes this a special case of the same transition algorithm edits use.
        await ApplyInventoryTransitionAsync(
            oldItems: [], oldStatus: PurchaseStatus.Draft,
            newItems: itemDocuments, newStatus: request.Status,
            entryId, request.InvoiceNumber, createdBy, cancellationToken);

        try { await _auditLogService.LogCreateAsync("Purchases", entryId, $"Invoice: {request.InvoiceNumber}", null, createdBy, null, null, $"Purchase entry created (Invoice: {request.InvoiceNumber}, Status: {request.Status})"); } catch { }
        return await GetPurchaseEntryAsync(entryId, cancellationToken);
    }

    public async Task<PurchaseEntryResponse> UpdatePurchaseAsync(string id, UpdatePurchaseEntryRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        var existingHeader = await _purchaseEntryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Purchase entry", id);
        var oldItems = await _purchaseItemRepository.GetByPurchaseEntryIdAsync(id, cancellationToken);

        var now = DateTime.UtcNow;
        var updatedHeader = new PurchaseEntryDocument
        {
            Supplier = request.Supplier,
            SupplierId = request.SupplierId,
            InvoiceNumber = request.InvoiceNumber,
            InvoiceDate = request.InvoiceDate,
            PurchaseDate = request.PurchaseDate,
            Remarks = request.Remarks,
            Status = request.Status,
            CreatedAt = existingHeader.CreatedAt,
            CreatedBy = existingHeader.CreatedBy,
            UpdatedAt = now,
            UpdatedBy = updatedBy,
        };
        await _purchaseEntryRepository.UpdateAsync(id, updatedHeader, cancellationToken);

        // Whole-sale replace, matching the "no per-field patching of purchase
        // items" rule — simpler and unambiguous versus diffing item lists.
        await _purchaseItemRepository.DeleteByPurchaseEntryIdAsync(id, cancellationToken);
        var newItemDocuments = request.Items.Select(i => BuildItemDocument(id, request.SupplierId, request.Status, i, now)).ToList();
        await _purchaseItemRepository.CreateManyAsync(newItemDocuments, cancellationToken);

        await ApplyInventoryTransitionAsync(
            oldItems: oldItems.Select(x => x.Data).ToList(), oldStatus: existingHeader.Status,
            newItems: newItemDocuments, newStatus: request.Status,
            id, request.InvoiceNumber, updatedBy, cancellationToken);

        try { await _auditLogService.LogUpdateAsync("Purchases", id, $"Invoice: {request.InvoiceNumber}", null, null, updatedBy, null, null, $"Purchase entry updated (Invoice: {request.InvoiceNumber}, Status: {request.Status})"); } catch { }
        return await GetPurchaseEntryAsync(id, cancellationToken);
    }

    public async Task<PagedResult<PurchaseEntryResponse>> GetPurchaseEntriesAsync(string? cursor, int pageSize, CancellationToken cancellationToken)
    {
        var page = await _purchaseEntryRepository.GetAllAsync(cursor, pageSize, cancellationToken);
        var items = new List<PurchaseEntryResponse>();

        foreach (var (id, data) in page.Items)
        {
            items.Add(await ToResponseAsync(id, data, cancellationToken));
        }

        return new PagedResult<PurchaseEntryResponse>
        {
            Items = items,
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    public async Task<PurchaseEntryResponse> GetPurchaseEntryAsync(string id, CancellationToken cancellationToken)
    {
        var document = await _purchaseEntryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Purchase entry", id);

        return await ToResponseAsync(id, document, cancellationToken);
    }

    /// <summary>
    /// Reads via GetAllInRangeAsync (a plain createdAt range query, needing
    /// no composite index) over a bounded window — defaulting to the last 2
    /// years when the caller doesn't narrow it, which in practice is this
    /// store's entire lifetime — then applies ProductId/MovementType/Search
    /// together in memory, sorts, and paginates in memory. This trades
    /// server-side cursor pagination for full filter combinability without
    /// needing a new composite index per combination; revisit if the ledger
    /// ever grows past admin-tool scale (same accepted tradeoff already used
    /// by GetDashboardAsync/RecomputeVariantAverageCostAsync elsewhere in
    /// this file). `cursor` is reinterpreted as a 1-based page-number string
    /// for this endpoint only — PagedResult's shape is unchanged, so the
    /// frontend's existing cursor-stack Previous/Next code needs no changes.
    /// </summary>
    public async Task<PagedResult<StockMovementResponse>> GetMovementsAsync(
        string? cursor, int pageSize, string? productId, string? movementType,
        string? search, DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken)
    {
        var from = dateFrom ?? DateTime.UtcNow.AddYears(-2);
        var to = dateTo ?? DateTime.UtcNow;

        IEnumerable<(string Id, StockMovementDocument Data)> filtered = await _stockMovementRepository.GetAllInRangeAsync(from, to, cancellationToken);

        if (!string.IsNullOrWhiteSpace(productId))
        {
            filtered = filtered.Where(m => m.Data.ProductId == productId);
        }
        if (!string.IsNullOrWhiteSpace(movementType))
        {
            filtered = filtered.Where(m => m.Data.MovementType == movementType);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var tokens = SearchTokenizer.Tokenize(search);
            filtered = filtered.Where(m => tokens.Any(t => m.Data.SearchKeywords.Contains(t)));
        }

        var sorted = filtered.OrderByDescending(m => m.Data.CreatedAt).ToList();
        var totalCount = sorted.Count;

        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);
        var page = int.TryParse(cursor, out var parsedPage) && parsedPage > 0 ? parsedPage : 1;
        var pageItems = sorted.Skip((page - 1) * clampedPageSize).Take(clampedPageSize).ToList();

        var items = new List<StockMovementResponse>();
        foreach (var (id, data) in pageItems)
        {
            var product = await _productRepository.GetByIdAsync(data.ProductId, cancellationToken);
            items.Add(ToResponse(id, data, product?.Name));
        }

        return new PagedResult<StockMovementResponse>
        {
            Items = items,
            NextCursor = page * clampedPageSize < totalCount ? (page + 1).ToString() : null,
            TotalCount = totalCount,
        };
    }

    public async Task<InventoryDashboardResponse> GetDashboardAsync(InventoryDashboardQuery query, CancellationToken cancellationToken)
    {
        // ── Load everything once, filter/aggregate in memory — same bounded
        // "unpaged" style GetDashboardAsync and RecomputeVariantAverageCostAsync
        // already use elsewhere in this service. ──────────────────────────
        var allVariants = await _variantRepository.GetAllUnpagedAsync(cancellationToken);
        var allProducts = await _productRepository.GetAllUnpagedAsync(cancellationToken);
        var productMap = allProducts.ToDictionary(p => p.Id, p => p.Data);

        HashSet<string>? collectionProductIds = null;
        if (!string.IsNullOrWhiteSpace(query.CollectionId))
        {
            var collection = await _collectionRepository.GetByIdAsync(query.CollectionId, cancellationToken);
            collectionProductIds = collection != null ? [.. collection.ProductIds] : [];
        }

        SupplierDocument? filterSupplier = null;
        if (!string.IsNullOrWhiteSpace(query.SupplierId))
        {
            filterSupplier = await _supplierRepository.GetByIdAsync(query.SupplierId, cancellationToken);
        }

        bool ProductMatchesFilters(string productId)
        {
            if (query.Category == null && collectionProductIds == null) return true;
            if (!productMap.TryGetValue(productId, out var product)) return false;
            if (query.Category != null && !string.Equals(product.Category, query.Category, StringComparison.OrdinalIgnoreCase)) return false;
            if (collectionProductIds != null && !collectionProductIds.Contains(productId)) return false;
            return true;
        }

        bool VariantMatchesSupplier(InventoryVariantDocument v)
        {
            if (string.IsNullOrWhiteSpace(query.SupplierId)) return true;
            if (filterSupplier == null) return false; // requested supplier id doesn't exist — match nothing, not everything
            return string.Equals(v.Supplier?.Trim(), filterSupplier.CompanyName.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        var filteredVariants = allVariants
            .Where(v => ProductMatchesFilters(v.Data.ProductId) && VariantMatchesSupplier(v.Data))
            .ToList();
        var filteredProducts = allProducts.Where(p => ProductMatchesFilters(p.Id)).ToList();

        // ── Date window — defaults to the last 30 days when unset. Only
        // activity-based metrics/charts below are scoped to it; the
        // snapshot cards above always reflect current state. ─────────────
        var today = DateTime.UtcNow.Date;
        var windowStart = (query.DateFrom ?? today.AddDays(-30)).Date;
        var windowEnd = (query.DateTo ?? today).Date.AddDays(1).AddTicks(-1);
        var hasExplicitDateFilter = query.DateFrom.HasValue || query.DateTo.HasValue;

        // ── Purchase items (Confirmed only — matches every other "real
        // inventory impact" rule already in this service) ────────────────
        var allEntries = await _purchaseEntryRepository.GetAllUnpagedAsync(cancellationToken);
        var entryDateMap = allEntries.ToDictionary(e => e.Id, e => e.Data.PurchaseDate);
        var allItems = await _purchaseItemRepository.GetAllUnpagedAsync(cancellationToken);

        var filteredConfirmedItems = allItems
            .Where(i => i.Data.Status == PurchaseStatus.Confirmed
                && ProductMatchesFilters(i.Data.ProductId)
                && (query.SupplierId == null || i.Data.SupplierId == query.SupplierId))
            .Select(i => (i.Data, PurchaseDate: entryDateMap.GetValueOrDefault(i.Data.PurchaseEntryId)))
            .ToList();

        var itemsInWindow = filteredConfirmedItems.Where(x => x.PurchaseDate >= windowStart && x.PurchaseDate <= windowEnd).ToList();

        var monthsStart = hasExplicitDateFilter ? windowStart : today.AddMonths(-12);
        var purchasesByMonth = filteredConfirmedItems
            .Where(x => x.PurchaseDate >= monthsStart && x.PurchaseDate <= windowEnd)
            .GroupBy(x => x.PurchaseDate.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .Select(g => new NamedValue { Name = g.Key, Value = g.Sum(x => x.Data.Total) })
            .ToList();

        var supplierDistribution = new List<NamedValue>();
        foreach (var group in filteredConfirmedItems.Where(x => x.Data.SupplierId != null)
            .GroupBy(x => x.Data.SupplierId!)
            .Select(g => new { SupplierId = g.Key, Total = g.Sum(x => x.Data.Total) })
            .OrderByDescending(g => g.Total)
            .Take(8))
        {
            var supplier = await _supplierRepository.GetByIdAsync(group.SupplierId, cancellationToken);
            supplierDistribution.Add(new NamedValue { Name = supplier?.CompanyName ?? group.SupplierId, Value = group.Total });
        }

        // ── Stock movements within the date window ────────────────────────
        var movementsInWindow = (await _stockMovementRepository.GetAllInRangeAsync(windowStart, windowEnd, cancellationToken))
            .Where(m => ProductMatchesFilters(m.Data.ProductId))
            .ToList();

        var inventoryTrend = movementsInWindow
            .GroupBy(m => m.Data.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Sum(m => m.Data.Delta) })
            .ToList();

        var currentlyLowOrCritical = filteredVariants
            .Where(v => ComputeVariantStatus(v.Data) != InventoryStatus.Healthy)
            .Select(v => v.Id)
            .ToHashSet();

        var lowStockTrend = movementsInWindow
            .Where(m => m.Data.Delta < 0)
            .GroupBy(m => InventoryVariantRepository.ComputeVariantId(m.Data.ProductId, m.Data.Color ?? string.Empty, m.Data.Size ?? string.Empty))
            .Where(g => currentlyLowOrCritical.Contains(g.Key))
            .Select(g => g.OrderByDescending(m => m.Data.CreatedAt).First().Data.CreatedAt.Date)
            .GroupBy(d => d)
            .OrderBy(g => g.Key)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .ToList();

        // ── Expected Revenue/Profit — Website marketplace profile (the
        // default/primary channel, same choice inventory-list's "Selling
        // Price" column already made). ────────────────────────────────────
        double expectedRevenue = 0, expectedProfit = 0;
        foreach (var (_, v) in filteredVariants)
        {
            var website = v.MarketplaceProfiles.FirstOrDefault(p => p.MarketplaceType == Vrindaya.Api.Constants.MarketplaceType.Website);
            if (website == null) continue;
            var effectivePrice = website.ManualSellingPriceOverride ?? website.SuggestedSellingPrice;
            expectedRevenue += v.CurrentStock * effectivePrice;
            expectedProfit += v.CurrentStock * website.ProfitAmount;
        }

        // ── Top Selling Categories — wired to SoldStock; empty until Order
        // Management writes Sale movements (see model doc comment). ────────
        var topSellingCategories = filteredVariants
            .Where(v => productMap.ContainsKey(v.Data.ProductId))
            .GroupBy(v => productMap[v.Data.ProductId].Category)
            .Select(g => new NamedValue { Name = g.Key, Value = g.Sum(v => v.Data.SoldStock) })
            .Where(x => x.Value > 0)
            .OrderByDescending(x => x.Value)
            .Take(8)
            .ToList();

        var topInventoryValue = filteredVariants
            .GroupBy(v => v.Data.ProductId)
            .Select(g => new { ProductId = g.Key, Value = g.Sum(v => v.Data.CurrentStock * v.Data.AveragePurchaseCost) })
            .OrderByDescending(x => x.Value)
            .Take(10)
            .Select(x => new NamedValue { Name = productMap.TryGetValue(x.ProductId, out var p) ? p.Name : x.ProductId, Value = x.Value })
            .ToList();

        var recent = await _stockMovementRepository.GetRecentAsync(10, cancellationToken);
        var recentResponses = new List<StockMovementResponse>();
        foreach (var (id, data) in recent)
        {
            var product = await _productRepository.GetByIdAsync(data.ProductId, cancellationToken);
            recentResponses.Add(ToResponse(id, data, product?.Name));
        }

        return new InventoryDashboardResponse
        {
            InventoryValue = filteredVariants.Sum(v => v.Data.CurrentStock * v.Data.AveragePurchaseCost),
            CurrentStock = filteredVariants.Sum(v => v.Data.CurrentStock),
            LowStockCount = filteredVariants.Count(v => ComputeVariantStatus(v.Data) == InventoryStatus.Low),
            CriticalStockCount = filteredVariants.Count(v => ComputeVariantStatus(v.Data) == InventoryStatus.Critical),
            OutOfStockCount = filteredVariants.Count(v => ComputeVariantStatus(v.Data) == InventoryStatus.OutOfStock),
            TotalProducts = filteredProducts.Count,
            TotalVariants = filteredVariants.Count,
            ExpectedRevenue = expectedRevenue,
            ExpectedProfit = expectedProfit,
            TodaysPurchases = itemsInWindow.Sum(x => x.Data.Total),
            TodaysStockAdded = movementsInWindow.Where(m => m.Data.Delta > 0).Sum(m => m.Data.Delta),
            InventoryTrend = inventoryTrend,
            LowStockTrend = lowStockTrend,
            PurchasesByMonth = purchasesByMonth,
            TopSellingCategories = topSellingCategories,
            SupplierDistribution = supplierDistribution,
            TopInventoryValue = topInventoryValue,
            RecentMovements = recentResponses,
        };
    }

    // ── Purchase Register — inventory transition algorithm ────────────────

    /// <summary>
    /// A single algorithm handles every create/edit/status-change case
    /// symmetrically, now scoped per (ProductId, Color, Size) variant rather
    /// than per product:
    ///   1. If oldStatus was Confirmed, reverse its per-variant quantities
    ///      (subtract them back out of CurrentStock) — exact, since it's
    ///      just undoing exactly what was added, regardless of what else
    ///      has happened to that variant's stock since.
    ///   2. If newStatus is Confirmed, apply the new items' per-variant
    ///      quantities (add them to CurrentStock) and write one
    ///      StockMovement per affected variant for the net delta (Purchase
    ///      if the delta increased stock, ManualAdjustment if it decreased
    ///      it — there's no dedicated "purchase correction" movement type).
    ///   3. Recompute AveragePurchaseCost (full replay, not incremental —
    ///      see RecomputeVariantAverageCostAsync) for every variant touched
    ///      by either the old or new item set.
    ///
    /// This covers Draft→Draft (no-op), Draft→Confirmed (pure apply),
    /// Confirmed→Confirmed-with-edits (net delta), Confirmed→Cancelled or
    /// Confirmed→Draft (pure reversal), and Cancelled/Draft→Confirmed
    /// (pure apply, since nothing was posted before) with no special-casing
    /// per transition.
    /// </summary>
    private async Task ApplyInventoryTransitionAsync(
        List<PurchaseItemDocument> oldItems, string oldStatus,
        List<PurchaseItemDocument> newItems, string newStatus,
        string purchaseEntryId, string invoiceNumber, string actorEmail, CancellationToken cancellationToken)
    {
        var deltas = new Dictionary<string, long>();
        var variantKeys = new Dictionary<string, (string ProductId, string Color, string Size)>();

        string RegisterVariant(PurchaseItemDocument item)
        {
            var variantId = InventoryVariantRepository.ComputeVariantId(item.ProductId, item.Color ?? string.Empty, item.Size ?? string.Empty);
            variantKeys[variantId] = (item.ProductId, item.Color ?? string.Empty, item.Size ?? string.Empty);
            return variantId;
        }

        // Register every variant touched by either side first, so one gets
        // recomputed even when its net delta happens to be zero (e.g. a
        // pure Confirmed→Confirmed price-only edit with the same quantity).
        foreach (var item in oldItems) RegisterVariant(item);
        foreach (var item in newItems) RegisterVariant(item);

        if (oldStatus == PurchaseStatus.Confirmed)
        {
            foreach (var item in oldItems)
            {
                var variantId = RegisterVariant(item);
                deltas[variantId] = deltas.GetValueOrDefault(variantId) - item.Quantity;
            }
        }

        if (newStatus == PurchaseStatus.Confirmed)
        {
            foreach (var item in newItems)
            {
                var variantId = RegisterVariant(item);
                deltas[variantId] = deltas.GetValueOrDefault(variantId) + item.Quantity;
            }
        }

        foreach (var (variantId, key) in variantKeys)
        {
            var delta = deltas.GetValueOrDefault(variantId);
            if (delta != 0)
            {
                await ApplyVariantStockDeltaAsync(variantId, key.ProductId, key.Color, key.Size, delta, cancellationToken);

                var product = await _productRepository.GetByIdAsync(key.ProductId, cancellationToken);
                var variant = await _variantRepository.GetByIdAsync(variantId, cancellationToken);
                var reason = $"Purchase entry {purchaseEntryId} ({invoiceNumber})";

                await _stockMovementRepository.CreateAsync(new StockMovementDocument
                {
                    ProductId = key.ProductId,
                    Color = key.Color,
                    Size = key.Size,
                    MovementType = delta > 0 ? StockMovementType.Purchase : StockMovementType.ManualAdjustment,
                    Quantity = Math.Abs(delta),
                    Delta = delta,
                    Reason = reason,
                    ReferenceType = "PurchaseEntry",
                    ReferenceId = purchaseEntryId,
                    CreatedBy = actorEmail,
                    CreatedAt = DateTime.UtcNow,
                    SearchKeywords = BuildMovementSearchKeywords(product?.Name, variant?.Sku, key.Color, key.Size, delta > 0 ? StockMovementType.Purchase : StockMovementType.ManualAdjustment, reason),
                }, cancellationToken);
            }

            await RecomputeVariantAverageCostAsync(variantId, key.ProductId, key.Color, key.Size, cancellationToken);
        }
    }

    private async Task ApplyVariantStockDeltaAsync(string variantId, string productId, string color, string size, long delta, CancellationToken cancellationToken)
    {
        var existing = await _variantRepository.GetByIdAsync(variantId, cancellationToken);
        var now = DateTime.UtcNow;

        // Auto-creates on first-ever purchase of a variant nobody has set up
        // via the Variant management screen yet — Sku/Barcode are left blank
        // for the admin to fill in later, same "auto-create, backfill later"
        // precedent the old product-level record used.
        var document = existing ?? new InventoryVariantDocument { ProductId = productId, Color = color, Size = size, CreatedAt = now };
        document.ProductId = productId;
        document.Color = color;
        document.Size = size;
        var oldStatus = ComputeVariantStatus(document);
        document.CurrentStock = Math.Max(0, document.CurrentStock + delta);
        document.UpdatedAt = now;

        await _variantRepository.UpsertAsync(variantId, document, cancellationToken);
        await NotifyIfStatusChangedAsync(variantId, document, oldStatus, cancellationToken);
    }

    /// <summary>
    /// AveragePurchaseCost is recomputed from scratch — Σ(item.Total) /
    /// Σ(item.Quantity) across every currently-Confirmed purchaseItem for
    /// this exact variant — rather than maintained as a running weighted
    /// average, which can't be un-done cleanly once purchases can be edited
    /// or cancelled after the fact. A full replay is always correct and
    /// self-healing.
    /// </summary>
    private async Task RecomputeVariantAverageCostAsync(string variantId, string productId, string color, string size, CancellationToken cancellationToken)
    {
        var confirmedItems = await _purchaseItemRepository.GetConfirmedByVariantAsync(productId, color, size, cancellationToken);
        var totalQuantity = confirmedItems.Sum(i => i.Quantity);
        var newAverageCost = totalQuantity > 0 ? confirmedItems.Sum(i => i.Total) / totalQuantity : 0;

        var existing = await _variantRepository.GetByIdAsync(variantId, cancellationToken);
        if (existing == null) return; // ApplyVariantStockDeltaAsync always runs first when there's any delta, so this only skips a genuinely untouched variant.

        existing.AveragePurchaseCost = newAverageCost;
        existing.UpdatedAt = DateTime.UtcNow;
        await _variantRepository.UpsertAsync(variantId, existing, cancellationToken);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static PurchaseItemDocument BuildItemDocument(string purchaseEntryId, string? supplierId, string status, PurchaseEntryItemRequest request, DateTime now)
    {
        var document = new PurchaseItemDocument
        {
            PurchaseEntryId = purchaseEntryId,
            SupplierId = supplierId,
            Status = status,
            ProductId = request.ProductId,
            Color = request.Color,
            Size = request.Size,
            Quantity = request.Quantity,
            PurchasePrice = request.PurchasePrice,
            Discount = request.Discount,
            Gst = request.Gst,
            Tax = request.Tax,
            CreatedAt = now,
        };
        document.Total = ComputeItemTotal(document);
        return document;
    }

    /// <summary>Taxable = Quantity × PurchasePrice − Discount (a flat amount); GST and Tax are each independent percentages applied to that taxable amount and summed in — see PurchaseItemDocument's field doc comments.</summary>
    private static double ComputeItemTotal(PurchaseItemDocument item)
    {
        var subtotal = item.Quantity * item.PurchasePrice;
        var taxable = Math.Max(0, subtotal - item.Discount);
        var gstAmount = taxable * item.Gst / 100.0;
        var taxAmount = taxable * item.Tax / 100.0;
        return taxable + gstAmount + taxAmount;
    }

    /// <summary>
    /// The Pricing Engine — one marketplace profile's full set of computed
    /// fields, derived from the variant's 9 shared cost/strategy inputs plus
    /// this profile's own Commission% and optional manual override.
    ///
    /// flatCost = Purchase + Transportation + Packaging + Advertising +
    /// Shipping + Misc (the actual cost of goods/operations, independent of
    /// where it sells). Commission/Gateway/GST are each a percentage of the
    /// selling price itself (not flatCost) — the same "solve for price
    /// algebraically" approach the retired per-product calculator used, now
    /// parameterized per marketplace:
    ///   suggestedPrice × (1 − deductionFraction) = flatCost × (1 + desiredProfit%)
    /// EffectiveSellingPrice is the manual override if set, else
    /// SuggestedSellingPrice — every other computed field (TotalCost,
    /// ProfitAmount, ProfitPercentage/markup, Margin) is derived from
    /// whichever that is, so a manual override on one marketplace never
    /// affects another profile's numbers.
    /// </summary>
    private static MarketplacePricingProfileDocument ComputeMarketplaceProfile(InventoryVariantDocument variant, MarketplaceProfileRequest request)
    {
        var flatCost = variant.PurchaseCost + variant.TransportationCost + variant.PackagingCost
            + variant.AdvertisingCost + variant.ShippingCost + variant.MiscellaneousCost;

        var deductionFraction = (request.CommissionPercent + variant.PaymentGatewayChargePercent + variant.GstPercent) / 100.0;
        var profitFraction = variant.DesiredProfitPercent / 100.0;

        var suggestedPrice = deductionFraction < 1
            ? flatCost * (1 + profitFraction) / (1 - deductionFraction)
            : flatCost;

        var effectivePrice = request.ManualSellingPriceOverride ?? suggestedPrice;
        var totalCost = flatCost + (effectivePrice * deductionFraction);
        var profitAmount = effectivePrice - totalCost;

        return new MarketplacePricingProfileDocument
        {
            MarketplaceType = request.MarketplaceType,
            CommissionPercent = request.CommissionPercent,
            ManualSellingPriceOverride = request.ManualSellingPriceOverride,
            SuggestedSellingPrice = suggestedPrice,
            TotalCost = totalCost,
            ProfitAmount = profitAmount,
            ProfitPercentage = flatCost > 0 ? profitAmount / flatCost * 100 : 0,
            Margin = effectivePrice > 0 ? profitAmount / effectivePrice * 100 : 0,
        };
    }

    private async Task<List<MarketplacePricingProfileDocument>> ComputeAllProfilesAsync(
        InventoryVariantDocument variant, List<MarketplaceProfileRequest> requests,
        bool isNew, CancellationToken cancellationToken)
    {
        var results = new List<MarketplacePricingProfileDocument>();
        foreach (var request in requests)
        {
            var profile = ComputeMarketplaceProfile(variant, request);
            var extended = await ComputeExtendedMarketplaceProfile(variant, request, isNew, cancellationToken);
            extended.MarketplaceType = request.MarketplaceType;
            extended.CommissionPercent = profile.CommissionPercent;
            extended.ManualSellingPriceOverride = profile.ManualSellingPriceOverride;
            extended.SuggestedSellingPrice = profile.SuggestedSellingPrice;
            extended.TotalCost = profile.TotalCost;
            extended.ProfitAmount = profile.ProfitAmount;
            extended.ProfitPercentage = profile.ProfitPercentage;
            extended.Margin = profile.Margin;
            results.Add(extended);
        }
        return results;
    }

    private async Task<MarketplacePricingProfileDocument> ComputeExtendedMarketplaceProfile(
        InventoryVariantDocument variant, MarketplaceProfileRequest request,
        bool isNew, CancellationToken cancellationToken)
    {
        var defaults = isNew
            ? await _marketplaceSettingsService.GetDefaultsAsync(request.MarketplaceType, cancellationToken)
            : new MarketplaceDefaultsDto();

        var mrp = request.Mrp;
        var sellingPrice = request.SellingPrice > 0 ? request.SellingPrice : mrp;
        var commissionPercent = request.CommissionPercent > 0 ? request.CommissionPercent : defaults.DefaultCommissionPercent;
        var closingFee = request.ClosingFee > 0 ? request.ClosingFee : defaults.DefaultClosingFee;
        var shippingCharge = request.ShippingCharge ?? defaults.DefaultShippingCharge;
        var packagingCharge = request.PackagingCharge ?? defaults.DefaultPackagingCharge;
        var advertisementCost = request.AdvertisementCost ?? defaults.DefaultAdvertisementCost;
        var miscellaneousCharges = request.MiscellaneousCharges ?? defaults.DefaultMiscellaneousCharges;

        var perMktCosts = shippingCharge + packagingCharge + advertisementCost + miscellaneousCharges;
        var commissionAmount = sellingPrice * commissionPercent / 100.0;
        var flatCost = variant.PurchaseCost + variant.TransportationCost;
        var expectedSettlement = sellingPrice - commissionAmount - closingFee - perMktCosts;
        var netProfit = expectedSettlement - flatCost;
        var marginPercentage = sellingPrice > 0 ? netProfit / sellingPrice * 100 : 0;

        return new MarketplacePricingProfileDocument
        {
            Mrp = mrp,
            SellingPrice = sellingPrice,
            ClosingFee = closingFee,
            ShippingCharge = request.ShippingCharge,
            PackagingCharge = request.PackagingCharge,
            AdvertisementCost = request.AdvertisementCost,
            MiscellaneousCharges = request.MiscellaneousCharges,
            ExpectedSettlement = expectedSettlement,
            NetProfit = netProfit,
            MarginPercentage = marginPercentage,
        };
    }

    private static string ComputeVariantStatus(InventoryVariantDocument document)
    {
        var available = document.CurrentStock - document.ReservedStock;
        if (available <= 0) return InventoryStatus.OutOfStock;
        if (available <= ResolveCriticalStockThreshold(document)) return InventoryStatus.Critical;
        return available <= document.LowStockThreshold ? InventoryStatus.Low : InventoryStatus.Healthy;
    }

    private static long ResolveCriticalStockThreshold(InventoryVariantDocument document)
    {
        // Firestore variants created before this field existed retain a safe default
        // until an administrator saves explicit thresholds.
        return document.CriticalStockThreshold ?? Math.Min(document.LowStockThreshold, 2);
    }

    private static void ValidateThresholds(long lowStockThreshold, long criticalStockThreshold)
    {
        if (criticalStockThreshold > lowStockThreshold)
        {
            throw new RequestValidationException("Critical stock threshold cannot be greater than the low stock threshold.");
        }
    }

    private static bool IsKnownInventoryStatus(string status) => status is
        InventoryStatus.OutOfStock or InventoryStatus.Critical or InventoryStatus.Low or InventoryStatus.Healthy;

    /// <summary>
    /// Fires stock alert notifications when a variant's status changes.
    /// Currently routed through StubStockAlertNotificationService (no-op
    /// logger) — swap IStockAlertNotificationService's DI registration for
    /// a real provider when email/SMS notifications go live.
    /// </summary>
    private async Task NotifyIfStatusChangedAsync(string variantId, InventoryVariantDocument document, string? oldStatus, CancellationToken cancellationToken)
    {
        var newStatus = ComputeVariantStatus(document);
        if (oldStatus == newStatus) return;

        var product = await _productRepository.GetByIdAsync(document.ProductId, cancellationToken);

        if (newStatus != InventoryStatus.Healthy)
        {
            await _notificationService.NotifyLowStockAsync(
                variantId, document.ProductId, product?.Name,
                document.Color, document.Size,
                document.CurrentStock, document.LowStockThreshold,
                ResolveCriticalStockThreshold(document), newStatus, cancellationToken);
        }
        else if (oldStatus != InventoryStatus.Healthy)
        {
            await _notificationService.NotifyStockRestoredAsync(
                variantId, document.ProductId, product?.Name,
                document.Color, document.Size,
                document.CurrentStock, cancellationToken);
        }
    }

    private static InventoryVariantResponse ToResponse(string variantId, InventoryVariantDocument document, string? productName)
    {
        return new InventoryVariantResponse
        {
            Id = variantId,
            ProductId = document.ProductId,
            ProductName = productName,
            Color = document.Color,
            Size = document.Size,
            Sku = document.Sku,
            Barcode = document.Barcode,
            QrCode = document.QrCode,
            Supplier = document.Supplier,
            Warehouse = document.Warehouse,
            AveragePurchaseCost = document.AveragePurchaseCost,
            CurrentStock = document.CurrentStock,
            ReservedStock = document.ReservedStock,
            SoldStock = document.SoldStock,
            ReturnedStock = document.ReturnedStock,
            DamagedStock = document.DamagedStock,
            LowStockThreshold = document.LowStockThreshold,
            CriticalStockThreshold = ResolveCriticalStockThreshold(document),
            Status = ComputeVariantStatus(document),
            PurchaseCost = document.PurchaseCost,
            TransportationCost = document.TransportationCost,
            PackagingCost = document.PackagingCost,
            AdvertisingCost = document.AdvertisingCost,
            PaymentGatewayChargePercent = document.PaymentGatewayChargePercent,
            ShippingCost = document.ShippingCost,
            GstPercent = document.GstPercent,
            MiscellaneousCost = document.MiscellaneousCost,
            DesiredProfitPercent = document.DesiredProfitPercent,
            MarketplaceProfiles = document.MarketplaceProfiles.Select(ToResponse).ToList(),
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt,
        };
    }

    private static MarketplaceProfileResponse ToResponse(MarketplacePricingProfileDocument profile)
    {
        return new MarketplaceProfileResponse
        {
            MarketplaceType = profile.MarketplaceType,
            CommissionPercent = profile.CommissionPercent,
            ManualSellingPriceOverride = profile.ManualSellingPriceOverride,
            EffectiveSellingPrice = profile.ManualSellingPriceOverride ?? profile.SuggestedSellingPrice,
            SuggestedSellingPrice = profile.SuggestedSellingPrice,
            TotalCost = profile.TotalCost,
            ProfitAmount = profile.ProfitAmount,
            ProfitPercentage = profile.ProfitPercentage,
            Margin = profile.Margin,
            Mrp = profile.Mrp,
            SellingPrice = profile.SellingPrice,
            ClosingFee = profile.ClosingFee,
            ShippingCharge = profile.ShippingCharge,
            PackagingCharge = profile.PackagingCharge,
            AdvertisementCost = profile.AdvertisementCost,
            MiscellaneousCharges = profile.MiscellaneousCharges,
            ExpectedSettlement = profile.ExpectedSettlement,
            NetProfit = profile.NetProfit,
            MarginPercentage = profile.MarginPercentage,
        };
    }

    private static StockMovementResponse ToResponse(string id, StockMovementDocument document, string? productName)
    {
        return new StockMovementResponse
        {
            Id = id,
            ProductId = document.ProductId,
            ProductName = productName,
            Color = document.Color,
            Size = document.Size,
            MovementType = document.MovementType,
            Quantity = document.Quantity,
            Delta = document.Delta,
            Reason = document.Reason,
            ReferenceType = document.ReferenceType,
            ReferenceId = document.ReferenceId,
            CreatedBy = document.CreatedBy,
            CreatedAt = document.CreatedAt,
        };
    }

    private async Task<PurchaseEntryResponse> ToResponseAsync(string id, PurchaseEntryDocument document, CancellationToken cancellationToken)
    {
        var itemDocs = await _purchaseItemRepository.GetByPurchaseEntryIdAsync(id, cancellationToken);
        var items = new List<PurchaseEntryItemResponse>();

        foreach (var (_, item) in itemDocs)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId, cancellationToken);
            items.Add(new PurchaseEntryItemResponse
            {
                ProductId = item.ProductId,
                ProductName = product?.Name,
                Color = item.Color,
                Size = item.Size,
                Quantity = item.Quantity,
                PurchasePrice = item.PurchasePrice,
                Discount = item.Discount,
                Gst = item.Gst,
                Tax = item.Tax,
                Total = item.Total,
            });
        }

        return new PurchaseEntryResponse
        {
            Id = id,
            Supplier = document.Supplier,
            SupplierId = document.SupplierId,
            InvoiceNumber = document.InvoiceNumber,
            InvoiceDate = document.InvoiceDate,
            PurchaseDate = document.PurchaseDate,
            Remarks = document.Remarks,
            Status = document.Status,
            Items = items,
            TotalAmount = items.Sum(i => i.Total),
            CreatedAt = document.CreatedAt,
            CreatedBy = document.CreatedBy,
            UpdatedAt = document.UpdatedAt,
            UpdatedBy = document.UpdatedBy,
        };
    }
}
