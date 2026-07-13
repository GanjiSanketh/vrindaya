namespace Vrindaya.Api.Constants;

/// <summary>
/// Mirrors web/src/app/features/marketing/models/campaign.model.ts's
/// CAMPAIGN_MEDIA_TYPES exactly — these are literal strings the Angular app
/// writes into Firestore. Keep both in sync; do not rename either side
/// independently. Deliberately distinct from the campaign's channel
/// (campaignType: WhatsApp/SMS/Email) — this only classifies what media
/// the campaign sends.
/// </summary>
public static class CampaignMediaType
{
    public const string Text = "Text";
    public const string Image = "Image";
    public const string Video = "Video";
    public const string Pdf = "PDF";
    public const string Mixed = "Mixed";
}
