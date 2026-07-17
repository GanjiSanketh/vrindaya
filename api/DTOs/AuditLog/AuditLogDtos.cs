using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.DTOs.AuditLog;

/// <summary>Public response shape for a single audit log entry — matches AuditLogDocument fields exactly, minus Firestore attributes.</summary>
public class AuditLogResponse
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? EntityName { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PerformedByUserId { get; set; }
    public string? PerformedByName { get; set; }
    public string? PerformedByEmail { get; set; }
    public DateTime PerformedAt { get; set; }
    public string? BeforeData { get; set; }
    public string? AfterData { get; set; }
    public string? IpAddress { get; set; }
    public string? Browser { get; set; }
    public string? OperatingSystem { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? CorrelationId { get; set; }
}

/// <summary>Pagination + filter query for the audit log listing endpoint.</summary>
public class AuditLogQuery
{
    /// <summary>Filter by action type (Create/Update/Delete/Login/Logout/PermissionChange/Custom).</summary>
    public string? Action { get; set; }

    /// <summary>Filter by module name (e.g. "Products", "AdminUsers").</summary>
    public string? Module { get; set; }

    /// <summary>Filter by entity id.</summary>
    public string? EntityId { get; set; }

    /// <summary>Filter by performer email.</summary>
    public string? PerformedByEmail { get; set; }

    /// <summary>Filter by status (Success/Failure).</summary>
    public string? Status { get; set; }

    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }

    /// <summary>Search text matched against Description and EntityName.</summary>
    public string? Search { get; set; }

    /// <summary>Page number (1-based). Defaults to 1.</summary>
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    /// <summary>Page size. Defaults to 50, max 200.</summary>
    [Range(1, 200)]
    public int PageSize { get; set; } = 50;
}

/// <summary>Internal request type for the service layer — not exposed via API
/// since the service is called directly by other modules, not over HTTP.</summary>
public class CreateAuditLogRequest
{
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? EntityName { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PerformedByUserId { get; set; }
    public string? PerformedByName { get; set; }
    public string? PerformedByEmail { get; set; }
    public string? BeforeData { get; set; }
    public string? AfterData { get; set; }
    public string? IpAddress { get; set; }
    public string? Browser { get; set; }
    public string? OperatingSystem { get; set; }
    public string Status { get; set; } = Models.AuditLogStatus.Success;
    public string? CorrelationId { get; set; }
}
