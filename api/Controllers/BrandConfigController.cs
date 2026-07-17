using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Brand;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// GET/PUT of the brandConfig/singleton document — About Us, Contact,
/// Store Information, Social Links, FAQs, Policies, and footer display
/// toggles, edited as one form. GET stays public/unauthenticated (the
/// footer and every Brand public page call it); PUT is admin-only —
/// same per-action split CategoryController already uses.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/brand-config")]
public class BrandConfigController : ControllerBase
{
    private readonly IBrandConfigService _service;

    public BrandConfigController(IBrandConfigService service)
    {
        _service = service;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(BrandConfigResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BrandConfigResponse>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAsync(cancellationToken));
    }

    [HttpPut]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(BrandConfigResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BrandConfigResponse>> Update([FromBody] UpdateBrandConfigRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.UpdateAsync(request, updatedBy, cancellationToken));
    }
}
