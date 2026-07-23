using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.Interfaces;

public interface IPricingService
{
    Task<PricingDashboardResponse> GetDashboardAsync(CancellationToken ct = default);
}
