namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "CampaignDelivery" configuration section —
/// tuning knobs for CampaignDeliveryWorker. Populated via appsettings or
/// environment variables (CampaignDelivery__BatchSize, etc.).
/// </summary>
public class CampaignDeliveryOptions
{
    public const string SectionName = "CampaignDelivery";

    /// <summary>How many QUEUED recipients to process per batch, per execution, per poll tick.</summary>
    public int BatchSize { get; set; } = 20;

    /// <summary>How often the worker polls Firestore for active executions.</summary>
    public int PollingIntervalSeconds { get; set; } = 5;
}
