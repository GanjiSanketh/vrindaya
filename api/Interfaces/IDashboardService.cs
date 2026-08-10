using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Services.Products;

namespace Vrindaya.Api.Interfaces;

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the cached (or freshly computed) dashboard plus the raw
    /// product/variant/sale datasets it was built from, so callers that also
    /// need those datasets reuse the same Firestore load within the request.
    /// </summary>
    Task<DashboardSnapshot> GetDashboardSnapshotAsync(CancellationToken cancellationToken = default);
}
