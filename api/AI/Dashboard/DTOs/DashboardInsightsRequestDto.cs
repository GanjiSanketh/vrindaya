using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Dashboard.DTOs;

/// <summary>
/// Input contract for the business dashboard aggregation. Carries the product
/// pool every intelligence module analyses plus the optional listing data the
/// listing-quality module needs. Pure request data — no Firestore, no AI.
/// </summary>
public sealed class DashboardInsightsRequestDto
{
    /// <summary>Products analysed by every module in the aggregation.</summary>
    public List<FlipkartProduct> Products { get; set; } = [];

    /// <summary>Listing state keyed by product id. Products without an entry are skipped by the listing-quality module.</summary>
    public Dictionary<string, ListingEvaluationInput> Listings { get; set; } = [];

    /// <summary>Optional campaign parameters. When null, the module defaults are used.</summary>
    public CampaignRequestDto? Campaign { get; set; }

    /// <summary>Maximum items returned inside each insight section.</summary>
    public int MaximumPerSection { get; set; } = 5;
}
