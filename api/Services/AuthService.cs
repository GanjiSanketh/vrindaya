using Microsoft.Extensions.Logging;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Auth;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

public class AuthService : IAuthService
{
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IJwtTokenService jwtTokenService, ILogger<AuthService> logger)
    {
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    public async Task<LoginResponse> LoginAsync(string email, string googleUserId, string name, bool emailVerified, CancellationToken cancellationToken)
    {
        if (!emailVerified)
        {
            throw new ForbiddenException("Your Google account's email is not verified.");
        }

        var (token, expiresAt) = _jwtTokenService.CreateToken(email, name);
        _logger.LogInformation("Admin login successful for {Email}", email);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new AdminUserSummary
            {
                Id = googleUserId,
                Name = name,
                Email = email,
                Role = 0,
            },
        };
    }
}
