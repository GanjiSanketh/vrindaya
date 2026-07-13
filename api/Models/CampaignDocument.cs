using Google.Cloud.Firestore;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's campaigns collection — see
/// web/src/app/features/marketing/models/campaign.model.ts. Only the fields
/// CampaignDeliveryWorker actually needs (what to send, and which of the
/// media message types to send it as) are mapped; add more only when a
/// real consumer needs them. thumbnailUrl/footer/buttonText are
/// deliberately NOT mapped — they're display-only in Angular, never sent
/// to Meta by any message type this worker supports.
/// </summary>
[FirestoreData]
public class CampaignDocument
{
    [FirestoreProperty("message")]
    public string Message { get; set; } = string.Empty;

    [FirestoreProperty("mediaType")]
    public string MediaType { get; set; } = CampaignMediaType.Text;

    [FirestoreProperty("imageUrl")]
    public string? ImageUrl { get; set; }

    [FirestoreProperty("videoUrl")]
    public string? VideoUrl { get; set; }

    [FirestoreProperty("documentUrl")]
    public string? DocumentUrl { get; set; }

    [FirestoreProperty("caption")]
    public string? Caption { get; set; }
}
