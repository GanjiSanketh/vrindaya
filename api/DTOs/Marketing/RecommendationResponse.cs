namespace Vrindaya.Api.DTOs.Marketing;

public class RecommendationResponse
{
    public string Title { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double ExpectedImpact { get; set; }
    public string Action { get; set; } = string.Empty;
}
