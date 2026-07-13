using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class MarketingController : ControllerBase
{
    private readonly IMarketingService _marketingService;

    public MarketingController(IMarketingService marketingService)
    {
        _marketingService = marketingService;
    }
}
