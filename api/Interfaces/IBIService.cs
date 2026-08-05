using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.Interfaces;

public interface IBIService
{
    Task<BIDashboardDto> GetBIDashboardAsync(CancellationToken ct = default);
}