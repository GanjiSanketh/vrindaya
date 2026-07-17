using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Profitability;

namespace Vrindaya.Api.Interfaces;

public interface IProfitabilityService
{
    Task<PagedResult<ProductProfitabilityResponse>> GetProfitabilityAsync(ProfitabilityQuery query, CancellationToken cancellationToken);
}
