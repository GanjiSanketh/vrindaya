using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>Append-only ledger access — CreateAsync only, no update/delete method exists by design (a correction is a new movement, never an edit of history).</summary>
public interface IStockMovementRepository
{
    Task<string> CreateAsync(StockMovementDocument document, CancellationToken cancellationToken);

    /// <summary>Most recent N movements across all products — for the Inventory Dashboard's activity feed.</summary>
    Task<List<(string Id, StockMovementDocument Data)>> GetRecentAsync(int limit, CancellationToken cancellationToken);

    /// <summary>Every movement with CreatedAt within [from, to] — a single-field range query, no composite index needed. Backs the Inventory Dashboard's Inventory Trend/Low Stock Trend charts and Today's Stock Added card, bounded by the selected date window's realistic size.</summary>
    Task<List<(string Id, StockMovementDocument Data)>> GetAllInRangeAsync(DateTime from, DateTime to, CancellationToken cancellationToken);
}
