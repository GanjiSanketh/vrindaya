namespace Vrindaya.Api.Constants;

/// <summary>
/// Computed, never stored — see InventoryManagementService's status
/// calculation (AvailableStock = CurrentStock - ReservedStock, compared
/// against LowStockThreshold). Exact spelling round-trips to the admin UI's
/// status badges.
/// </summary>
public static class InventoryStatus
{
    public const string OutOfStock = "OutOfStock";
    public const string Critical = "Critical";
    public const string Low = "Low";
    public const string Healthy = "Healthy";
}
