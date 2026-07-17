using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.InventoryManagement;

/// <summary>
/// Primitive inventory operations that every stock-affecting feature uses.
/// Every mutating method writes an append-only StockMovementDocument and
/// notifies on status changes — callers never create movements themselves.
///
/// See IInventoryCoreService's doc comment for the full Order module
/// integration guide.
/// </summary>
public class InventoryCoreService : IInventoryCoreService
{
    private readonly IInventoryVariantRepository _variantRepository;
    private readonly IStockMovementRepository _stockMovementRepository;
    private readonly IProductRepository _productRepository;
    private readonly IStockAlertNotificationService _notificationService;
    private readonly IFirebaseService _firebaseService;

    public InventoryCoreService(
        IInventoryVariantRepository variantRepository,
        IStockMovementRepository stockMovementRepository,
        IProductRepository productRepository,
        IStockAlertNotificationService notificationService,
        IFirebaseService firebaseService)
    {
        _variantRepository = variantRepository;
        _stockMovementRepository = stockMovementRepository;
        _productRepository = productRepository;
        _notificationService = notificationService;
        _firebaseService = firebaseService;
    }

    public async Task ReserveStockAsync(string variantId, long quantity, string referenceType, string referenceId, string createdBy, CancellationToken cancellationToken)
    {
        var variant = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        if (quantity <= 0)
            throw new RequestValidationException("Reservation quantity must be greater than zero.");

        var available = variant.CurrentStock - variant.ReservedStock;
        if (available < quantity)
            throw new RequestValidationException($"Insufficient available stock. Requested {quantity}, available {available}.");

        var oldStatus = ComputeVariantStatus(variant);

        variant.ReservedStock += quantity;
        variant.UpdatedAt = DateTime.UtcNow;

        await _variantRepository.UpsertAsync(variantId, variant, cancellationToken);
        await NotifyIfStatusChangedAsync(variantId, variant, oldStatus, cancellationToken);

        // Persist the reservation record
        var db = _firebaseService.GetFirestoreDb();
        var reservationDoc = new OrderReservationDocument
        {
            VariantId = variantId,
            Quantity = quantity,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            Status = OrderReservationStatus.Active,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
        };
        await db.Collection("orderReservations").AddAsync(reservationDoc, cancellationToken);

        // Movement
        var product = await _productRepository.GetByIdAsync(variant.ProductId, cancellationToken);
        await _stockMovementRepository.CreateAsync(new StockMovementDocument
        {
            ProductId = variant.ProductId,
            Color = variant.Color,
            Size = variant.Size,
            MovementType = StockMovementType.Reservation,
            Quantity = quantity,
            Delta = 0,
            Reason = $"Reserved for {referenceType} {referenceId}",
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            SearchKeywords = BuildSearchKeywords(product?.Name, variant.Sku, variant.Color, variant.Size, StockMovementType.Reservation, $"Reserved for {referenceType} {referenceId}"),
        }, cancellationToken);
    }

    public async Task ReleaseReservedStockAsync(string variantId, string referenceType, string referenceId, string updatedBy, CancellationToken cancellationToken)
    {
        var variant = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        // Find the active reservation
        var reservationTuple = await FindActiveReservationAsync(variantId, referenceType, referenceId, cancellationToken);
        if (reservationTuple == null)
            throw new RequestValidationException($"No active reservation found for variant '{variantId}', reference '{referenceType}/{referenceId}'.");

        var (reservationId, reservationData) = reservationTuple.Value;
        var oldStatus = ComputeVariantStatus(variant);

        variant.ReservedStock = Math.Max(0, variant.ReservedStock - reservationData.Quantity);
        variant.UpdatedAt = DateTime.UtcNow;

        await _variantRepository.UpsertAsync(variantId, variant, cancellationToken);
        await NotifyIfStatusChangedAsync(variantId, variant, oldStatus, cancellationToken);

        // Update reservation status
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection("orderReservations").Document(reservationId).UpdateAsync(new Dictionary<string, object>
        {
            { "status", OrderReservationStatus.Cancelled },
            { "cancelledAt", DateTime.UtcNow },
        }, cancellationToken: cancellationToken);

        // Movement
        var product = await _productRepository.GetByIdAsync(variant.ProductId, cancellationToken);
        await _stockMovementRepository.CreateAsync(new StockMovementDocument
        {
            ProductId = variant.ProductId,
            Color = variant.Color,
            Size = variant.Size,
            MovementType = StockMovementType.ReservationRelease,
            Quantity = reservationData.Quantity,
            Delta = 0,
            Reason = $"Reservation released for {referenceType} {referenceId}",
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            CreatedBy = updatedBy,
            CreatedAt = DateTime.UtcNow,
            SearchKeywords = BuildSearchKeywords(product?.Name, variant.Sku, variant.Color, variant.Size, StockMovementType.ReservationRelease, $"Reservation released for {referenceType} {referenceId}"),
        }, cancellationToken);
    }

    public async Task DecreaseStockAsync(string variantId, long quantity, string referenceType, string referenceId, string createdBy, CancellationToken cancellationToken)
    {
        var variant = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        if (quantity <= 0)
            throw new RequestValidationException("Decrease quantity must be greater than zero.");

        if (variant.CurrentStock < quantity)
            throw new RequestValidationException($"Insufficient stock. Requested {quantity}, available {variant.CurrentStock}.");

        var oldStatus = ComputeVariantStatus(variant);

        variant.CurrentStock -= quantity;

        // Release any matching active reservation
        var reservationTuple = await FindActiveReservationAsync(variantId, referenceType, referenceId, cancellationToken);
        if (reservationTuple != null)
        {
            var (reservationId, reservationData) = reservationTuple.Value;
            var releaseQty = Math.Min(reservationData.Quantity, quantity);
            variant.ReservedStock = Math.Max(0, variant.ReservedStock - releaseQty);

            var db = _firebaseService.GetFirestoreDb();
            await db.Collection("orderReservations").Document(reservationId).UpdateAsync(new Dictionary<string, object>
            {
                { "status", OrderReservationStatus.Fulfilled },
                { "fulfilledAt", DateTime.UtcNow },
            }, cancellationToken: cancellationToken);
        }

        variant.UpdatedAt = DateTime.UtcNow;
        await _variantRepository.UpsertAsync(variantId, variant, cancellationToken);
        await NotifyIfStatusChangedAsync(variantId, variant, oldStatus, cancellationToken);

        // Movement
        var product = await _productRepository.GetByIdAsync(variant.ProductId, cancellationToken);
        var reason = referenceType != null ? $"{referenceType} {referenceId}" : "Manual decrease";
        await _stockMovementRepository.CreateAsync(new StockMovementDocument
        {
            ProductId = variant.ProductId,
            Color = variant.Color,
            Size = variant.Size,
            MovementType = StockMovementType.Sale,
            Quantity = quantity,
            Delta = -quantity,
            Reason = reason,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            SearchKeywords = BuildSearchKeywords(product?.Name, variant.Sku, variant.Color, variant.Size, StockMovementType.Sale, reason),
        }, cancellationToken);
    }

    public async Task IncreaseReturnedStockAsync(string variantId, long quantity, string referenceType, string referenceId, string createdBy, CancellationToken cancellationToken)
    {
        var variant = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        if (quantity <= 0)
            throw new RequestValidationException("Return quantity must be greater than zero.");

        var oldStatus = ComputeVariantStatus(variant);

        variant.CurrentStock += quantity;
        variant.ReturnedStock += quantity;
        variant.UpdatedAt = DateTime.UtcNow;

        await _variantRepository.UpsertAsync(variantId, variant, cancellationToken);
        await NotifyIfStatusChangedAsync(variantId, variant, oldStatus, cancellationToken);

        // Movement
        var product = await _productRepository.GetByIdAsync(variant.ProductId, cancellationToken);
        var reason = referenceType != null ? $"Return for {referenceType} {referenceId}" : "Manual return";
        await _stockMovementRepository.CreateAsync(new StockMovementDocument
        {
            ProductId = variant.ProductId,
            Color = variant.Color,
            Size = variant.Size,
            MovementType = StockMovementType.Return,
            Quantity = quantity,
            Delta = quantity,
            Reason = reason,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            SearchKeywords = BuildSearchKeywords(product?.Name, variant.Sku, variant.Color, variant.Size, StockMovementType.Return, reason),
        }, cancellationToken);
    }

    public async Task AdjustStockAsync(string variantId, long delta, string reason, string createdBy, CancellationToken cancellationToken)
    {
        var variant = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        if (delta == 0)
            throw new RequestValidationException("Adjustment delta must be non-zero.");

        var oldStatus = ComputeVariantStatus(variant);

        variant.CurrentStock = Math.Max(0, variant.CurrentStock + delta);
        variant.UpdatedAt = DateTime.UtcNow;

        await _variantRepository.UpsertAsync(variantId, variant, cancellationToken);
        await NotifyIfStatusChangedAsync(variantId, variant, oldStatus, cancellationToken);

        // Movement
        var product = await _productRepository.GetByIdAsync(variant.ProductId, cancellationToken);
        await _stockMovementRepository.CreateAsync(new StockMovementDocument
        {
            ProductId = variant.ProductId,
            Color = variant.Color,
            Size = variant.Size,
            MovementType = StockMovementType.ManualAdjustment,
            Quantity = Math.Abs(delta),
            Delta = delta,
            Reason = reason,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            SearchKeywords = BuildSearchKeywords(product?.Name, variant.Sku, variant.Color, variant.Size, StockMovementType.ManualAdjustment, reason),
        }, cancellationToken);
    }

    public async Task<long> GetAvailableStockAsync(string variantId, CancellationToken cancellationToken)
    {
        var variant = await _variantRepository.GetByIdAsync(variantId, cancellationToken)
            ?? throw new NotFoundException("Inventory variant", variantId);

        return variant.CurrentStock - variant.ReservedStock;
    }

    // ── Private helpers ─────────────────────────────────────────────────

    private async Task<(string Id, OrderReservationDocument Data)?> FindActiveReservationAsync(
        string variantId, string referenceType, string referenceId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection("orderReservations")
            .WhereEqualTo("variantId", variantId)
            .WhereEqualTo("referenceType", referenceType)
            .WhereEqualTo("referenceId", referenceId)
            .WhereEqualTo("status", OrderReservationStatus.Active)
            .Limit(1)
            .GetSnapshotAsync(cancellationToken);

        var doc = snapshot.Documents.FirstOrDefault();
        return doc != null ? (doc.Id, doc.ConvertTo<OrderReservationDocument>()) : null;
    }

    private static string ComputeVariantStatus(InventoryVariantDocument document)
    {
        var available = document.CurrentStock - document.ReservedStock;
        if (available <= 0) return InventoryStatus.OutOfStock;
        var criticalThreshold = document.CriticalStockThreshold ?? Math.Min(document.LowStockThreshold, 2);
        if (available <= criticalThreshold) return InventoryStatus.Critical;
        return available <= document.LowStockThreshold ? InventoryStatus.Low : InventoryStatus.Healthy;
    }

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
                document.CriticalStockThreshold ?? Math.Min(document.LowStockThreshold, 2),
                newStatus, cancellationToken);
        }
        else if (oldStatus != InventoryStatus.Healthy)
        {
            await _notificationService.NotifyStockRestoredAsync(
                variantId, document.ProductId, product?.Name,
                document.Color, document.Size,
                document.CurrentStock, cancellationToken);
        }
    }

    private static List<string> BuildSearchKeywords(string? productName, string? sku, string? color, string? size, string movementType, string? reason)
    {
        var text = string.Join(' ', new[] { productName, sku, color, size, movementType, reason }.Where(s => !string.IsNullOrWhiteSpace(s)));
        return SearchTokenizer.Tokenize(text);
    }
}
