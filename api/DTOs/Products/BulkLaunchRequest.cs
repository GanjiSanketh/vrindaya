using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

/// <summary>"Bulk Launch" — sets LifecycleStage=ListedOnFlipkart and LaunchDate on every id in one write.</summary>
public class BulkLaunchRequest
{
    [Required, MinLength(1)]
    public List<string> Ids { get; set; } = [];

    /// <summary>Optional — server defaults to DateTime.UtcNow when omitted, but an admin can back-date a launch.</summary>
    public DateTime? LaunchDate { get; set; }
}
