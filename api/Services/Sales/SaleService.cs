using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Sales;

public class SaleService : ISaleService
{
    private readonly ISaleRepository _saleRepo;
    private readonly IProductRepository _productRepo;
    private readonly IProductVariantRepository _variantRepo;
    private readonly ILogger<SaleService> _logger;

    public SaleService(
        ISaleRepository saleRepo,
        IProductRepository productRepo,
        IProductVariantRepository variantRepo,
        ILogger<SaleService> logger)
    {
        _saleRepo = saleRepo;
        _productRepo = productRepo;
        _variantRepo = variantRepo;
        _logger = logger;
    }

    public async Task<List<SaleDto>> GetAllAsync(CancellationToken ct = default)
    {
        var sales = await _saleRepo.GetAllAsync(ct);
        return sales.Select(s => ToDto(s.Id, s.Data)).ToList();
    }

    public async Task<SaleDto?> GetByIdAsync(string saleId, CancellationToken ct = default)
    {
        var sale = await _saleRepo.GetByIdAsync(saleId, ct);
        return sale == null ? null : ToDto(saleId, sale);
    }

    public async Task<SaleDto> CreateAsync(CreateSaleRequest request, CancellationToken ct = default)
    {
        var variant = await _variantRepo.GetVariantAsync(request.VariantId, ct)
            ?? throw new InvalidOperationException("Variant not found");

        var sizeEntry = variant.Sizes.FirstOrDefault(s =>
            s.Size.Equals(request.Size, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Size '{request.Size}' not found for this variant");

        if (sizeEntry.Stock < request.Quantity)
            throw new InvalidOperationException($"Insufficient stock. Available: {sizeEntry.Stock}, Requested: {request.Quantity}");

        var products = await _productRepo.GetAllUnpagedAsync(ct);
        var productEntry = products.FirstOrDefault(p => p.Id == request.ProductId);
        var productDoc = productEntry.Data;
        if (productDoc == null)
            throw new InvalidOperationException("Product not found");

        var purchaseCost = variant.PurchaseCost ?? 0;
        var packagingCost = variant.PackagingCost ?? 0;
        var totalCostPerUnit = purchaseCost + packagingCost + request.ShippingCharges + request.MarketingCost + request.OtherCharges;
        var totalCost = totalCostPerUnit * request.Quantity;
        var amountReceived = (request.SellingPrice - request.FlipkartCommission) * request.Quantity;
        var profit = amountReceived - totalCost;

        var saleDoc = new SaleDocument
        {
            ProductId = request.ProductId,
            ProductName = productDoc.Name,
            ProductImage = variant.Images?.Primary?.Url ?? productDoc.ThumbnailUrl,
            VariantId = request.VariantId,
            ColourName = variant.ColourName,
            Category = productDoc.Category,
            Size = request.Size,
            Quantity = request.Quantity,
            SaleChannel = request.SaleChannel,
            SellingPrice = request.SellingPrice,
            PurchaseCost = purchaseCost,
            PackagingCost = packagingCost,
            FlipkartCommission = request.FlipkartCommission,
            ShippingCharges = request.ShippingCharges,
            MarketingCost = request.MarketingCost,
            OtherCharges = request.OtherCharges,
            TotalCost = Math.Round(totalCost, 2),
            AmountReceived = Math.Round(amountReceived, 2),
            Profit = Math.Round(profit, 2),
            PaymentMethod = request.PaymentMethod,
            CustomerName = request.CustomerName,
            CustomerPhone = request.CustomerPhone,
            InvoiceNumber = request.InvoiceNumber,
            Notes = request.Notes,
            SoldAt = request.SoldAt ?? DateTime.UtcNow,
        };

        sizeEntry.Stock -= request.Quantity;
        variant.UpdatedAt = DateTime.UtcNow;
        await _variantRepo.UpdateVariantAsync(request.VariantId, variant, ct);

        var saleId = await _saleRepo.CreateAsync(saleDoc, ct);

        await SyncProductDenormalizedFields(request.ProductId, ct);

        return ToDto(saleId, saleDoc);
    }

    public async Task<SaleDto?> UpdateAsync(string saleId, CreateSaleRequest request, CancellationToken ct = default)
    {
        var existing = await _saleRepo.GetByIdAsync(saleId, ct);
        if (existing == null) return null;

        var variant = await _variantRepo.GetVariantAsync(request.VariantId, ct)
            ?? throw new InvalidOperationException("Variant not found");

        var products = await _productRepo.GetAllUnpagedAsync(ct);
        var productDoc = products.FirstOrDefault(p => p.Id == request.ProductId).Data;
        if (productDoc == null) throw new InvalidOperationException("Product not found");

        var purchaseCost = variant.PurchaseCost ?? 0;
        var packagingCost = variant.PackagingCost ?? 0;
        var totalCostPerUnit = purchaseCost + packagingCost + request.ShippingCharges + request.MarketingCost + request.OtherCharges;
        var totalCost = totalCostPerUnit * request.Quantity;
        var amountReceived = (request.SellingPrice - request.FlipkartCommission) * request.Quantity;
        var profit = amountReceived - totalCost;

        existing.ProductId = request.ProductId;
        existing.ProductName = productDoc.Name;
        existing.ProductImage = variant.Images?.Primary?.Url ?? productDoc.ThumbnailUrl;
        existing.VariantId = request.VariantId;
        existing.ColourName = variant.ColourName;
        existing.Category = productDoc.Category;
        existing.Size = request.Size;
        existing.Quantity = request.Quantity;
        existing.SaleChannel = request.SaleChannel;
        existing.SellingPrice = request.SellingPrice;
        existing.PurchaseCost = purchaseCost;
        existing.PackagingCost = packagingCost;
        existing.FlipkartCommission = request.FlipkartCommission;
        existing.ShippingCharges = request.ShippingCharges;
        existing.MarketingCost = request.MarketingCost;
        existing.OtherCharges = request.OtherCharges;
        existing.TotalCost = Math.Round(totalCost, 2);
        existing.AmountReceived = Math.Round(amountReceived, 2);
        existing.Profit = Math.Round(profit, 2);
        existing.PaymentMethod = request.PaymentMethod;
        existing.CustomerName = request.CustomerName;
        existing.CustomerPhone = request.CustomerPhone;
        existing.InvoiceNumber = request.InvoiceNumber;
        existing.Notes = request.Notes;
        existing.SoldAt = request.SoldAt ?? existing.SoldAt;

        await _saleRepo.UpdateAsync(saleId, existing, ct);
        return ToDto(saleId, existing);
    }

    public async Task DeleteAsync(string saleId, CancellationToken ct = default)
    {
        await _saleRepo.DeleteAsync(saleId, ct);
    }

    private async Task SyncProductDenormalizedFields(string productId, CancellationToken ct)
    {
        var variants = await _variantRepo.GetVariantsAsync(productId, ct);
        long totalStock = 0;
        foreach (var (_, v) in variants)
        {
            if (!v.IsActive) continue;
            totalStock += v.Sizes.Sum(s => s.Stock);
        }
        await _productRepo.UpdateAsync(productId, new Dictionary<string, object?>
        {
            ["totalStock"] = totalStock,
        }, ct);
    }

    private static SaleDto ToDto(string id, SaleDocument d) => new()
    {
        Id = id,
        ProductId = d.ProductId,
        ProductName = d.ProductName,
        ProductImage = d.ProductImage,
        VariantId = d.VariantId,
        ColourName = d.ColourName,
        Category = d.Category,
        Size = d.Size,
        Quantity = d.Quantity,
        SaleChannel = d.SaleChannel,
        SellingPrice = d.SellingPrice,
        PurchaseCost = d.PurchaseCost,
        PackagingCost = d.PackagingCost,
        FlipkartCommission = d.FlipkartCommission,
        ShippingCharges = d.ShippingCharges,
        MarketingCost = d.MarketingCost,
        OtherCharges = d.OtherCharges,
        TotalCost = d.TotalCost,
        AmountReceived = d.AmountReceived,
        Profit = d.Profit,
        PaymentMethod = d.PaymentMethod,
        CustomerName = d.CustomerName,
        CustomerPhone = d.CustomerPhone,
        InvoiceNumber = d.InvoiceNumber,
        Notes = d.Notes,
        SoldAt = d.SoldAt,
        CreatedAt = d.CreatedAt,
    };
}
