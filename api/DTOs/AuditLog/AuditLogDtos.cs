using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.AuditLog;

public class AuditLogResponse
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? EntityName { get; set; }
    public string? BeforeData { get; set; }
    public string? AfterData { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? PerformedByEmail { get; set; }
    public string? PerformedByName { get; set; }
    public string? PerformedByUserId { get; set; }
    public string? IpAddress { get; set; }
    public string? Browser { get; set; }
    public string? OperatingSystem { get; set; }
    public string? CorrelationId { get; set; }
    public DateTime PerformedAt { get; set; }
}

public class AuditLogQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? Action { get; set; }
    public string? Module { get; set; }
    public string? EntityId { get; set; }
    public string? Search { get; set; }
    public string? PerformedByEmail { get; set; }
    public string? Status { get; set; }
}

public class CreateAuditLogRequest
{
    [Required]
    [MaxLength(64)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Module { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? EntityId { get; set; }

    [MaxLength(256)]
    public string? EntityName { get; set; }

    public string? BeforeData { get; set; }

    public string? AfterData { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(64)]
    public string? Status { get; set; }

    [MaxLength(256)]
    public string? PerformedByEmail { get; set; }

    [MaxLength(256)]
    public string? PerformedByName { get; set; }

    [MaxLength(128)]
    public string? PerformedByUserId { get; set; }

    [MaxLength(64)]
    public string? IpAddress { get; set; }

    [MaxLength(256)]
    public string? Browser { get; set; }

    [MaxLength(64)]
    public string? OperatingSystem { get; set; }

    [MaxLength(64)]
    public string? CorrelationId { get; set; }
}
