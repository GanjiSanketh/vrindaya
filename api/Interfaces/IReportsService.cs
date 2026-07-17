using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Reports;

namespace Vrindaya.Api.Interfaces;

public interface IReportsService
{
    Task<PagedResult<InventoryValuationRow>> GetInventoryValuationAsync(ReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<StockSummaryRow>> GetStockSummaryAsync(ReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<SupplierReportRow>> GetSupplierReportAsync(ReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<PurchaseReportRow>> GetPurchaseReportAsync(ReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<DeadStockRow>> GetDeadStockReportAsync(ReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<LowStockReportRow>> GetLowStockReportAsync(ReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<MovementReportRow>> GetMovementReportAsync(ReportQuery query, CancellationToken cancellationToken);

    Task<string> ExportCsvAsync(string reportType, ReportQuery query, CancellationToken cancellationToken);
}
