using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Orchestrates product reads/writes — the only service ProductController
/// talks to. Composes IProductValidationService internally. Deliberately
/// takes a plain `isAdmin` bool rather than a
/// ClaimsPrincipal, keeping this interface decoupled from ASP.NET Core's
/// HTTP/auth types — the controller is responsible for that translation.
/// </summary>
public interface IProductService
{
    /// <summary>Local Firestore doc-id generation — no network write. Used by POST /products/ids.</summary>
    string GenerateId();

    /// <summary>Non-admins are always forced to active-only, regardless of what query.ActiveOnly was set to.</summary>
    Task<PagedProductsResponse> GetProductsAsync(ProductQuery query, bool isAdmin, CancellationToken cancellationToken);

    /// <summary>Throws ProductNotFoundException (404, not 403) if missing OR inactive-and-caller-isn't-admin — avoids leaking draft existence.</summary>
    Task<ProductDetailResponse> GetProductByIdAsync(string id, bool isAdmin, CancellationToken cancellationToken);

    /// <summary>Returns variant image metadata only — never downloads or transforms images. Lightweight alternative to GetProductByIdAsync when only images are needed. Throws ProductNotFoundException if the product doesn't exist.</summary>
    Task<ProductImagesResponse> GetProductImagesAsync(string id, bool isAdmin, CancellationToken cancellationToken);

    Task<ProductDetailResponse> CreateProductAsync(CreateProductRequest request, string createdBy, CancellationToken cancellationToken);

    Task<ProductDetailResponse> UpdateProductAsync(string id, UpdateProductRequest request, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Soft delete — sets deleted=true and active=false. Never touches Storage.</summary>
    Task DeleteProductAsync(string id, CancellationToken cancellationToken);

    /// <summary>Clears the soft-delete flag. Active deliberately stays false — the admin must reactivate explicitly.</summary>
    Task RestoreProductAsync(string id, string updatedBy, CancellationToken cancellationToken);

    Task BulkUpdateStatusAsync(List<string> ids, bool active, string updatedBy, CancellationToken cancellationToken);

    Task BulkRestoreAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Bulk mark/remove — sets one Featured/NewArrival/BestSeller flag to value on every id.</summary>
    Task BulkUpdateFlagAsync(List<string> ids, ProductFlag flag, bool value, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Bulk counterpart of DeleteProductAsync — soft delete, Storage untouched, fully restorable.</summary>
    Task BulkSoftDeleteAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken);

    /// <summary>
    /// Irreversible: deletes the Firestore document AND every variant plus
    /// every image (product gallery + variant images) from Cloudinary, then
    /// sweeps the product's Cloudinary folder for orphaned uploads. Returns a
    /// structured response (not 204) so the caller can show a success message.
    /// </summary>
    Task<DeleteProductResponse> PermanentlyDeleteProductAsync(string id, string deletedBy, CancellationToken cancellationToken);

    /// <summary>
    /// Copies a product end-to-end — every field except CreatedAt/UpdatedAt/
    /// CreatedBy/UpdatedBy (server-assigned fresh) and Slug/Sku (suffixed to
    /// stay unique) — including its Storage images, which are server-side
    /// copied into the new product's own folder rather than shared by
    /// reference. The duplicate is always created inactive (Active=false)
    /// regardless of the source's status, so it never silently republishes.
    /// </summary>
    Task<ProductDetailResponse> DuplicateProductAsync(string id, string createdBy, CancellationToken cancellationToken);

    Task UpdateStatusAsync(string id, bool active, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Public-only, always active-only — tokenizes the query and matches against each product's precomputed SearchKeywords.</summary>
    Task<PagedProductsResponse> SearchProductsAsync(string query, int pageSize, string? cursor, CancellationToken cancellationToken);

    /// <summary>Resolves an admin-curated, ordered id list (Featured/Trending/New-Arrivals-override collections) to summaries — preserves the given order, silently drops missing/inactive ids.</summary>
    Task<List<ProductSummaryResponse>> GetSummariesByIdsAsync(List<string> ids, CancellationToken cancellationToken);

    /// <summary>Single-product edit of every Flipkart Operations field (launch/sync dates, marketplace price/mrp/discount/category/tags, seller sku/fsn, and the pre-existing url/product-id). Independent of the main product CRUD. Lifecycle stage is no longer part of this — see ILifecycleService.</summary>
    Task UpdateFlipkartOpsAsync(string id, UpdateFlipkartOpsRequest request, string updatedBy, CancellationToken cancellationToken);

    Task BulkUpdateFlipkartUrlsAsync(List<BulkFlipkartUrlItem> items, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Sets LifecycleStage=ListedOnFlipkart + LaunchDate (defaults to UtcNow when omitted) on every id.</summary>
    Task BulkLaunchAsync(List<string> ids, DateTime? launchDate, string updatedBy, CancellationToken cancellationToken);
}
