using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.Interfaces;

public interface IInventoryService
{
    Task<List<InventoryProductResponse>> GetInventoryAsync(CancellationToken ct = default);
    Task UpdateStockAsync(List<StockUpdateItem> updates, CancellationToken ct = default);
}
