namespace Vrindaya.Api.DTOs;

/// <summary>
/// Response shape for GET /api/v1/health.
/// </summary>
public class HealthStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string Application { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public DateTime ServerTime { get; set; }
}
