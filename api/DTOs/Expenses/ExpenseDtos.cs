using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Expenses;

public class ExpenseResponse
{
    public string Id { get; set; } = string.Empty;
    public string ExpenseNumber { get; set; } = string.Empty;
    public string ExpenseCategory { get; set; } = string.Empty;
    public string ExpenseType { get; set; } = string.Empty;
    public string? Vendor { get; set; }
    public string? Description { get; set; }
    public double Amount { get; set; }
    public double Gst { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
    public string PaymentStatus { get; set; } = Constants.ExpensePaymentStatus.Paid;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateExpenseRequest
{
    [Required]
    [AllowedValues(Constants.ExpensePaymentStatus.Paid, Constants.ExpensePaymentStatus.Pending,
        Constants.ExpensePaymentStatus.Cancelled)]
    public string PaymentStatus { get; set; } = Constants.ExpensePaymentStatus.Paid;

    [Required]
    [AllowedValues(Constants.ExpenseCategory.Advertisement, Constants.ExpenseCategory.Packaging,
        Constants.ExpenseCategory.Transportation, Constants.ExpenseCategory.Courier,
        Constants.ExpenseCategory.Office, Constants.ExpenseCategory.Salary,
        Constants.ExpenseCategory.Internet, Constants.ExpenseCategory.Electricity,
        Constants.ExpenseCategory.Software, Constants.ExpenseCategory.Marketplace,
        Constants.ExpenseCategory.Photography, Constants.ExpenseCategory.Miscellaneous)]
    public string ExpenseCategory { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ExpenseType { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Vendor { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [Range(0, double.MaxValue)]
    public double Amount { get; set; }

    [Range(0, double.MaxValue)]
    public double Gst { get; set; }

    [MaxLength(50)]
    public string? PaymentMethod { get; set; }

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    [MaxLength(100)]
    public string? InvoiceNumber { get; set; }

    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;

    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateExpenseRequest : CreateExpenseRequest
{
}

public class ExpenseSummaryResponse
{
    public string Period { get; set; } = string.Empty;
    public double TotalAmount { get; set; }
    public double TotalGst { get; set; }
    public int Count { get; set; }
    public List<ExpenseCategorySummary> CategoryBreakdown { get; set; } = [];
}

public class ExpenseCategorySummary
{
    public string Category { get; set; } = string.Empty;
    public double Amount { get; set; }
    public int Count { get; set; }
    public double Percentage { get; set; }
}
