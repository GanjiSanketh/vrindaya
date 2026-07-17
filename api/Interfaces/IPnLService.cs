using Vrindaya.Api.DTOs.ProfitLoss;

namespace Vrindaya.Api.Interfaces;

public interface IPnLService
{
    Task<PnLDashboardResponse> GetDashboardAsync(int year, int? month, CancellationToken cancellationToken);
}
