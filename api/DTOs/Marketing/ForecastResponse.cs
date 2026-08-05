namespace Vrindaya.Api.DTOs.Marketing;

public class ForecastResponse
{
    public double WeeklyForecast { get; set; }
    public double MonthlyForecast { get; set; }
    public double QuarterlyForecast { get; set; }
    public double ExpectedRevenue { get; set; }
    public double ExpectedGrowth { get; set; }
    public double ConfidenceScore { get; set; }
}
