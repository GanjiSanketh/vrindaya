namespace Vrindaya.Api.Constants;

public static class SyncStatus
{
    public const string NotSynced = "Not Synced";
    public const string Pending = "Pending";
    public const string InSync = "In Sync";
    public const string SyncFailed = "Sync Failed";

    public static readonly string[] All = [NotSynced, Pending, InSync, SyncFailed];
}
