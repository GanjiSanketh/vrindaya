using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.Interfaces;

public interface ISaleService
{
    Task<List<SaleDto>> GetAllAsync(CancellationToken ct = default);
    Task<SaleDto?> GetByIdAsync(string saleId, CancellationToken ct = default);
    Task<SaleDto> CreateAsync(CreateSaleRequest request, CancellationToken ct = default);
    Task<SaleDto?> UpdateAsync(string saleId, CreateSaleRequest request, CancellationToken ct = default);
    Task DeleteAsync(string saleId, CancellationToken ct = default);
}
