using System.Text.RegularExpressions;
using Vrindaya.Api.Common;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.InventoryManagement;

public class InventoryVariantRepository : IInventoryVariantRepository
{
    private const string Collection = "inventoryVariants";

    private readonly IFirebaseService _firebaseService;

    public InventoryVariantRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    /// <summary>Deterministic — a given product/color/size can have at most one variant record by construction, the same "id = natural key" trick as CategoryDocument's slug-as-id.</summary>
    public static string ComputeVariantId(string productId, string color, string size)
    {
        return $"{productId}__{Normalize(color)}__{Normalize(size)}";
    }

    private static string Normalize(string value)
    {
        var lowered = value.Trim().ToLowerInvariant();
        return Regex.Replace(lowered, "[^a-z0-9]+", "-").Trim('-');
    }

    public async Task<InventoryVariantDocument?> GetByIdAsync(string variantId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(variantId).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<InventoryVariantDocument>() : null;
    }

    public async Task<List<(string Id, InventoryVariantDocument Data)>> GetAllByProductIdAsync(string productId, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).WhereEqualTo("productId", productId).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<InventoryVariantDocument>())).ToList();
    }

    public async Task<PagedResult<(string Id, InventoryVariantDocument Data)>> GetAllAsync(string? cursor, int pageSize, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var baseQuery = db.Collection(Collection).OrderBy("updatedAt");

        var totalCountSnapshot = await baseQuery.Count().GetSnapshotAsync(cancellationToken);
        var totalCount = (int)(totalCountSnapshot.Count ?? 0);

        var orderedQuery = baseQuery;
        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorSnapshot = await db.Collection(Collection).Document(cursor).GetSnapshotAsync(cancellationToken);
            if (cursorSnapshot.Exists)
            {
                orderedQuery = orderedQuery.StartAfter(cursorSnapshot);
            }
        }

        var clampedPageSize = Math.Clamp(pageSize, 1, 100);
        var snapshot = await orderedQuery.Limit(clampedPageSize).GetSnapshotAsync(cancellationToken);
        var items = snapshot.Documents.Select(d => (d.Id, d.ConvertTo<InventoryVariantDocument>())).ToList();

        return new PagedResult<(string Id, InventoryVariantDocument Data)>
        {
            Items = items,
            NextCursor = items.Count == clampedPageSize ? items[^1].Id : null,
            TotalCount = totalCount,
        };
    }

    public async Task<List<(string Id, InventoryVariantDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<InventoryVariantDocument>())).ToList();
    }

    public async Task UpsertAsync(string variantId, InventoryVariantDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(variantId).SetAsync(document, cancellationToken: cancellationToken);
    }
}
