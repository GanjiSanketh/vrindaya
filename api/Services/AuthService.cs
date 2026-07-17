using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Auth;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services;

public class AuthService : IAuthService
{
    private readonly IAdminUserService _adminUserService;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IAuditLogService _auditLogService;

    public AuthService(IAdminUserService adminUserService, IJwtTokenService jwtTokenService, IAuditLogService auditLogService)
    {
        _adminUserService = adminUserService;
        _jwtTokenService = jwtTokenService;
        _auditLogService = auditLogService;
    }

    public async Task<LoginResponse> LoginAsync(string email, string googleUserId, string name, bool emailVerified, CancellationToken cancellationToken)
    {
        if (!emailVerified)
        {
            throw new ForbiddenException("Your Google account's email is not verified.");
        }

        var adminUser = await _adminUserService.FindByEmailAsync(email, cancellationToken);
        if (adminUser == null)
        {
            throw new ForbiddenException("You don't have access to the Admin Portal.");
        }

        if (!adminUser.IsActive)
        {
            throw new ForbiddenException("Your account has been deactivated. Contact a Super Admin.");
        }

        await _adminUserService.SyncGoogleProfileAsync(email, googleUserId, name, cancellationToken);

        var displayName = string.IsNullOrWhiteSpace(name) ? adminUser.Name : name;
        var (token, expiresAt) = _jwtTokenService.CreateToken(adminUser);

        try { await _auditLogService.LogLoginAsync(email, displayName, true, "Admin login successful"); } catch { }

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new AdminUserSummary
            {
                Id = adminUser.Id,
                Name = displayName,
                Email = adminUser.Email,
                Role = Enum.Parse<AdminUserRole>(adminUser.Role),
            },
        };
    }
}
