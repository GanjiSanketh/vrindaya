namespace Vrindaya.Api.DTOs.InventoryManagement;

/// <summary>
/// Bundles GET .../dashboard's 5 optional filter query params — all
/// combinable (AND), unlike ProductQuery's mutually-exclusive filter rule.
/// </summary>
public record InventoryDashboardQuery(
    string? Category,
    string? SupplierId,
    string? CollectionId,
    DateTime? DateFrom,
    DateTime? DateTo);
