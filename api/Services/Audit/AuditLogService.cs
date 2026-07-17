using System.Text.Json;
using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.AuditLog;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Audit;

/// <summary>
/// Centralised audit logging — every module should call the appropriate
/// method here rather than writing directly to the auditLogs collection.
///
/// HTTP context (IP, Browser, OS) is captured automatically from the
/// current HttpContext when available (via IHttpContextAccessor). When
/// called from a background service or non-HTTP context those fields
/// remain null.
/// </summary>
public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _repository;
    private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(
        IAuditLogRepository repository,
        Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor)
    {
        _repository = repository;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogCreateAsync(
        string module, string? entityId, string? entityName,
        string? afterData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null)
    {
        await WriteAsync(new CreateAuditLogRequest
        {
            Action = AuditLogAction.Create,
            Module = module,
            EntityId = entityId,
            EntityName = entityName,
            Description = description,
            PerformedByEmail = performedByEmail,
            PerformedByName = performedByName,
            PerformedByUserId = performedByUserId,
            AfterData = afterData,
            Status = Models.AuditLogStatus.Success,
            CorrelationId = correlationId,
        }, CancellationToken.None);
    }

    public async Task LogUpdateAsync(
        string module, string? entityId, string? entityName,
        string? beforeData, string? afterData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null)
    {
        await WriteAsync(new CreateAuditLogRequest
        {
            Action = AuditLogAction.Update,
            Module = module,
            EntityId = entityId,
            EntityName = entityName,
            Description = description,
            PerformedByEmail = performedByEmail,
            PerformedByName = performedByName,
            PerformedByUserId = performedByUserId,
            BeforeData = beforeData,
            AfterData = afterData,
            Status = Models.AuditLogStatus.Success,
            CorrelationId = correlationId,
        }, CancellationToken.None);
    }

    public async Task LogDeleteAsync(
        string module, string? entityId, string? entityName,
        string? beforeData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null)
    {
        await WriteAsync(new CreateAuditLogRequest
        {
            Action = AuditLogAction.Delete,
            Module = module,
            EntityId = entityId,
            EntityName = entityName,
            Description = description,
            PerformedByEmail = performedByEmail,
            PerformedByName = performedByName,
            PerformedByUserId = performedByUserId,
            BeforeData = beforeData,
            Status = Models.AuditLogStatus.Success,
            CorrelationId = correlationId,
        }, CancellationToken.None);
    }

    public async Task LogLoginAsync(
        string email, string? name,
        bool success, string description, string? correlationId = null)
    {
        await WriteAsync(new CreateAuditLogRequest
        {
            Action = AuditLogAction.Login,
            Module = "Auth",
            EntityId = email,
            EntityName = name,
            Description = description,
            PerformedByEmail = email,
            PerformedByName = name,
            Status = success ? Models.AuditLogStatus.Success : Models.AuditLogStatus.Failure,
            CorrelationId = correlationId,
        }, CancellationToken.None);
    }

    public async Task LogLogoutAsync(
        string email, string? name,
        string description, string? correlationId = null)
    {
        await WriteAsync(new CreateAuditLogRequest
        {
            Action = AuditLogAction.Logout,
            Module = "Auth",
            EntityId = email,
            EntityName = name,
            Description = description,
            PerformedByEmail = email,
            PerformedByName = name,
            Status = Models.AuditLogStatus.Success,
            CorrelationId = correlationId,
        }, CancellationToken.None);
    }

    public async Task LogPermissionChangeAsync(
        string module, string? entityId, string? entityName,
        string? beforeData, string? afterData,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string description, string? correlationId = null)
    {
        await WriteAsync(new CreateAuditLogRequest
        {
            Action = AuditLogAction.PermissionChange,
            Module = module,
            EntityId = entityId,
            EntityName = entityName,
            Description = description,
            PerformedByEmail = performedByEmail,
            PerformedByName = performedByName,
            PerformedByUserId = performedByUserId,
            BeforeData = beforeData,
            AfterData = afterData,
            Status = Models.AuditLogStatus.Success,
            CorrelationId = correlationId,
        }, CancellationToken.None);
    }

    public async Task LogCustomAsync(
        string action, string module, string? entityId, string? entityName,
        string description,
        string? performedByEmail, string? performedByName, string? performedByUserId,
        string? beforeData = null, string? afterData = null,
        string? status = null, string? correlationId = null)
    {
        await WriteAsync(new CreateAuditLogRequest
        {
            Action = action,
            Module = module,
            EntityId = entityId,
            EntityName = entityName,
            Description = description,
            PerformedByEmail = performedByEmail,
            PerformedByName = performedByName,
            PerformedByUserId = performedByUserId,
            BeforeData = beforeData,
            AfterData = afterData,
            Status = status ?? Models.AuditLogStatus.Success,
            CorrelationId = correlationId,
        }, CancellationToken.None);
    }

    public async Task<PagedResult<AuditLogResponse>> GetAsync(AuditLogQuery query, CancellationToken cancellationToken)
    {
        var from = query.DateFrom ?? DateTime.UtcNow.AddYears(-1);
        var to = query.DateTo ?? DateTime.UtcNow;

        // Load all documents in the date window
        var all = await _repository.GetAsync(from, to, 1, int.MaxValue, cancellationToken);

        // Apply in-memory filters
        IEnumerable<(string Id, AuditLogDocument Data)> filtered = all.Items;

        if (!string.IsNullOrWhiteSpace(query.Action))
            filtered = filtered.Where(x => string.Equals(x.Data.Action, query.Action, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(query.Module))
            filtered = filtered.Where(x => string.Equals(x.Data.Module, query.Module, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(query.EntityId))
            filtered = filtered.Where(x => string.Equals(x.Data.EntityId, query.EntityId, StringComparison.Ordinal));

        if (!string.IsNullOrWhiteSpace(query.PerformedByEmail))
            filtered = filtered.Where(x => string.Equals(x.Data.PerformedByEmail, query.PerformedByEmail, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(query.Status))
            filtered = filtered.Where(x => string.Equals(x.Data.Status, query.Status, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var searchLower = query.Search.ToLowerInvariant();
            filtered = filtered.Where(x =>
                (x.Data.Description?.Contains(searchLower, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (x.Data.EntityName?.Contains(searchLower, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        var sorted = filtered.OrderByDescending(x => x.Data.PerformedAt).ToList();
        var totalCount = sorted.Count;
        var clampedPageSize = Math.Clamp(query.PageSize, 1, 200);
        var pageItems = sorted.Skip((query.Page - 1) * clampedPageSize).Take(clampedPageSize).ToList();

        return new PagedResult<AuditLogResponse>
        {
            Items = pageItems.Select(x => ToResponse(x.Id, x.Data)).ToList(),
            NextCursor = (query.Page * clampedPageSize < totalCount) ? (query.Page + 1).ToString() : null,
            TotalCount = totalCount,
        };
    }

    private async Task WriteAsync(CreateAuditLogRequest request, CancellationToken cancellationToken)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        var document = new AuditLogDocument
        {
            Action = request.Action,
            Module = request.Module,
            EntityId = request.EntityId,
            EntityName = request.EntityName,
            Description = request.Description,
            PerformedByUserId = request.PerformedByUserId,
            PerformedByName = request.PerformedByName,
            PerformedByEmail = request.PerformedByEmail,
            PerformedAt = DateTime.UtcNow,
            BeforeData = request.BeforeData,
            AfterData = request.AfterData,
            IpAddress = request.IpAddress ?? httpContext?.Connection.RemoteIpAddress?.ToString(),
            Browser = request.Browser ?? httpContext?.Request.Headers.UserAgent.ToString(),
            OperatingSystem = request.OperatingSystem,
            Status = request.Status,
            CorrelationId = request.CorrelationId,
        };

        await _repository.CreateAsync(document, cancellationToken);
    }

    /// <summary>
    /// Serialises an object to JSON for storage in BeforeData/AfterData.
    /// Returns null if the input is null.
    /// </summary>
    public static string? SerializeJson(object? data)
    {
        return data == null ? null : JsonSerializer.Serialize(data, new JsonSerializerOptions
        {
            WriteIndented = false,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
    }

    private static AuditLogResponse ToResponse(string id, AuditLogDocument doc)
    {
        return new AuditLogResponse
        {
            Id = id,
            Action = doc.Action,
            Module = doc.Module,
            EntityId = doc.EntityId,
            EntityName = doc.EntityName,
            Description = doc.Description,
            PerformedByUserId = doc.PerformedByUserId,
            PerformedByName = doc.PerformedByName,
            PerformedByEmail = doc.PerformedByEmail,
            PerformedAt = doc.PerformedAt,
            BeforeData = doc.BeforeData,
            AfterData = doc.AfterData,
            IpAddress = doc.IpAddress,
            Browser = doc.Browser,
            OperatingSystem = doc.OperatingSystem,
            Status = doc.Status,
            CorrelationId = doc.CorrelationId,
        };
    }
}
