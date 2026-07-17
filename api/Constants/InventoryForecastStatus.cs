namespace Vrindaya.Api.Constants;

/// <summary>
/// Forecast-level statuses — extends the base InventoryStatus with Overstock
/// for the inventory forecasting module. Eventually replaces the simpler
/// 4-value InventoryStatus when the migration is complete.
/// </summary>
public static class InventoryForecastStatus
{
    public const string OutOfStock = "OutOfStock";
    public const string Critical = "Critical";
    public const string Low = "Low";
    public const string Healthy = "Healthy";
    public const string Overstock = "Overstock";
}
