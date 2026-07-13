namespace Vrindaya.Api.Constants;

/// <summary>
/// Mirrors web/src/app/features/marketing/models/campaign-execution.model.ts's
/// EXECUTION_STATUSES exactly — these are literal strings the Angular app
/// writes into Firestore. Keep both in sync; do not rename either side
/// independently.
/// </summary>
public static class CampaignExecutionStatus
{
    public const string Queued = "QUEUED";
    public const string InProgress = "IN_PROGRESS";
    public const string Completed = "COMPLETED";
    public const string Failed = "FAILED";
    public const string Cancelled = "CANCELLED";
}
