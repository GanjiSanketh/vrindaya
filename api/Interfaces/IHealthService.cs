using Vrindaya.Api.DTOs;

namespace Vrindaya.Api.Interfaces;

public interface IHealthService
{
    HealthStatusDto GetHealthStatus();
}
