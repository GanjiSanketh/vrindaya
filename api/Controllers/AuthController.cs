using System.Diagnostics;
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
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("login")]
    [Authorize(AuthenticationSchemes = "Firebase")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LoginResponse>> Login(CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        _logger.LogInformation("[AUTH] === Login request received at {Timestamp}", DateTime.UtcNow);

        var email = User.FindFirstEmail();
        var googleUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("user_id") ?? string.Empty;
        var name = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("name") ?? string.Empty;

        _logger.LogInformation("[AUTH] Firebase token validated — email={Email}, elapsed={Elapsed}ms", email, sw.ElapsedMilliseconds);

        try
        {
            var response = await _authService.LoginAsync(email, googleUserId, name, User.IsEmailVerified(), cancellationToken);
            _logger.LogInformation("[AUTH] Login completed for {Email} — total={Elapsed}ms", email, sw.ElapsedMilliseconds);
            return Ok(response);
        }
        catch (Exception ex) when (ex is not Vrindaya.Api.Common.Exceptions.ForbiddenException)
        {
            _logger.LogError(ex, "[AUTH] Login failed for {Email} after {Elapsed}ms", email, sw.ElapsedMilliseconds);
            throw;
        }
    }
}
