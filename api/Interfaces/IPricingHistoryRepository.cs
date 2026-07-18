using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IPricingHistoryRepository
{
    Task<PagedResult<(string Id, PricingHistoryDocument Data)>> GetByPricingIdAsync(
        string pricingId, string? cursor, int pageSize, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken);

    Task<string> CreateAsync(PricingHistoryDocument document, CancellationToken cancellationToken);
}
