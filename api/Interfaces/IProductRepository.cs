using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Pure Firestore data access for products — mirrors ICampaignDeliveryRepository's
/// separation of concerns: knows nothing about HTTP, Storage, or image
/// compression, only the products collection.
/// </summary>
public interface IProductRepository
{
    /// <summary>Client-side doc-id generation — no network write.</summary>
    string GenerateId();

    Task<PagedResult<(string Id, ProductDocument Data)>> GetPagedAsync(ProductQuery query, CancellationToken cancellationToken);

    Task<ProductDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    /// <summary>Unpaged — backs Inventory Dashboard aggregation (Category/Collection filter joins, Total Products), bounded by the catalog's realistic size, same accepted precedent as InventoryVariantRepository.GetAllUnpagedAsync.</summary>
    Task<List<(string Id, ProductDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);

    /// <summary>Firestore batch-get (db.GetAllAsync) — one round trip for N ids, not N calls. Used to resolve the homepage's curated Featured/Trending/New-Arrivals-override product-id lists. Missing/nonexistent ids are simply omitted, not an error.</summary>
    Task<List<(string Id, ProductDocument Data)>> GetByIdsAsync(List<string> ids, CancellationToken cancellationToken);

    Task CreateAsync(string id, ProductDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string id, Dictionary<string, object?> fields, CancellationToken cancellationToken);

    Task<int> CountBySlugAsync(string slug, CancellationToken cancellationToken);

    Task<int> CountBySkuAsync(string sku, CancellationToken cancellationToken);

    /// <summary>Single batched write (WriteBatch) — updates active/updatedBy/updatedAt on every id in one commit.</summary>
    Task BulkUpdateStatusAsync(List<string> ids, bool active, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Single batched write — clears deleted/deletedAt on every id in one commit. Active is left untouched (stays false, same as a single RestoreProductAsync).</summary>
    Task BulkRestoreAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Single batched write — sets one Featured/NewArrival/BestSeller flag to the given value on every id in one commit (mark or remove, depending on value).</summary>
    Task BulkUpdateFlagAsync(List<string> ids, ProductFlag flag, bool value, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Single batched write — the bulk counterpart of DeleteProductAsync (soft delete: deleted=true, active=false, deletedAt stamped).</summary>
    Task BulkSoftDeleteAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Permanently deletes the Firestore document. Storage cleanup is the caller's (ProductService's) responsibility — this method only ever touches Firestore.</summary>
    Task DeleteAsync(string id, CancellationToken cancellationToken);

    /// <summary>Always active-only (public-only query) — WhereArrayContainsAny("searchKeywords", tokens), ordered by displayOrder, same cursor-pagination shape as GetPagedAsync.</summary>
    Task<PagedResult<(string Id, ProductDocument Data)>> SearchAsync(List<string> tokens, int pageSize, string? cursor, CancellationToken cancellationToken);

    /// <summary>Per-item batched write — each id gets its own url+sku pair, unlike the shared-value bulk writes below, so this can't reuse a single shared update dict.</summary>
    Task BulkUpdateFlipkartUrlsAsync(List<BulkFlipkartUrlItem> items, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Single batched write — sets lifecycleStage/updatedBy/updatedAt on every id in one commit.</summary>
    Task BulkUpdateLifecycleStageAsync(List<string> ids, string stage, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Single batched write — sets lifecycleStage=ListedOnFlipkart + launchDate on every id in one commit.</summary>
    Task BulkLaunchAsync(List<string> ids, DateTime launchDate, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Atomic single-doc increment via FieldValue.Increment(1) + lastClickAt=server-now. Public/anonymous-triggered — no updatedBy stamp, this isn't an admin edit.</summary>
    Task IncrementWebsiteClickAsync(string id, CancellationToken cancellationToken);
}
