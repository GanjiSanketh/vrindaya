using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>Public. The homepage's single aggregated data source — see HomepageService for what it assembles.</summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/homepage")]
public class HomepageController : ControllerBase
{
    private readonly IHomepageService _service;

    public HomepageController(IHomepageService service)
    {
        _service = service;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(HomepageResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<HomepageResponse>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetHomepageAsync(cancellationToken));
    }
}
