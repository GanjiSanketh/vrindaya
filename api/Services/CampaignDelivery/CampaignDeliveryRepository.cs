using Google.Cloud.Firestore;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.CampaignDelivery;

/// <summary>
/// See ICampaignDeliveryRepository. Collection names are literals here
/// deliberately — they're Firestore collection identifiers, not values that
/// belong in AppConstants (which holds cross-cutting app config, not
/// per-feature data-layer detail).
/// </summary>
public class CampaignDeliveryRepository : ICampaignDeliveryRepository
{
    private const string ExecutionsCollection = "campaignExecutions";
    private const string RecipientsCollection = "campaignRecipients";
    private const string CampaignsCollection = "campaigns";

    private readonly IFirebaseService _firebaseService;

    public CampaignDeliveryRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<List<(string Id, CampaignExecutionDocument Data)>> GetActiveExecutionsAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(ExecutionsCollection)
            .WhereIn("status", new object[] { CampaignExecutionStatus.Queued, CampaignExecutionStatus.InProgress })
            .GetSnapshotAsync(cancellationToken);

        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<CampaignExecutionDocument>())).ToList();
    }

    public async Task ClaimExecutionAsync(string executionId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(ExecutionsCollection).Document(executionId).UpdateAsync(new Dictionary<string, object>
        {
            ["status"] = CampaignExecutionStatus.InProgress,
            ["startedAt"] = DateTime.UtcNow,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken: cancellationToken);
    }

    public async Task<string?> GetExecutionStatusAsync(string executionId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(ExecutionsCollection).Document(executionId).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.GetValue<string>("status") : null;
    }

    public async Task<CampaignDocument?> GetCampaignAsync(string campaignId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(CampaignsCollection).Document(campaignId).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<CampaignDocument>() : null;
    }

    public async Task<List<(string Id, CampaignRecipientDocument Data)>> GetQueuedRecipientsAsync(
        string executionId, int batchSize, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(RecipientsCollection)
            .WhereEqualTo("executionId", executionId)
            .WhereEqualTo("status", CampaignRecipientStatus.Queued)
            .Limit(batchSize)
            .GetSnapshotAsync(cancellationToken);

        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<CampaignRecipientDocument>())).ToList();
    }

    public async Task UpdateRecipientAsync(string recipientId, Dictionary<string, object?> fields, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var updates = fields
            .Where(kv => kv.Value != null)
            .ToDictionary(kv => kv.Key, kv => kv.Value!);
        updates["updatedAt"] = DateTime.UtcNow;

        await db.Collection(RecipientsCollection).Document(recipientId).UpdateAsync(updates, cancellationToken: cancellationToken);
    }

    public async Task UpdateExecutionStatsAsync(
        string executionId, int processedDelta, int successfulDelta, int failedDelta, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(ExecutionsCollection).Document(executionId).UpdateAsync(new Dictionary<string, object>
        {
            ["processedRecipients"] = FieldValue.Increment(processedDelta),
            ["successfulRecipients"] = FieldValue.Increment(successfulDelta),
            ["failedRecipients"] = FieldValue.Increment(failedDelta),
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken: cancellationToken);
    }

    public async Task CompleteExecutionAsync(string executionId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(ExecutionsCollection).Document(executionId).UpdateAsync(new Dictionary<string, object>
        {
            ["status"] = CampaignExecutionStatus.Completed,
            ["completedAt"] = DateTime.UtcNow,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken: cancellationToken);
    }

    public async Task MarkExecutionFailedAsync(string executionId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(ExecutionsCollection).Document(executionId).UpdateAsync(new Dictionary<string, object>
        {
            ["status"] = CampaignExecutionStatus.Failed,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken: cancellationToken);
    }
}
