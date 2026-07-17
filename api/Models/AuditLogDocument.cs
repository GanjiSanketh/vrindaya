using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's auditLogs collection — an append-only
/// ledger recording every important admin action across all modules. One
/// document per action, auto-generated id, never updated or deleted.
///
/// BeforeData and AfterData are JSON strings capturing the state before and
/// after the action, enabling point-in-time reconstruction of what changed.
///
/// EXPORT READY — the collection has no Firestore composite indexes beyond
/// the single-field defaults, so PagedResult-based listing with date-range
/// filtering works out of the box for CSV/PDF export screens.
/// </summary>
[FirestoreData]
public class AuditLogDocument
{
    [FirestoreProperty("action")]
    public string Action { get; set; } = string.Empty;

    [FirestoreProperty("module")]
    public string Module { get; set; } = string.Empty;

    [FirestoreProperty("entityId")]
    public string? EntityId { get; set; }

    [FirestoreProperty("entityName")]
    public string? EntityName { get; set; }

    [FirestoreProperty("description")]
    public string Description { get; set; } = string.Empty;

    [FirestoreProperty("performedByUserId")]
    public string? PerformedByUserId { get; set; }

    [FirestoreProperty("performedByName")]
    public string? PerformedByName { get; set; }

    [FirestoreProperty("performedByEmail")]
    public string? PerformedByEmail { get; set; }

    [FirestoreProperty("performedAt")]
    public DateTime PerformedAt { get; set; }

    /// <summary>JSON-serialized state before the action. Null for Create/Login/Logout actions.</summary>
    [FirestoreProperty("beforeData")]
    public string? BeforeData { get; set; }

    /// <summary>JSON-serialized state after the action. Null for Delete/Logout actions.</summary>
    [FirestoreProperty("afterData")]
    public string? AfterData { get; set; }

    [FirestoreProperty("ipAddress")]
    public string? IpAddress { get; set; }

    [FirestoreProperty("browser")]
    public string? Browser { get; set; }

    [FirestoreProperty("operatingSystem")]
    public string? OperatingSystem { get; set; }

    /// <summary>Success | Failure — tracks whether the action completed normally.</summary>
    [FirestoreProperty("status")]
    public string Status { get; set; } = AuditLogStatus.Success;

    /// <summary>
    /// Optional correlation id for grouping related operations (e.g. all
    /// stock movements triggered by a single purchase entry edit). Populated
    /// by the caller, not generated here.
    /// </summary>
    [FirestoreProperty("correlationId")]
    public string? CorrelationId { get; set; }
}

/// <summary>Load-bearing string constants for AuditLogDocument.Status.</summary>
public static class AuditLogStatus
{
    public const string Success = "Success";
    public const string Failure = "Failure";
}

/// <summary>Standardised action names for AuditLogDocument.Action — keeps the
/// audit log queryable without guessing casing/spelling.</summary>
public static class AuditLogAction
{
    public const string Create = "Create";
    public const string Update = "Update";
    public const string Delete = "Delete";
    public const string Login = "Login";
    public const string Logout = "Logout";
    public const string PermissionChange = "PermissionChange";
    public const string Custom = "Custom";
}
