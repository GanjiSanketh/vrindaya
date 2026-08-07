namespace Vrindaya.Api.AI.Campaigns.Models;

/// <summary>
/// Immutable campaign-relevant view of a product. The generation layer only
/// ever sees this projection — it never connects to Firestore.
/// </summary>
public sealed record CampaignProduct(
    string ProductId,
    string Name,
    string Category,
    double Price,
    double PurchaseCost,
    double SellingPrice,
    int Stock,
    int Sales,
    DateTime CreatedDate);