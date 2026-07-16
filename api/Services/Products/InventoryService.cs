using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Inventory;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class InventoryService : IInventoryService
{
    private readonly IProductRepository _repository;

    public InventoryService(IProductRepository repository)
    {
        _repository = repository;
    }

    public async Task<long> UpdateStockAsync(string productId, List<ProductSizeDocument> sizes, string updatedBy, CancellationToken cancellationToken)
    {
        _ = await _repository.GetByIdAsync(productId, cancellationToken)
            ?? throw new ProductNotFoundException(productId);

        var total = sizes.Sum(s => s.Stock);

        await _repository.UpdateAsync(productId, new Dictionary<string, object?>
        {
            ["sizes"] = sizes,
            ["stock"] = total,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);

        return total;
    }

    public async Task<InventoryDetailResponse> GetInventoryAsync(string productId, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(productId, cancellationToken)
            ?? throw new ProductNotFoundException(productId);

        return ToDetail(productId, doc);
    }

    public async Task<InventoryDetailResponse> UpdateInventoryAsync(string productId, UpdateInventoryRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        _ = await _repository.GetByIdAsync(productId, cancellationToken)
            ?? throw new ProductNotFoundException(productId);

        var sizes = request.Sizes.Select(s => new ProductSizeDocument { Size = s.Size, Stock = s.Stock }).ToList();
        var total = sizes.Sum(s => s.Stock);
        var now = DateTime.UtcNow;

        var updates = new Dictionary<string, object?>
        {
            ["sizes"] = sizes,
            ["stock"] = total,
            ["lowStockThreshold"] = request.LowStockThreshold.HasValue ? request.LowStockThreshold.Value : Google.Cloud.Firestore.FieldValue.Delete,
            ["autoHideWhenOutOfStock"] = request.AutoHideWhenOutOfStock,
            ["stockUpdatedAt"] = now,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = now,
        };

        // Automation: auto-hide when stock reaches zero, if the admin opted in.
        if (request.AutoHideWhenOutOfStock && total <= 0)
        {
            updates["active"] = false;
        }

        await _repository.UpdateAsync(productId, updates, cancellationToken);

        var updated = await _repository.GetByIdAsync(productId, cancellationToken)
            ?? throw new ProductNotFoundException(productId);

        return ToDetail(productId, updated);
    }

    private static InventoryDetailResponse ToDetail(string id, ProductDocument doc)
    {
        var isOutOfStock = doc.Stock <= 0;
        var isLowStock = !isOutOfStock && doc.LowStockThreshold.HasValue && doc.Stock <= doc.LowStockThreshold.Value;

        return new InventoryDetailResponse
        {
            ProductId = id,
            Sizes = doc.Sizes.Select(s => new ProductSizeDto { Size = s.Size, Stock = s.Stock }).ToList(),
            AvailableSizes = doc.Sizes.Where(s => s.Stock > 0).Select(s => new ProductSizeDto { Size = s.Size, Stock = s.Stock }).ToList(),
            Stock = doc.Stock,
            ReservedStock = doc.ReservedStock,
            LowStockThreshold = doc.LowStockThreshold,
            IsOutOfStock = isOutOfStock,
            IsLowStock = isLowStock,
            AutoHideWhenOutOfStock = doc.AutoHideWhenOutOfStock,
            StockUpdatedAt = doc.StockUpdatedAt,
        };
    }
}
