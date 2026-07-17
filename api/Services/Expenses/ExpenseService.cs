using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Expenses;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;

namespace Vrindaya.Api.Services.Expenses;

public class ExpenseService : IExpenseService
{
    private readonly IExpenseRepository _repository;
    private readonly IAuditLogService _auditLogService;

    public ExpenseService(IExpenseRepository repository, IAuditLogService auditLogService)
    {
        _repository = repository;
        _auditLogService = auditLogService;
    }

    public async Task<ExpenseResponse> GetAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense", id);
        return ToResponse(id, doc);
    }

    public async Task<PagedResult<ExpenseResponse>> GetAllAsync(
        string? cursor, int pageSize, string? search, string? category,
        DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken)
    {
        var page = await _repository.GetAllAsync(cursor, pageSize, search, category, dateFrom, dateTo, cancellationToken);
        return new PagedResult<ExpenseResponse>
        {
            Items = page.Items.Select(x => ToResponse(x.Id, x.Data)).ToList(),
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    public async Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request, string createdBy, CancellationToken cancellationToken)
    {
        var expenseNumber = await _repository.GenerateNextExpenseNumberAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var doc = new ExpenseDocument
        {
            ExpenseNumber = expenseNumber,
            ExpenseCategory = request.ExpenseCategory,
            ExpenseType = request.ExpenseType,
            Vendor = request.Vendor,
            Description = request.Description,
            Amount = request.Amount,
            Gst = request.Gst,
            PaymentMethod = request.PaymentMethod,
            ReferenceNumber = request.ReferenceNumber,
            InvoiceNumber = request.InvoiceNumber,
            ExpenseDate = request.ExpenseDate.Kind == DateTimeKind.Utc ? request.ExpenseDate : DateTime.SpecifyKind(request.ExpenseDate, DateTimeKind.Utc),
            Notes = request.Notes,
            PaymentStatus = request.PaymentStatus,
            CreatedBy = createdBy,
            CreatedAt = now,
            UpdatedAt = now,
        };
        doc.SearchKeywords = BuildSearchKeywords(doc);

        var id = await _repository.CreateAsync(doc, cancellationToken);

        try { await _auditLogService.LogCreateAsync("Expenses", id, expenseNumber, AuditLogService.SerializeJson(doc), createdBy, null, null, $"Expense '{expenseNumber}' created", null); } catch { }

        return ToResponse(id, doc);
    }

    public async Task<ExpenseResponse> UpdateAsync(string id, UpdateExpenseRequest request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense", id);

        var beforeData = AuditLogService.SerializeJson(existing);

        existing.ExpenseCategory = request.ExpenseCategory;
        existing.ExpenseType = request.ExpenseType;
        existing.Vendor = request.Vendor;
        existing.Description = request.Description;
        existing.Amount = request.Amount;
        existing.Gst = request.Gst;
        existing.PaymentMethod = request.PaymentMethod;
        existing.ReferenceNumber = request.ReferenceNumber;
        existing.InvoiceNumber = request.InvoiceNumber;
        existing.ExpenseDate = request.ExpenseDate.Kind == DateTimeKind.Utc ? request.ExpenseDate : DateTime.SpecifyKind(request.ExpenseDate, DateTimeKind.Utc);
        existing.Notes = request.Notes;
        existing.PaymentStatus = request.PaymentStatus;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.SearchKeywords = BuildSearchKeywords(existing);

        await _repository.UpdateAsync(id, existing, cancellationToken);

        try { await _auditLogService.LogUpdateAsync("Expenses", id, existing.ExpenseNumber, beforeData, AuditLogService.SerializeJson(existing), null, null, null, $"Expense '{existing.ExpenseNumber}' updated", null); } catch { }

        return ToResponse(id, existing);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense", id);

        await _repository.DeleteAsync(id, cancellationToken);

        try { await _auditLogService.LogDeleteAsync("Expenses", id, existing.ExpenseNumber, null, null, null, null, $"Expense '{existing.ExpenseNumber}' deleted"); } catch { }
    }

    public async Task<ExpenseSummaryResponse> GetMonthlySummaryAsync(int year, int? month, CancellationToken cancellationToken)
    {
        var all = await _repository.GetAllUnpagedAsync(cancellationToken);

        var filtered = all.Where(e =>
            e.Data.ExpenseDate.Year == year &&
            (!month.HasValue || e.Data.ExpenseDate.Month == month.Value))
            .ToList();

        var period = month.HasValue
            ? $"{year}-{month.Value:D2}"
            : $"{year}";

        return BuildSummary(period, filtered);
    }

    public async Task<ExpenseSummaryResponse> GetYearlySummaryAsync(int year, CancellationToken cancellationToken)
    {
        var all = await _repository.GetAllUnpagedAsync(cancellationToken);

        var filtered = all.Where(e => e.Data.ExpenseDate.Year == year).ToList();
        return BuildSummary($"{year}", filtered);
    }

    private static ExpenseSummaryResponse BuildSummary(string period, List<(string Id, ExpenseDocument Data)> expenses)
    {
        var totalAmount = expenses.Sum(e => e.Data.Amount);
        var totalGst = expenses.Sum(e => e.Data.Gst);

        var categoryGroups = expenses
            .GroupBy(e => e.Data.ExpenseCategory)
            .Select(g => new ExpenseCategorySummary
            {
                Category = g.Key,
                Amount = Math.Round(g.Sum(e => e.Data.Amount), 2),
                Count = g.Count(),
                Percentage = totalAmount > 0 ? Math.Round(g.Sum(e => e.Data.Amount) / totalAmount * 100, 1) : 0,
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        return new ExpenseSummaryResponse
        {
            Period = period,
            TotalAmount = Math.Round(totalAmount, 2),
            TotalGst = Math.Round(totalGst, 2),
            Count = expenses.Count,
            CategoryBreakdown = categoryGroups,
        };
    }

    private static List<string> BuildSearchKeywords(ExpenseDocument doc)
    {
        var raw = new[] { doc.ExpenseNumber, doc.ExpenseCategory, doc.ExpenseType, doc.Vendor, doc.Description, doc.InvoiceNumber, doc.ReferenceNumber, doc.PaymentStatus };
        return raw
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .SelectMany(v => v!.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Distinct()
            .ToList();
    }

    private static ExpenseResponse ToResponse(string id, ExpenseDocument doc) => new()
    {
        Id = id,
        ExpenseNumber = doc.ExpenseNumber,
        ExpenseCategory = doc.ExpenseCategory,
        ExpenseType = doc.ExpenseType,
        Vendor = doc.Vendor,
        Description = doc.Description,
        Amount = doc.Amount,
        Gst = doc.Gst,
        PaymentMethod = doc.PaymentMethod,
        ReferenceNumber = doc.ReferenceNumber,
        InvoiceNumber = doc.InvoiceNumber,
        ExpenseDate = doc.ExpenseDate,
        Notes = doc.Notes,
        PaymentStatus = doc.PaymentStatus,
        CreatedBy = doc.CreatedBy,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };
}
