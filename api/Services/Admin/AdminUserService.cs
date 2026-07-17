using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Admin;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;

namespace Vrindaya.Api.Services.Admin;

/// <summary>
/// Owns every AdminUsers business rule beyond plain CRUD — specifically the
/// "never lock everyone out" guarantees from the spec: the last active
/// SuperAdmin can't be demoted, deactivated, or made to demote/deactivate
/// themselves via their own edit. All three are enforced here, not in the
/// controller, so AdminUsersController stays a thin translation layer like
/// every other controller in this app.
/// </summary>
public class AdminUserService : IAdminUserService
{
    private readonly IAdminUserRepository _repository;
    private readonly IAuditLogService _auditLogService;

    public AdminUserService(IAdminUserRepository repository, IAuditLogService auditLogService)
    {
        _repository = repository;
        _auditLogService = auditLogService;
    }

    public async Task<List<AdminUserResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var users = await _repository.GetAllAsync(cancellationToken);
        return users.Select(ToResponse).ToList();
    }

    public async Task<AdminUserResponse> CreateAsync(CreateAdminUserRequest request, string createdBy, CancellationToken cancellationToken)
    {
        var normalizedEmail = AdminUserRepository.NormalizeEmail(request.Email);

        if (await _repository.GetByEmailAsync(normalizedEmail, cancellationToken) != null)
        {
            throw new ConflictException($"An admin user with email '{request.Email}' already exists.");
        }

        var now = DateTime.UtcNow;
        var document = new AdminUserDocument
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            Role = request.Role.ToString(),
            IsActive = true,
            CreatedAt = now,
            CreatedBy = createdBy,
            UpdatedAt = now,
            UpdatedBy = createdBy,
        };

        await _repository.CreateAsync(document, cancellationToken);
        try { await _auditLogService.LogCreateAsync("AdminUsers", document.Email, document.Name, AuditLogService.SerializeJson(document), createdBy, null, null, $"Admin user '{document.Email}' created with role {document.Role}"); } catch { }
        return ToResponse(document);
    }

    public async Task<AdminUserResponse> UpdateAsync(string email, UpdateAdminUserRequest request, string callerEmail, CancellationToken cancellationToken)
    {
        var normalizedEmail = AdminUserRepository.NormalizeEmail(email);
        var existing = await _repository.GetByEmailAsync(normalizedEmail, cancellationToken)
            ?? throw new NotFoundException("Admin user", email);

        var beforeData = AuditLogService.SerializeJson(existing);

        var isSelf = string.Equals(normalizedEmail, AdminUserRepository.NormalizeEmail(callerEmail), StringComparison.Ordinal);
        var newRole = request.Role.ToString();
        var wasSuperAdmin = existing.Role == AdminRoles.SuperAdmin;
        var demotingRole = wasSuperAdmin && newRole != AdminRoles.SuperAdmin;
        var deactivating = existing.IsActive && !request.IsActive;

        if (isSelf && wasSuperAdmin && demotingRole)
        {
            throw new ForbiddenException("You cannot change your own role.");
        }

        if (wasSuperAdmin && (demotingRole || (deactivating && wasSuperAdmin)))
        {
            await EnsureNotLastActiveSuperAdminAsync(normalizedEmail, cancellationToken);
        }

        existing.Name = request.Name.Trim();
        existing.Role = newRole;
        existing.IsActive = request.IsActive;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.UpdatedBy = callerEmail;

        await _repository.UpdateAsync(normalizedEmail, existing, cancellationToken);
        try { await _auditLogService.LogUpdateAsync("AdminUsers", existing.Email, existing.Name, beforeData, AuditLogService.SerializeJson(existing), callerEmail, null, null, $"Admin user '{existing.Email}' updated"); } catch { }
        return ToResponse(existing);
    }

    public async Task<AdminUserResponse> SetActiveAsync(string email, bool active, string updatedBy, CancellationToken cancellationToken)
    {
        var normalizedEmail = AdminUserRepository.NormalizeEmail(email);
        var existing = await _repository.GetByEmailAsync(normalizedEmail, cancellationToken)
            ?? throw new NotFoundException("Admin user", email);

        var beforeData = AuditLogService.SerializeJson(existing);

        if (!active && existing.IsActive && existing.Role == AdminRoles.SuperAdmin)
        {
            await EnsureNotLastActiveSuperAdminAsync(normalizedEmail, cancellationToken);
        }

        existing.IsActive = active;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.UpdatedBy = updatedBy;

        await _repository.UpdateAsync(normalizedEmail, existing, cancellationToken);
        var action = active ? "activated" : "deactivated";
        try { await _auditLogService.LogUpdateAsync("AdminUsers", existing.Email, existing.Name, beforeData, AuditLogService.SerializeJson(existing), updatedBy, null, null, $"Admin user '{existing.Email}' {action}"); } catch { }
        return ToResponse(existing);
    }

    public Task<AdminUserDocument?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return _repository.GetByEmailAsync(email, cancellationToken);
    }

    public async Task SyncGoogleProfileAsync(string email, string googleUserId, string name, CancellationToken cancellationToken)
    {
        var normalizedEmail = AdminUserRepository.NormalizeEmail(email);
        var existing = await _repository.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (existing == null)
        {
            return;
        }

        var changed = existing.GoogleUserId != googleUserId || (string.IsNullOrWhiteSpace(existing.Name) && !string.IsNullOrWhiteSpace(name));
        if (!changed)
        {
            return;
        }

        existing.GoogleUserId = googleUserId;
        if (string.IsNullOrWhiteSpace(existing.Name) && !string.IsNullOrWhiteSpace(name))
        {
            existing.Name = name;
        }

        // Not stamped as an "update" in the UpdatedBy/UpdatedAt sense — this
        // is a passive profile sync on login, not an admin-initiated edit.
        await _repository.UpdateAsync(normalizedEmail, existing, cancellationToken);
    }

    /// <summary>Throws ForbiddenException if excludedEmail is currently the only active SuperAdmin — called before that exact record is about to be demoted or deactivated.</summary>
    private async Task EnsureNotLastActiveSuperAdminAsync(string excludedEmail, CancellationToken cancellationToken)
    {
        var all = await _repository.GetAllAsync(cancellationToken);
        var otherActiveSuperAdmins = all.Any(u =>
            u.Role == AdminRoles.SuperAdmin
            && u.IsActive
            && !string.Equals(AdminUserRepository.NormalizeEmail(u.Email), excludedEmail, StringComparison.Ordinal));

        if (!otherActiveSuperAdmins)
        {
            throw new ForbiddenException("At least one active Super Admin must remain — promote another admin to Super Admin first.");
        }
    }

    private static AdminUserResponse ToResponse(AdminUserDocument doc) => new()
    {
        Id = doc.Id,
        GoogleUserId = doc.GoogleUserId,
        Name = doc.Name,
        Email = doc.Email,
        Role = Enum.Parse<AdminUserRole>(doc.Role),
        IsActive = doc.IsActive,
        CreatedAt = doc.CreatedAt,
        CreatedBy = doc.CreatedBy,
        UpdatedAt = doc.UpdatedAt,
        UpdatedBy = doc.UpdatedBy,
    };
}
