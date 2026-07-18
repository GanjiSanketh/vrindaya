using System.Diagnostics;
using Microsoft.Extensions.Logging;
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
	private readonly ILogger<AuthService> _logger;

	public AuthService(
		IAdminUserService adminUserService,
		IJwtTokenService jwtTokenService,
		IAuditLogService auditLogService,
		ILogger<AuthService> logger)
	{
		_adminUserService = adminUserService;
		_jwtTokenService = jwtTokenService;
		_auditLogService = auditLogService;
		_logger = logger;
	}

	public async Task<LoginResponse> LoginAsync(string email, string googleUserId, string name, bool emailVerified, CancellationToken cancellationToken)
	{
		var sw = Stopwatch.StartNew();
		_logger.LogInformation("[AUTH] === LoginAsync started for {Email} (emailVerified: {EmailVerified})", email, emailVerified);

		if (!emailVerified)
		{
			_logger.LogWarning("[AUTH] Login rejected — email not verified for {Email}", email);
			throw new ForbiddenException("Your Google account's email is not verified.");
		}
		_logger.LogInformation("[AUTH] 1/5 Email verified OK — elapsed={Elapsed}ms", sw.ElapsedMilliseconds);

		AdminUserDocument adminUser;
		try
		{
			adminUser = await _adminUserService.FindByEmailAsync(email, cancellationToken)
				?? throw new ForbiddenException("You don't have access to the Admin Portal.");
			_logger.LogInformation("[AUTH] 2/5 Admin found for {Email} — Role: {Role}, IsActive: {IsActive}, elapsed={Elapsed}ms",
				email, adminUser.Role, adminUser.IsActive, sw.ElapsedMilliseconds);
		}
		catch (ForbiddenException)
		{
			throw;
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "[AUTH] Admin lookup failed for {Email} after {Elapsed}ms", email, sw.ElapsedMilliseconds);
			throw;
		}

		if (!adminUser.IsActive)
		{
			_logger.LogWarning("[AUTH] Login rejected — account deactivated for {Email}", email);
			throw new ForbiddenException("Your account has been deactivated. Contact a Super Admin.");
		}

		try
		{
			await _adminUserService.SyncGoogleProfileAsync(email, googleUserId, name, cancellationToken);
			_logger.LogInformation("[AUTH] 3/5 Google profile synced for {Email} — elapsed={Elapsed}ms", email, sw.ElapsedMilliseconds);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "[AUTH] Google profile sync failed for {Email} after {Elapsed}ms", email, sw.ElapsedMilliseconds);
			throw;
		}

		var displayName = string.IsNullOrWhiteSpace(name) ? adminUser.Name : name;

		string token;
		DateTime expiresAt;
		try
		{
			(token, expiresAt) = _jwtTokenService.CreateToken(adminUser);
			_logger.LogInformation("[AUTH] 4/5 AppJwt created for {Email} — expires at {ExpiresAt}, elapsed={Elapsed}ms", email, expiresAt, sw.ElapsedMilliseconds);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "[AUTH] JWT creation failed for {Email} after {Elapsed}ms — signing key may be misconfigured", email, sw.ElapsedMilliseconds);
			throw;
		}

		try
		{
			await _auditLogService.LogLoginAsync(email, displayName, true, "Admin login successful");
			_logger.LogInformation("[AUTH] Audit log written for {Email}", email);
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "[AUTH] Audit log failed for {Email} — login continues", email);
		}

		AdminUserRole parsedRole;
		try
		{
			parsedRole = Enum.Parse<AdminUserRole>(adminUser.Role);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "[AUTH] Invalid role '{Role}' for {Email}", adminUser.Role, email);
			throw;
		}

		_logger.LogInformation("[AUTH] 5/5 Login completed successfully for {Email} — total={Total}ms", email, sw.ElapsedMilliseconds);
		return new LoginResponse
		{
			Token = token,
			ExpiresAt = expiresAt,
			User = new AdminUserSummary
			{
				Id = adminUser.Id,
				Name = displayName,
				Email = adminUser.Email,
				Role = parsedRole,
			},
		};
	}
}
