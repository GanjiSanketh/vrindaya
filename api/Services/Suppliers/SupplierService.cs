using Microsoft.AspNetCore.Http;
using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.InventoryManagement;
using Vrindaya.Api.DTOs.Suppliers;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;
using System.Security.Claims;

namespace Vrindaya.Api.Services.Suppliers;

public class SupplierService : ISupplierService
{
    private readonly ISupplierRepository _supplierRepository;
    private readonly IPurchaseEntryRepository _purchaseEntryRepository;
    private readonly IPurchaseItemRepository _purchaseItemRepository;
    private readonly IProductRepository _productRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SupplierService(
        ISupplierRepository supplierRepository,
        IPurchaseEntryRepository purchaseEntryRepository,
        IPurchaseItemRepository purchaseItemRepository,
        IProductRepository productRepository,
        IAuditLogService auditLogService,
        IHttpContextAccessor httpContextAccessor)
    {
        _supplierRepository = supplierRepository;
        _purchaseEntryRepository = purchaseEntryRepository;
        _purchaseItemRepository = purchaseItemRepository;
        _productRepository = productRepository;
        _auditLogService = auditLogService;
        _httpContextAccessor = httpContextAccessor;
    }

    private string? GetCurrentUserEmail() =>
        _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email)
        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("email");

    public async Task<SupplierResponse> GetAsync(string id, CancellationToken cancellationToken)
    {
        var document = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier", id);
        return ToResponse(id, document);
    }

    public async Task<PagedResult<SupplierResponse>> GetAllAsync(
        string? cursor, int pageSize, string? search, bool? activeOnly, string sortBy, bool sortDescending, CancellationToken cancellationToken)
    {
        var page = await _supplierRepository.GetAllAsync(cursor, pageSize, search, activeOnly, sortBy, sortDescending, cancellationToken);
        return new PagedResult<SupplierResponse>
        {
            Items = page.Items.Select(x => ToResponse(x.Id, x.Data)).ToList(),
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    public async Task<SupplierResponse> CreateAsync(CreateSupplierRequest request, CancellationToken cancellationToken)
    {
        await EnsureUniqueGstinAsync(request.Gstin, null, cancellationToken);

        var supplierCode = await _supplierRepository.GenerateNextSupplierCodeAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var document = BuildDocument(request, supplierCode, isActive: true, createdAt: now, updatedAt: now);
        var id = await _supplierRepository.CreateAsync(document, cancellationToken);

        try { await _auditLogService.LogCreateAsync("Suppliers", id, document.CompanyName, AuditLogService.SerializeJson(document), GetCurrentUserEmail(), null, null, $"Supplier '{document.CompanyName}' created"); } catch { }
        return ToResponse(id, document);
    }

    public async Task<SupplierResponse> UpdateAsync(string id, UpdateSupplierRequest request, CancellationToken cancellationToken)
    {
        var existing = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier", id);

        var beforeData = AuditLogService.SerializeJson(existing);

        await EnsureUniqueGstinAsync(request.Gstin, id, cancellationToken);

        var document = BuildDocument(request, existing.SupplierCode, existing.IsActive, existing.CreatedAt, DateTime.UtcNow);
        await _supplierRepository.UpdateAsync(id, document, cancellationToken);

        try { await _auditLogService.LogUpdateAsync("Suppliers", id, document.CompanyName, beforeData, AuditLogService.SerializeJson(document), GetCurrentUserEmail(), null, null, $"Supplier '{document.CompanyName}' updated"); } catch { }
        return ToResponse(id, document);
    }

    public async Task<SupplierResponse> ActivateAsync(string id, CancellationToken cancellationToken)
    {
        var existing = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier", id);

        var beforeData = AuditLogService.SerializeJson(existing);

        existing.IsActive = true;
        existing.UpdatedAt = DateTime.UtcNow;
        await _supplierRepository.UpdateAsync(id, existing, cancellationToken);
        try { await _auditLogService.LogUpdateAsync("Suppliers", id, existing.CompanyName, beforeData, AuditLogService.SerializeJson(existing), GetCurrentUserEmail(), null, null, $"Supplier '{existing.CompanyName}' activated"); } catch { }
        return ToResponse(id, existing);
    }

    public async Task<SupplierResponse> DeactivateAsync(string id, CancellationToken cancellationToken)
    {
        var existing = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier", id);

        var beforeData = AuditLogService.SerializeJson(existing);

        existing.IsActive = false;
        existing.UpdatedAt = DateTime.UtcNow;
        await _supplierRepository.UpdateAsync(id, existing, cancellationToken);
        try { await _auditLogService.LogUpdateAsync("Suppliers", id, existing.CompanyName, beforeData, AuditLogService.SerializeJson(existing), GetCurrentUserEmail(), null, null, $"Supplier '{existing.CompanyName}' deactivated"); } catch { }
        return ToResponse(id, existing);
    }

    public async Task<SupplierStatsResponse> GetStatsAsync(string id, CancellationToken cancellationToken)
    {
        _ = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier", id);

        // Confirmed only — Draft/Cancelled purchases haven't (or no longer)
        // actually affected inventory, so they shouldn't inflate a
        // supplier's purchase statistics either.
        var entries = (await _purchaseEntryRepository.GetAllBySupplierIdUnpagedAsync(id, cancellationToken))
            .Where(e => e.Data.Status == PurchaseStatus.Confirmed)
            .ToList();
        var items = (await _purchaseItemRepository.GetBySupplierIdAsync(id, cancellationToken))
            .Where(i => i.Status == PurchaseStatus.Confirmed)
            .ToList();

        var totalAmount = items.Sum(i => i.Total);
        var distinctProducts = items.Select(i => i.ProductId).Distinct().Count();
        var lastPurchaseDate = entries.Count > 0 ? entries.Max(e => e.Data.PurchaseDate) : (DateTime?)null;

        return new SupplierStatsResponse
        {
            TotalPurchases = entries.Count,
            TotalAmountPurchased = totalAmount,
            ProductsPurchased = distinctProducts,
            LastPurchaseDate = lastPurchaseDate,
        };
    }

    public async Task<PagedResult<PurchaseEntryResponse>> GetPurchaseHistoryAsync(string id, string? cursor, int pageSize, CancellationToken cancellationToken)
    {
        _ = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier", id);

        var page = await _purchaseEntryRepository.GetBySupplierIdAsync(id, cursor, pageSize, cancellationToken);
        var items = new List<PurchaseEntryResponse>();

        foreach (var (entryId, data) in page.Items)
        {
            items.Add(await ToPurchaseEntryResponseAsync(entryId, data, cancellationToken));
        }

        return new PagedResult<PurchaseEntryResponse>
        {
            Items = items,
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private async Task EnsureUniqueGstinAsync(string? gstin, string? excludeId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(gstin)) return;

        if (await _supplierRepository.ExistsByGstinAsync(gstin, excludeId, cancellationToken))
        {
            throw new ConflictException($"A supplier with GSTIN '{gstin}' already exists.");
        }
    }

    private static SupplierDocument BuildDocument(CreateSupplierRequest request, string supplierCode, bool isActive, DateTime createdAt, DateTime updatedAt)
    {
        var document = new SupplierDocument
        {
            SupplierCode = supplierCode,
            CompanyName = request.CompanyName,
            ContactPerson = request.ContactPerson,
            Phone = request.Phone,
            AlternatePhone = request.AlternatePhone,
            Email = request.Email,
            Gstin = request.Gstin,
            Pan = request.Pan,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Country = request.Country,
            Pincode = request.Pincode,
            BankDetails = request.BankDetails,
            PaymentTerms = request.PaymentTerms,
            Notes = request.Notes,
            IsActive = isActive,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
        };

        document.SearchKeywords = BuildSearchKeywords(document);
        return document;
    }

    private static List<string> BuildSearchKeywords(SupplierDocument document)
    {
        var raw = new[] { document.CompanyName, document.ContactPerson, document.Phone, document.Email, document.Gstin, document.SupplierCode };
        return raw
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .SelectMany(v => v!.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Distinct()
            .ToList();
    }

    private static SupplierResponse ToResponse(string id, SupplierDocument document)
    {
        return new SupplierResponse
        {
            Id = id,
            SupplierCode = document.SupplierCode,
            CompanyName = document.CompanyName,
            ContactPerson = document.ContactPerson,
            Phone = document.Phone,
            AlternatePhone = document.AlternatePhone,
            Email = document.Email,
            Gstin = document.Gstin,
            Pan = document.Pan,
            Address = document.Address,
            City = document.City,
            State = document.State,
            Country = document.Country,
            Pincode = document.Pincode,
            BankDetails = document.BankDetails,
            PaymentTerms = document.PaymentTerms,
            Notes = document.Notes,
            IsActive = document.IsActive,
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt,
        };
    }

    /// <summary>Mirrors InventoryManagementService's own private mapper of the same shape — duplicated rather than shared, since the two services own different aggregate roots (Supplier vs. Inventory) despite both reading purchaseEntries/purchaseItems, matching this codebase's "no shared generic mapper" convention.</summary>
    private async Task<PurchaseEntryResponse> ToPurchaseEntryResponseAsync(string id, PurchaseEntryDocument document, CancellationToken cancellationToken)
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
