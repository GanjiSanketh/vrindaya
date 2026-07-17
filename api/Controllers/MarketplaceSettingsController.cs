using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Marketplace;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/marketplace-settings/flipkart")]
public class MarketplaceSettingsController : ControllerBase
{
    private readonly IMarketplaceSettingsService _service;

    public MarketplaceSettingsController(IMarketplaceSettingsService service)
    {
        _service = service;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FlipkartSettingsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FlipkartSettingsResponse>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAsync(cancellationToken));
    }

    [HttpPut]
    [Authorize(Roles = AdminRoles.SuperAdmin)]
    [ProducesResponseType(typeof(FlipkartSettingsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FlipkartSettingsResponse>> Update([FromBody] UpdateFlipkartSettingsRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.UpdateAsync(request, updatedBy, cancellationToken));
    }
}
