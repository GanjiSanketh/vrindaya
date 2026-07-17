using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.DTOs.InventoryManagement;

public class CreatePurchaseEntryRequest
{
    [Required]
    [MaxLength(120)]
    public string Supplier { get; set; } = string.Empty;

    /// <summary>Optional — set when the purchase is linked to a Supplier Management record. Free-text Supplier above is always stamped regardless, for display/backward compatibility.</summary>
    public string? SupplierId { get; set; }

    [Required]
    [MaxLength(64)]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Required]
    public DateTime InvoiceDate { get; set; }

    [Required]
    public DateTime PurchaseDate { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [Required]
    [AllowedValues(PurchaseStatus.Draft, PurchaseStatus.Confirmed, PurchaseStatus.Cancelled)]
    public string Status { get; set; } = PurchaseStatus.Draft;

    [Required]
    [MinLength(1)]
    public List<PurchaseEntryItemRequest> Items { get; set; } = [];
}

/// <summary>Same shape as create — a purchase's header and items are always replaced wholesale on edit (see InventoryManagementService.UpdatePurchaseAsync), never patched field-by-field.</summary>
public class UpdatePurchaseEntryRequest : CreatePurchaseEntryRequest
{
}

public class PurchaseEntryItemRequest
{
    [Required]
    public string ProductId { get; set; } = string.Empty;

    /// <summary>Required — every purchased unit now posts to a specific (ProductId, Color, Size) variant; see InventoryVariantDocument.</summary>
    [Required]
    [MaxLength(60)]
    public string Color { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Size { get; set; } = string.Empty;

    [Range(1, long.MaxValue)]
    public long Quantity { get; set; }

    [Range(0, double.MaxValue)]
    public double PurchasePrice { get; set; }

    [Range(0, double.MaxValue)]
    public double Discount { get; set; }

    [Range(0, 100)]
    public double Gst { get; set; }

    [Range(0, 100)]
    public double Tax { get; set; }
}

public class PurchaseEntryResponse
{
    public string Id { get; set; } = string.Empty;
    public string Supplier { get; set; } = string.Empty;
    public string? SupplierId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? Remarks { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<PurchaseEntryItemResponse> Items { get; set; } = [];
    public double TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

public class PurchaseEntryItemResponse
{
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
    public long Quantity { get; set; }
    public double PurchasePrice { get; set; }
    public double Discount { get; set; }
    public double Gst { get; set; }
    public double Tax { get; set; }
    public double Total { get; set; }
}
