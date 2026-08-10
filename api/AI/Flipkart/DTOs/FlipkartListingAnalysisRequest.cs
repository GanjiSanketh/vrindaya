namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Input for the listing quality analysis endpoint — pairs a
/// <see cref="FlipkartListingRequest"/> (source attributes) with the
/// <see cref="FlipkartListingResponse"/> (generated listing) so the
/// <see cref="Analysis.IListingQualityAnalyzer"/> can score the listing.
/// </summary>
public sealed class FlipkartListingAnalysisRequest
{
    /// <summary>The original product attributes the listing was generated from.</summary>
    public FlipkartListingRequest? ListingRequest { get; set; }

    /// <summary>The generated Flipkart listing to evaluate.</summary>
    public FlipkartListingResponse? ListingResponse { get; set; }
}
