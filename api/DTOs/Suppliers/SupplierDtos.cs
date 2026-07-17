using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Suppliers;

public class SupplierResponse
{
    public string Id { get; set; } = string.Empty;
    public string SupplierCode { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public string? Email { get; set; }
    public string? Gstin { get; set; }
    public string? Pan { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Pincode { get; set; }
    public string? BankDetails { get; set; }
    public string? PaymentTerms { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>SupplierCode/IsActive are never accepted here — SupplierCode is server-generated once at creation, IsActive is toggled only via the dedicated activate/deactivate endpoints (mirrors AdminUsersController's shape).</summary>
public class CreateSupplierRequest
{
    [Required]
    [MaxLength(160)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? ContactPerson { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(20)]
    public string? AlternatePhone { get; set; }

    [EmailAddress]
    [MaxLength(160)]
    public string? Email { get; set; }

    /// <summary>Basic 15-char alphanumeric shape check (not the full checksum) — blank is valid, a non-blank value must be exactly 15 alphanumeric characters. Must be unique across suppliers when non-blank — see SupplierService.EnsureUniqueGstinAsync.</summary>
    [RegularExpression(@"^$|^[0-9A-Z]{15}$", ErrorMessage = "GSTIN must be 15 alphanumeric characters.")]
    public string? Gstin { get; set; }

    [RegularExpression(@"^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$", ErrorMessage = "PAN must be in the format AAAAA0000A.")]
    public string? Pan { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(100)]
    public string? State { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(12)]
    public string? Pincode { get; set; }

    [MaxLength(500)]
    public string? BankDetails { get; set; }

    [MaxLength(200)]
    public string? PaymentTerms { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>Same editable fields as create — SupplierCode/IsActive/CreatedAt are immutable/out-of-band here too.</summary>
public class UpdateSupplierRequest : CreateSupplierRequest
{
}

public class SupplierStatsResponse
{
    public int TotalPurchases { get; set; }
    public double TotalAmountPurchased { get; set; }
    public int ProductsPurchased { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
}
