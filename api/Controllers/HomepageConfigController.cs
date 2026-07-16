using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>Admin-only GET/PUT of the homepageConfig singleton — Featured/Trending/New-Arrivals product-id lists plus the Announcement/Instagram/FooterBanner/Seo sections, edited as one form.</summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/homepage-config")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class HomepageConfigController : ControllerBase
{
    private readonly IHomepageConfigService _service;

    public HomepageConfigController(IHomepageConfigService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(HomepageConfigResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<HomepageConfigResponse>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAsync(cancellationToken));
    }

    [HttpPut]
    [ProducesResponseType(typeof(HomepageConfigResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<HomepageConfigResponse>> Update([FromBody] UpdateHomepageConfigRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.UpdateAsync(request, updatedBy, cancellationToken));
    }
}
