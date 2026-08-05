using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.DTOs.Marketing;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[Route("api/marketing")]
public class MarketingController : ControllerBase
{
    private readonly IMarketingService _marketingService;

    public MarketingController(IMarketingService marketingService)
    {
        _marketingService = marketingService;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardResponse>> GetDashboard()
    {
        var response = await _marketingService.GetDashboardAsync();
        return Ok(response);
    }

    [HttpGet("recommendations")]
    public async Task<ActionResult<List<RecommendationResponse>>> GetRecommendations()
    {
        var response = await _marketingService.GetRecommendationsAsync();
        return Ok(response);
    }

    [HttpGet("forecast")]
    public async Task<ActionResult<ForecastResponse>> GetForecast()
    {
        var response = await _marketingService.GetForecastAsync();
        return Ok(response);
    }
}
