namespace Vrindaya.Api.Constants;

/// <summary>
/// Mirrors web/src/app/features/marketing/models/campaign-recipient.model.ts's
/// RECIPIENT_STATUSES exactly — these are literal strings the Angular app
/// writes into Firestore. Keep both in sync; do not rename either side
/// independently.
/// </summary>
public static class CampaignRecipientStatus
{
    public const string Queued = "QUEUED";
    public const string Sending = "SENDING";
    public const string Sent = "SENT";
    public const string Delivered = "DELIVERED";
    public const string Read = "READ";
    public const string Failed = "FAILED";
}
