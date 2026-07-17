using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Auth;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Called once, right after Angular's Firebase Google Sign-In popup
    /// resolves. The caller must present a valid, Google-signed Firebase ID
    /// token (the "Firebase" scheme — signature/issuer/audience/expiry
    /// already verified by the JwtBearer handler before this action ever
    /// runs) — not the app's own AppJwt, which doesn't exist yet at this
    /// point. Looks the token's email up in AdminUsers; only an existing,
    /// active record gets an AppJwt back. Never creates an AdminUsers
    /// record itself — that's SuperAdmin-only, via AdminUsersController.
    /// </summary>
    [HttpPost("login")]
    [Authorize(AuthenticationSchemes = "Firebase")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<LoginResponse>> Login(CancellationToken cancellationToken)
    {
        var email = User.FindFirstEmail();
        var googleUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("user_id") ?? string.Empty;
        var name = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("name") ?? string.Empty;

        var response = await _authService.LoginAsync(email, googleUserId, name, User.IsEmailVerified(), cancellationToken);
        return Ok(response);
    }
}
