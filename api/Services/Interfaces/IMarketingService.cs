using System.Collections.Generic;
using System.Threading.Tasks;
using Vrindaya.Api.DTOs.Marketing;

namespace Vrindaya.Api.Interfaces;

public interface IMarketingService
{
    Task<DashboardResponse> GetDashboardAsync();
    
    Task<List<RecommendationResponse>> GetRecommendationsAsync();
    
    Task<ForecastResponse> GetForecastAsync();
}
