using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.AuditLog;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Reusable audit logging service — every module calls these methods to
/// record important actions. BeforeData/AfterData are JSON strings.
/// HTTP context (IP, Browser, OS) is captured automatically from the
/// current request via IHttpContextAccessor when available.
///
/// EXPORT READY — GetAsync + AuditLogQuery support page-number pagination
/// with date-range, action, module, and search filters, ready to back a
/// future CSV/PDF export endpoint.
///
/// USAGE (in any module):
///   await _auditLog.LogCreateAsync("Products", product.Id, product.Name,
///       jsonAfter, performedBy, "Product created");
///
///   await _auditLog.LogUpdateAsync("Products", product.Id, product.Name,
///       jsonBefore, jsonAfter, performedBy, "Product updated");
///
///   await _auditLog.LogDeleteAsync("Products", product.Id, product.Name,
///       jsonBefore, performedBy, "Product deleted");
///
///   await _auditLog.LogLoginAsync(email, name, true, "Admin login successful");
///
///   await _auditLog.LogLogoutAsync(email, name, "Admin logged out");
///
///   await _auditLog.LogPermissionChangeAsync("AdminUsers", userEmail, userName,
///       jsonBefore, jsonAfter, performedBy, "Role changed from Admin to SuperAdmin");
///
///   await _auditLog.LogCustomAsync("Export", "Reports", null, "Sales Report",
///       "Monthly sales report exported", performedBy, status: "Success");
/// </summary>
public interface IAuditLogService
{
    /// <summary>Logs a resource creation. Automatically sets Action = "Create".</summary>
    Task LogCreateAsync(
        string module, string? entityId, string? entityName,
        string? afterData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null);

    /// <summary>Logs a resource update with before/after snapshots. Automatically sets Action = "Update".</summary>
    Task LogUpdateAsync(
        string module, string? entityId, string? entityName,
        string? beforeData, string? afterData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null);

    /// <summary>Logs a resource deletion. Automatically sets Action = "Delete".</summary>
    Task LogDeleteAsync(
        string module, string? entityId, string? entityName,
        string? beforeData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null);

    /// <summary>Logs a successful or failed login attempt. Automatically sets Action = "Login".</summary>
    Task LogLoginAsync(
        string email, string? name,
        bool success, string description, string? correlationId = null);

    /// <summary>Logs a logout. Automatically sets Action = "Logout".</summary>
    Task LogLogoutAsync(
        string email, string? name,
        string description, string? correlationId = null);

    /// <summary>Logs a role/permission change with before/after snapshots. Automatically sets Action = "PermissionChange".</summary>
    Task LogPermissionChangeAsync(
        string module, string? entityId, string? entityName,
        string? beforeData, string? afterData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null);

    /// <summary>Logs an arbitrary action. Caller provides the action name explicitly.</summary>
    Task LogCustomAsync(
        string action, string module, string? entityId, string? entityName,
        string description,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string? beforeData = null, string? afterData = null,
        string? status = null, string? correlationId = null);

    /// <summary>Paginated listing with filters — backs the admin audit log viewer and future export.</summary>
    Task<PagedResult<AuditLogResponse>> GetAsync(AuditLogQuery query, CancellationToken cancellationToken);
}
