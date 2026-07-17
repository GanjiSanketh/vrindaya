using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Expenses;

namespace Vrindaya.Api.Interfaces;

public interface IExpenseService
{
    Task<ExpenseResponse> GetAsync(string id, CancellationToken cancellationToken);
    Task<PagedResult<ExpenseResponse>> GetAllAsync(string? cursor, int pageSize, string? search, string? category, DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken);
    Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request, string createdBy, CancellationToken cancellationToken);
    Task<ExpenseResponse> UpdateAsync(string id, UpdateExpenseRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(string id, CancellationToken cancellationToken);
    Task<ExpenseSummaryResponse> GetMonthlySummaryAsync(int year, int? month, CancellationToken cancellationToken);
    Task<ExpenseSummaryResponse> GetYearlySummaryAsync(int year, CancellationToken cancellationToken);
}
