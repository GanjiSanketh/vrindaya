using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Analytics;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Website analytics configuration (analyticsSettings/website). GET is public
/// (the admin screen loads it like the storefront does); the only mutation —
/// PUT — is admin-only via the AdminOnly policy (Admin or Super Admin roles,
/// enforced by the AdminOnlyAuthorizationHandler), and the save happens on
/// the server with the service account, so firestore.rules never sees a
/// browser write for an admin-only document. The storefront keeps reading
/// the document directly from Firestore; this controller is the enforcement
/// boundary for changes.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/analytics-settings")]
public class AnalyticsSettingsController : ControllerBase
{
    private readonly IAnalyticsSettingsService _service;

    public AnalyticsSettingsController(IAnalyticsSettingsService service)
    {
        _service = service;
    }

    /// <summary>Public — the current analytics configuration (documented defaults when none saved yet).</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AnalyticsSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AnalyticsSettingsDto>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAsync(cancellationToken));
    }

    /// <summary>Admin-only — overwrites analyticsSettings/website; updatedBy is taken from the authenticated AppJwt, never the body.</summary>
    [HttpPut]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(AnalyticsSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AnalyticsSettingsDto>> Save([FromBody] SaveAnalyticsSettingsRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.SaveAsync(request, User.FindFirstEmail(), cancellationToken));
    }
}
