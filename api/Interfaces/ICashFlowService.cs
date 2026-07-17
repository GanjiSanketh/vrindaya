using Vrindaya.Api.DTOs.CashFlow;

namespace Vrindaya.Api.Interfaces;

public interface ICashFlowService
{
    Task<CashFlowDashboardResponse> GetDashboardAsync(int year, int? month, CancellationToken cancellationToken);
}
