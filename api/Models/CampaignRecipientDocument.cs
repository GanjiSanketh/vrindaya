using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's campaignRecipients collection — see
/// web/src/app/features/marketing/models/campaign-recipient.model.ts for the
/// authoritative field list. Field names are case-sensitive and must match
/// exactly what the Angular app writes (camelCase).
/// </summary>
[FirestoreData]
public class CampaignRecipientDocument
{
    [FirestoreProperty("executionId")]
    public string ExecutionId { get; set; } = string.Empty;

    [FirestoreProperty("phoneNumber")]
    public string PhoneNumber { get; set; } = string.Empty;

    [FirestoreProperty("status")]
    public string Status { get; set; } = string.Empty;

    [FirestoreProperty("attempts")]
    public int Attempts { get; set; }
}
