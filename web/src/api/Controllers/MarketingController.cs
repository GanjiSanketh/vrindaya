using Api.Services.Marketing;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MarketingController : ControllerBase
    {
        private readonly ForecastService _forecastService;

        public MarketingController(ForecastService forecastService)
        {
            _forecastService = forecastService;
        }

        [HttpGet("dashboard")]
        public IActionResult GetDashboard()
        {
            return Ok(_forecastService.GetDashboard());
        }

        [HttpGet("recommendations")]
        public IActionResult GetRecommendations()
        {
            return Ok(_forecastService.GenerateRecommendations());
        }

        [HttpGet("trends")]
        public IActionResult GetTrends()
        {
            return Ok(_forecastService.GetTrendAnalysis());
        }

        [HttpGet("content-ideas")]
        public IActionResult GetContentIdeas()
        {
            return Ok(_forecastService.GenerateContentIdeas());
        }
    }
}