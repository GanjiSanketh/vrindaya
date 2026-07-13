using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs;
using Vrindaya.Api.Helpers;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

public class HealthService : IHealthService
{
    private readonly IWebHostEnvironment _environment;
    private readonly IDateTimeProvider _dateTimeProvider;

    public HealthService(IWebHostEnvironment environment, IDateTimeProvider dateTimeProvider)
    {
        _environment = environment;
        _dateTimeProvider = dateTimeProvider;
    }

    public HealthStatusDto GetHealthStatus()
    {
        return new HealthStatusDto
        {
            Status = "Healthy",
            Application = AppConstants.ApplicationName,
            Version = AppConstants.ApplicationVersion,
            Environment = _environment.EnvironmentName,
            ServerTime = _dateTimeProvider.UtcNow,
        };
    }
}
