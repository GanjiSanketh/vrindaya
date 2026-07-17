using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Forecasting;

namespace Vrindaya.Api.Interfaces;

public interface IInventoryForecastService
{
    Task<PagedResult<InventoryForecastResponse>> GetForecastAsync(ForecastQuery query, CancellationToken cancellationToken);
}
