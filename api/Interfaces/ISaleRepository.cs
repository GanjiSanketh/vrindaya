using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface ISaleRepository
{
    Task<List<(string Id, SaleDocument Data)>> GetAllAsync(CancellationToken ct = default);
    Task<SaleDocument?> GetByIdAsync(string saleId, CancellationToken ct = default);
    Task<string> CreateAsync(SaleDocument sale, CancellationToken ct = default);
    Task UpdateAsync(string saleId, SaleDocument sale, CancellationToken ct = default);
    Task DeleteAsync(string saleId, CancellationToken ct = default);
}
