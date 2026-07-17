namespace Vrindaya.Api.Constants;

public static class ListingStatus
{
    public const string Draft = "Draft";
    public const string Ready = "Ready";
    public const string Published = "Published";
    public const string Rejected = "Rejected";
    public const string Inactive = "Inactive";
    public const string Archived = "Archived";

    public static readonly string[] All = [Draft, Ready, Published, Rejected, Inactive, Archived];
}
