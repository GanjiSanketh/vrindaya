using Vrindaya.Api.DTOs.Settlement;

namespace Vrindaya.Api.Interfaces;

public interface ISettlementReconciliationService
{
    Task<SettlementReconciliationResponse> GetReconciliationAsync(string? source, string? type, int? year, int? month, CancellationToken cancellationToken);
}
