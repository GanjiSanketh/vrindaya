using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Revenues;

namespace Vrindaya.Api.Interfaces;

public interface IRevenueService
{
    Task<RevenueResponse> GetAsync(string id, CancellationToken cancellationToken);
    Task<PagedResult<RevenueResponse>> GetAllAsync(string? cursor, int pageSize, string? search, string? source, string? status, DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken);
    Task<RevenueResponse> CreateAsync(CreateRevenueRequest request, string createdBy, CancellationToken cancellationToken);
    Task<RevenueResponse> UpdateAsync(string id, UpdateRevenueRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(string id, CancellationToken cancellationToken);
    Task<RevenueSummaryResponse> GetMonthlySummaryAsync(int year, int? month, CancellationToken cancellationToken);
    Task<RevenueSummaryResponse> GetYearlySummaryAsync(int year, CancellationToken cancellationToken);
}
