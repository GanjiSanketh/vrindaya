using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.Interfaces;

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default);
}
