namespace Vrindaya.Api.Constants;

public static class RevenueStatus
{
    public const string Paid = "Paid";
    public const string Pending = "Pending";
    public const string Failed = "Failed";

    public static readonly string[] All = [Paid, Pending, Failed];
}
