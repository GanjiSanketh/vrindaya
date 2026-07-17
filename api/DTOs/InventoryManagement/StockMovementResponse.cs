namespace Vrindaya.Api.DTOs.InventoryManagement;

public class StockMovementResponse
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
    public string MovementType { get; set; } = string.Empty;
    public long Quantity { get; set; }

    /// <summary>Signed — positive means stock increased, negative means it decreased. 0 on movements recorded before this field existed.</summary>
    public long Delta { get; set; }

    public string? Reason { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
