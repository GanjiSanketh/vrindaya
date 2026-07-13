using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's campaignExecutions collection — see
/// web/src/app/features/marketing/models/campaign-execution.model.ts for the
/// authoritative field list. Field names are case-sensitive and must match
/// exactly what the Angular app writes (camelCase).
/// </summary>
[FirestoreData]
public class CampaignExecutionDocument
{
    [FirestoreProperty("campaignId")]
    public string CampaignId { get; set; } = string.Empty;

    [FirestoreProperty("status")]
    public string Status { get; set; } = string.Empty;

    [FirestoreProperty("totalRecipients")]
    public int TotalRecipients { get; set; }

    [FirestoreProperty("processedRecipients")]
    public int ProcessedRecipients { get; set; }

    [FirestoreProperty("successfulRecipients")]
    public int SuccessfulRecipients { get; set; }

    [FirestoreProperty("failedRecipients")]
    public int FailedRecipients { get; set; }
}
