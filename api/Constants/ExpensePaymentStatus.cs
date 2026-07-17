namespace Vrindaya.Api.Constants;

public static class ExpensePaymentStatus
{
    public const string Paid = "Paid";
    public const string Pending = "Pending";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All = [Paid, Pending, Cancelled];
}
