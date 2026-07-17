using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IRevenueRepository
{
    Task<RevenueDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<PagedResult<(string Id, RevenueDocument Data)>> GetAllAsync(string? cursor, int pageSize, string? search, string? source, string? status, DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken);
    Task<string> CreateAsync(RevenueDocument document, CancellationToken cancellationToken);
    Task UpdateAsync(string id, RevenueDocument document, CancellationToken cancellationToken);
    Task DeleteAsync(string id, CancellationToken cancellationToken);
    Task<List<(string Id, RevenueDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);
    Task<string> GenerateNextRevenueNumberAsync(CancellationToken cancellationToken);
}
