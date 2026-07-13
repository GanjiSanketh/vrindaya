using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Pure Firestore data access for CampaignDeliveryWorker — deliberately a
/// "Repository", not a "*Service", to keep it distinct from the app-facing
/// I*Service layer: this interface only reads/writes campaignExecutions,
/// campaignRecipients and campaigns documents. It knows nothing about
/// WhatsApp/Meta (that's IWhatsAppProvider) and nothing about HTTP.
/// </summary>
public interface ICampaignDeliveryRepository
{
    /// <summary>Executions with status QUEUED or IN_PROGRESS — the only ones a poll tick needs to look at.</summary>
    Task<List<(string Id, CampaignExecutionDocument Data)>> GetActiveExecutionsAsync(CancellationToken cancellationToken);

    /// <summary>Transitions a QUEUED execution to IN_PROGRESS and sets startedAt.</summary>
    Task ClaimExecutionAsync(string executionId, CancellationToken cancellationToken);

    /// <summary>Live re-read of just the status field — used for the cancellation check before/during a batch.</summary>
    Task<string?> GetExecutionStatusAsync(string executionId, CancellationToken cancellationToken);

    Task<CampaignDocument?> GetCampaignAsync(string campaignId, CancellationToken cancellationToken);

    Task<List<(string Id, CampaignRecipientDocument Data)>> GetQueuedRecipientsAsync(string executionId, int batchSize, CancellationToken cancellationToken);

    Task UpdateRecipientAsync(string recipientId, Dictionary<string, object?> fields, CancellationToken cancellationToken);

    /// <summary>Atomic increments — safe even if this worker ever runs as more than one instance.</summary>
    Task UpdateExecutionStatsAsync(string executionId, int processedDelta, int successfulDelta, int failedDelta, CancellationToken cancellationToken);

    Task CompleteExecutionAsync(string executionId, CancellationToken cancellationToken);

    Task MarkExecutionFailedAsync(string executionId, CancellationToken cancellationToken);
}
