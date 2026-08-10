using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface ISaleRepository
{
    Task<List<(string Id, SaleDocument Data)>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Field-projected read of the whole sales collection carrying only the
    /// fields the dashboard/BI aggregation needs (amounts, profit, channel,
    /// category, dates, product ref) — a smaller Firestore payload than the
    /// full-document <see cref="GetAllAsync"/>. Ordered by soldAt descending to
    /// match the full read.
    /// </summary>
    Task<List<(string Id, SaleDocument Data)>> GetDashboardSalesAsync(CancellationToken ct = default);
    Task<SaleDocument?> GetByIdAsync(string saleId, CancellationToken ct = default);
    Task<string> CreateAsync(SaleDocument sale, CancellationToken ct = default);
    Task UpdateAsync(string saleId, SaleDocument sale, CancellationToken ct = default);
    Task DeleteAsync(string saleId, CancellationToken ct = default);
}
