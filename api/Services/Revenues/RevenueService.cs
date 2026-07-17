using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Revenues;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;

namespace Vrindaya.Api.Services.Revenues;

public class RevenueService : IRevenueService
{
    private readonly IRevenueRepository _repository;
    private readonly IAuditLogService _auditLogService;

    public RevenueService(IRevenueRepository repository, IAuditLogService auditLogService)
    {
        _repository = repository;
        _auditLogService = auditLogService;
    }

    public async Task<RevenueResponse> GetAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Revenue", id);
        return ToResponse(id, doc);
    }

    public async Task<PagedResult<RevenueResponse>> GetAllAsync(
        string? cursor, int pageSize, string? search, string? source, string? status,
        DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken)
    {
        var page = await _repository.GetAllAsync(cursor, pageSize, search, source, status, dateFrom, dateTo, cancellationToken);
        return new PagedResult<RevenueResponse>
        {
            Items = page.Items.Select(x => ToResponse(x.Id, x.Data)).ToList(),
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        };
    }

    public async Task<RevenueResponse> CreateAsync(CreateRevenueRequest request, string createdBy, CancellationToken cancellationToken)
    {
        var revenueNumber = await _repository.GenerateNextRevenueNumberAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var doc = new RevenueDocument
        {
            RevenueNumber = revenueNumber,
            Source = request.Source,
            Amount = request.Amount,
            Reference = request.Reference,
            SettlementDate = request.SettlementDate.Kind == DateTimeKind.Utc ? request.SettlementDate : DateTime.SpecifyKind(request.SettlementDate, DateTimeKind.Utc),
            ExpectedSettlement = request.ExpectedSettlement,
            ActualSettlement = request.ActualSettlement,
            Status = request.Status,
            ProductId = request.ProductId,
            ProductName = request.ProductName,
            Notes = request.Notes,
            CreatedBy = createdBy,
            CreatedAt = now,
            UpdatedAt = now,
        };
        doc.SearchKeywords = BuildSearchKeywords(doc);

        var id = await _repository.CreateAsync(doc, cancellationToken);

        try { await _auditLogService.LogCreateAsync("Revenues", id, revenueNumber, AuditLogService.SerializeJson(doc), createdBy, null, null, $"Revenue '{revenueNumber}' created", null); } catch { }

        return ToResponse(id, doc);
    }

    public async Task<RevenueResponse> UpdateAsync(string id, UpdateRevenueRequest request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Revenue", id);

        var beforeData = AuditLogService.SerializeJson(existing);

        existing.Source = request.Source;
        existing.Amount = request.Amount;
        existing.Reference = request.Reference;
        existing.SettlementDate = request.SettlementDate.Kind == DateTimeKind.Utc ? request.SettlementDate : DateTime.SpecifyKind(request.SettlementDate, DateTimeKind.Utc);
        existing.ExpectedSettlement = request.ExpectedSettlement;
        existing.ActualSettlement = request.ActualSettlement;
        existing.Status = request.Status;
        existing.ProductId = request.ProductId;
        existing.ProductName = request.ProductName;
        existing.Notes = request.Notes;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.SearchKeywords = BuildSearchKeywords(existing);

        await _repository.UpdateAsync(id, existing, cancellationToken);

        try { await _auditLogService.LogUpdateAsync("Revenues", id, existing.RevenueNumber, beforeData, AuditLogService.SerializeJson(existing), null, null, null, $"Revenue '{existing.RevenueNumber}' updated", null); } catch { }

        return ToResponse(id, existing);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Revenue", id);

        await _repository.DeleteAsync(id, cancellationToken);

        try { await _auditLogService.LogDeleteAsync("Revenues", id, existing.RevenueNumber, null, null, null, null, $"Revenue '{existing.RevenueNumber}' deleted"); } catch { }
    }

    public async Task<RevenueSummaryResponse> GetMonthlySummaryAsync(int year, int? month, CancellationToken cancellationToken)
    {
        var all = await _repository.GetAllUnpagedAsync(cancellationToken);

        var filtered = all.Where(e =>
            e.Data.SettlementDate.Year == year &&
            (!month.HasValue || e.Data.SettlementDate.Month == month.Value))
            .ToList();

        var period = month.HasValue
            ? $"{year}-{month.Value:D2}"
            : $"{year}";

        return BuildSummary(period, filtered);
    }

    public async Task<RevenueSummaryResponse> GetYearlySummaryAsync(int year, CancellationToken cancellationToken)
    {
        var all = await _repository.GetAllUnpagedAsync(cancellationToken);

        var filtered = all.Where(e => e.Data.SettlementDate.Year == year).ToList();
        return BuildSummary($"{year}", filtered);
    }

    private static RevenueSummaryResponse BuildSummary(string period, List<(string Id, RevenueDocument Data)> revenues)
    {
        var totalAmount = revenues.Sum(e => e.Data.Amount);
        var totalExpected = revenues.Sum(e => e.Data.ExpectedSettlement);
        var totalActual = revenues.Where(e => e.Data.ActualSettlement.HasValue).Sum(e => e.Data.ActualSettlement!.Value);
        var pendingAmount = revenues.Where(e => e.Data.Status == RevenueStatus.Pending).Sum(e => e.Data.Amount);

        var sourceGroups = revenues
            .GroupBy(e => e.Data.Source)
            .Select(g => new RevenueSourceSummary
            {
                Source = g.Key,
                Amount = Math.Round(g.Sum(e => e.Data.Amount), 2),
                Count = g.Count(),
                Percentage = totalAmount > 0 ? Math.Round(g.Sum(e => e.Data.Amount) / totalAmount * 100, 1) : 0,
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        var statusGroups = revenues
            .GroupBy(e => e.Data.Status)
            .Select(g => new RevenueStatusSummary
            {
                Status = g.Key,
                Amount = Math.Round(g.Sum(e => e.Data.Amount), 2),
                Count = g.Count(),
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        return new RevenueSummaryResponse
        {
            Period = period,
            TotalAmount = Math.Round(totalAmount, 2),
            TotalExpected = Math.Round(totalExpected, 2),
            TotalActual = Math.Round(totalActual, 2),
            PendingAmount = Math.Round(pendingAmount, 2),
            Count = revenues.Count,
            SourceBreakdown = sourceGroups,
            StatusBreakdown = statusGroups,
        };
    }

    private static List<string> BuildSearchKeywords(RevenueDocument doc)
    {
        var raw = new[] { doc.RevenueNumber, doc.Source, doc.Reference, doc.Notes, doc.ProductName };
        return raw
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .SelectMany(v => v!.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Distinct()
            .ToList();
    }

    private static RevenueResponse ToResponse(string id, RevenueDocument doc) => new()
    {
        Id = id,
        RevenueNumber = doc.RevenueNumber,
        Source = doc.Source,
        Amount = doc.Amount,
        Reference = doc.Reference,
        SettlementDate = doc.SettlementDate,
        ExpectedSettlement = doc.ExpectedSettlement,
        ActualSettlement = doc.ActualSettlement,
        Status = doc.Status,
        ProductId = doc.ProductId,
        ProductName = doc.ProductName,
        Notes = doc.Notes,
        CreatedBy = doc.CreatedBy,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };
}
