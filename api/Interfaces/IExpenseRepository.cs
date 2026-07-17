using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IExpenseRepository
{
    Task<ExpenseDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<PagedResult<(string Id, ExpenseDocument Data)>> GetAllAsync(string? cursor, int pageSize, string? search, string? category, DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken);
    Task<string> CreateAsync(ExpenseDocument document, CancellationToken cancellationToken);
    Task UpdateAsync(string id, ExpenseDocument document, CancellationToken cancellationToken);
    Task DeleteAsync(string id, CancellationToken cancellationToken);
    Task<List<(string Id, ExpenseDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);
    Task<string> GenerateNextExpenseNumberAsync(CancellationToken cancellationToken);
}
