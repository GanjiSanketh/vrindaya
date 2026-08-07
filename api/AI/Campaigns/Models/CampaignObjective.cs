using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Campaigns.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CampaignObjective
{
    IncreaseSales,
    IncreaseFollowers,
    ClearInventory,
    LaunchProduct,
    FestivalPromotion,
    WebsiteTraffic,
    BrandAwareness,
    RepeatCustomers,
    Upsell,
    CrossSell,
}