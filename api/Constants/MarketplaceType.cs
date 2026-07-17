namespace Vrindaya.Api.Constants;

/// <summary>
/// Exact spelling round-trips verbatim to/from Firestore and the admin UI —
/// same load-bearing-string rule as PurchaseStatus/StockMovementType. Every
/// variant carries exactly one MarketplacePricingProfileDocument per entry
/// here — Amazon is included now even though selling there isn't live yet,
/// so its commission/pricing can be configured ahead of time.
/// </summary>
public static class MarketplaceType
{
    public const string Website = "Website";
    public const string Flipkart = "Flipkart";
    public const string Amazon = "Amazon";

    public static readonly string[] All = [Website, Flipkart, Amazon];
}
