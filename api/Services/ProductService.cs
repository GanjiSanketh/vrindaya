using Google.Cloud.Firestore;
using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _repository;
    private readonly IProductValidationService _validationService;
    private readonly IProductVariantRepository _variantRepository;
    private readonly ICloudinaryService _cloudinary;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        IProductRepository repository,
        IProductValidationService validationService,
        IProductVariantRepository variantRepository,
        ICloudinaryService cloudinary,
        ILogger<ProductService> logger)
    {
        _repository = repository;
        _validationService = validationService;
        _variantRepository = variantRepository;
        _cloudinary = cloudinary;
        _logger = logger;
    }

    public string GenerateId() => _repository.GenerateId();

    public async Task<PagedProductsResponse> GetProductsAsync(ProductQuery query, bool isAdmin, CancellationToken cancellationToken)
    {
        if (!isAdmin)
        {
            // Deleted/ActiveStatus/Search are admin-list-only concepts —
            // Deleted specifically switches the repository to an entirely
            // different filter path (BuildAdminFilters) that has no notion
            // of ActiveOnly at all, so leaving it settable here would let an
            // unauthenticated caller request deleted=true and read
            // soft-deleted/draft product data. Force the untouched public
            // path (BuildPublicFilters, ActiveOnly=true) regardless of what
            // the caller sent. MinPrice/MaxPrice/InStockOnly are safe to
            // leave as-is — they're the public Shop page's Price/Availability
            // filters, resolved through BuildPublicFilters same as Category/
            // Featured/NewArrival/BestSeller, and never leak anything beyond
            // active products.
            query.ActiveOnly = true;
            query.Deleted = null;
            query.ActiveStatus = null;
            query.Search = null;
        }

        var result = await _repository.GetPagedAsync(query, cancellationToken);
        var summaries = result.Items.Select(x => ToSummary(x.Id, x.Data)).ToList();

        // Backfill PurchaseCost (minimum across all colour variants) and, for
        // products that don't have thumbnailUrl denormalized yet, the thumbnail
        // from the first active variant. Both need the variants subcollection —
        // loaded once per product here so list queries never add it to the
        // product document query itself.
        if (summaries.Count > 0)
        {
            var needsVariantData = summaries
                .Where(s => s.PurchaseCost == null || s.Thumbnail == null)
                .Select(s => s.Id)
                .Distinct()
                .ToList();

            if (needsVariantData.Count > 0)
            {
                var tasks = needsVariantData.Select(async id =>
                {
                    try
                    {
                        var variants = await _variantRepository.GetVariantsAsync(id, cancellationToken);
                        var minPurchaseCost = variants
                            .Select(v => v.Data.PurchaseCost)
                            .Where(p => p.HasValue)
                            .Min();
                        var firstActive = variants
                            .Select(v => v.Data)
                            .FirstOrDefault(v => v.IsActive);
                        var url = firstActive?.Images?.Primary?.Url
                            ?? firstActive?.Images?.Gallery?.FirstOrDefault()?.Url;
                        return (Id: id, MinPurchaseCost: minPurchaseCost, ThumbUrl: url);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to load variants for product {ProductId}", id);
                        return (Id: id, MinPurchaseCost: (double?)null, ThumbUrl: (string?)null);
                    }
                });
                var variantResults = await Task.WhenAll(tasks);
                var purchaseCostMap = variantResults
                    .Where(r => r.MinPurchaseCost.HasValue)
                    .ToDictionary(r => r.Id, r => r.MinPurchaseCost!.Value);
                var thumbMap = variantResults
                    .Where(r => r.ThumbUrl != null)
                    .ToDictionary(r => r.Id, r => r.ThumbUrl!);

                for (var i = 0; i < summaries.Count; i++)
                {
                    if (purchaseCostMap.TryGetValue(summaries[i].Id, out var pc))
                        summaries[i].PurchaseCost = pc;
                    if (summaries[i].Thumbnail == null && thumbMap.TryGetValue(summaries[i].Id, out var url))
                        summaries[i].Thumbnail = new ProductImageDto { Url = url };
                }
            }
        }

        _logger.LogInformation("GetProductsAsync: returning {Count} items (total={Total})", summaries.Count, result.TotalCount);

        return new PagedProductsResponse
        {
            Items = summaries,
            NextCursor = result.NextCursor,
            TotalCount = result.TotalCount,
        };
    }

    public async Task<ProductDetailResponse> GetProductByIdAsync(string id, bool isAdmin, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Entering GetProductByIdAsync for product {ProductId}", id);

        var doc = await _repository.GetByIdAsync(id, cancellationToken);
        _logger.LogDebug("Product document loaded for {ProductId}, exists={Exists}", id, doc != null);

        // 404 (not 403) when inactive + non-admin — doesn't leak draft existence to the public.
        if (doc == null || (!doc.Active && !isAdmin))
        {
            _logger.LogWarning("Product {ProductId} not found or inactive for non-admin", id);
            throw new ProductNotFoundException(id);
        }

        var result = await ToDetailWithVariants(id, doc, cancellationToken);
        _logger.LogInformation("Returning detail for product {ProductId} with {Count} variants", id, result.Variants.Count);
        return result;
    }

    public async Task<ProductImagesResponse> GetProductImagesAsync(string id, bool isAdmin, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Entering GetProductImagesAsync for product {ProductId}", id);

        var doc = await _repository.GetByIdAsync(id, cancellationToken);
        if (doc == null || (!doc.Active && !isAdmin))
            throw new ProductNotFoundException(id);

        _logger.LogDebug("Loading variants for product {ProductId}", id);
        var variantTuples = await _variantRepository.GetVariantsAsync(id, cancellationToken);

        var variants = variantTuples
            .Select(t => new VariantImageGroup
            {
                VariantId = t.Id,
                ColourName = t.Data.ColourName,
                Images = ToVariantImageResponse(t.Data.Images),
            })
            .ToList();

        _logger.LogInformation("Loaded {Count} variant image groups for product {ProductId}", variants.Count, id);
        return new ProductImagesResponse { ProductId = id, Variants = variants };
    }

    public async Task<ProductDetailResponse> CreateProductAsync(CreateProductRequest request, string createdBy, CancellationToken cancellationToken)
    {
        await EnsureUniqueAsync(request.Slug, null, excludeId: null, cancellationToken);

        var now = DateTime.UtcNow;

        var document = new ProductDocument
        {
            Name = request.Name,
            Slug = request.Slug,
            Category = request.Category,
            SubCategory = request.SubCategory,
            Description = request.Description,
            ShortDescription = request.ShortDescription,
            Fabric = request.Fabric,
            Pattern = request.Pattern,
            Fit = request.Fit,
            Sleeve = request.Sleeve,
            Neck = request.Neck,
            Occasion = request.Occasion,
            WashCare = request.WashCare,
            Tags = request.Tags,
            Featured = request.Featured,
            NewArrival = request.NewArrival,
            BestSeller = request.BestSeller,
            Active = request.Active,
            DisplayOrder = request.DisplayOrder,
            CreatedBy = createdBy,
            CreatedAt = now,
            UpdatedBy = createdBy,
            UpdatedAt = now,
            Images = request.Images.Select(ToImageDocument).ToList(),
            Brand = request.Brand ?? string.Empty,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
            SeoKeywords = request.SeoKeywords,
            SearchKeywords = BuildSearchKeywords(request.Name, request.Brand, request.Category, null, request.Tags),
            Pricing = ToPricingDocument(request.Pricing),
            LowStockThreshold = request.LowStockThreshold,
            AutoHideWhenOutOfStock = request.AutoHideWhenOutOfStock,
        };

        await _repository.CreateAsync(request.Id, document, cancellationToken);
        await SyncVariantsAsync(request.Id, request.Variants, cancellationToken);

        var created = await _repository.GetByIdAsync(request.Id, cancellationToken) ?? throw new ProductNotFoundException(request.Id);
        return await ToDetailWithVariants(request.Id, created, cancellationToken);
    }

    public async Task<ProductDetailResponse> UpdateProductAsync(string id, UpdateProductRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        await EnsureUniqueAsync(request.Slug, null, excludeId: id, cancellationToken);

        await _repository.UpdateAsync(id, new Dictionary<string, object?>
        {
            ["name"] = request.Name,
            ["slug"] = request.Slug,
            ["category"] = request.Category,
            ["subCategory"] = OptionalField(request.SubCategory),
            ["description"] = OptionalField(request.Description),
            ["shortDescription"] = OptionalField(request.ShortDescription),
            ["fabric"] = OptionalField(request.Fabric),
            ["pattern"] = OptionalField(request.Pattern),
            ["fit"] = OptionalField(request.Fit),
            ["sleeve"] = OptionalField(request.Sleeve),
            ["neck"] = OptionalField(request.Neck),
            ["occasion"] = OptionalField(request.Occasion),
            ["washCare"] = OptionalField(request.WashCare),
            ["pricing"] = request.Pricing != null ? ToPricingDict(request.Pricing) : FieldValue.Delete,
            ["tags"] = request.Tags,
            ["featured"] = request.Featured,
            ["newArrival"] = request.NewArrival,
            ["bestSeller"] = request.BestSeller,
            ["active"] = request.Active,
            ["displayOrder"] = request.DisplayOrder,
            ["images"] = request.Images.Select(ToImageDocument).ToList(),
            ["brand"] = request.Brand ?? string.Empty,
            ["seoTitle"] = OptionalField(request.SeoTitle),
            ["seoDescription"] = OptionalField(request.SeoDescription),
            ["seoKeywords"] = request.SeoKeywords,
            ["searchKeywords"] = BuildSearchKeywords(request.Name, request.Brand, request.Category, null, request.Tags),
            ["lowStockThreshold"] = request.LowStockThreshold.HasValue ? request.LowStockThreshold.Value : FieldValue.Delete,
            ["autoHideWhenOutOfStock"] = request.AutoHideWhenOutOfStock,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);

        await SyncVariantsAsync(id, request.Variants, cancellationToken);

        var updated = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new ProductNotFoundException(id);
        return await ToDetailWithVariants(id, updated, cancellationToken);
    }

    /// <summary>
    /// Soft delete: sets deleted=true alongside active=false (so public
    /// active-only queries need no separate "deleted" index dimension) and
    /// records deletedAt. Storage is never touched — see RestoreProductAsync.
    /// </summary>
    public async Task DeleteProductAsync(string id, CancellationToken cancellationToken)
    {
        await _repository.UpdateAsync(id, new Dictionary<string, object?>
        {
            ["deleted"] = true,
            ["active"] = false,
            ["deletedAt"] = DateTime.UtcNow,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);

        await _variantRepository.DeleteAllVariantsAsync(id, cancellationToken);
    }

    /// <summary>Clears the soft-delete flag. Active deliberately stays false — restoring never silently republishes a product; the admin must reactivate it explicitly.</summary>
    public async Task RestoreProductAsync(string id, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.UpdateAsync(id, new Dictionary<string, object?>
        {
            ["deleted"] = false,
            ["deletedAt"] = FieldValue.Delete,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);
    }

    public async Task BulkUpdateStatusAsync(List<string> ids, bool active, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkUpdateStatusAsync(ids, active, updatedBy, cancellationToken);
    }

    public async Task BulkRestoreAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkRestoreAsync(ids, updatedBy, cancellationToken);
    }

    public async Task BulkUpdateFlagAsync(List<string> ids, ProductFlag flag, bool value, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkUpdateFlagAsync(ids, flag, value, updatedBy, cancellationToken);
    }

    public async Task BulkSoftDeleteAsync(List<string> ids, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkSoftDeleteAsync(ids, updatedBy, cancellationToken);
    }

    public async Task<DeleteProductResponse> PermanentlyDeleteProductAsync(string id, string deletedBy, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new ProductNotFoundException(id);
        var productName = doc.Name;

        // Step 1: Read all variants
        var variants = await _variantRepository.GetVariantsAsync(id, cancellationToken);

        // Step 2: Collect every Cloudinary publicId (product gallery + variant images)
        var productImageIds = doc.Images.Select(i => i.PublicId).Where(pid => pid.Length > 0).ToList();
        var variantPublicIds = new List<string>();
        foreach (var (_, variant) in variants)
        {
            variantPublicIds.AddRange(GetImagePublicIds(variant.Images));
        }
        var allPublicIds = productImageIds.Concat(variantPublicIds).ToList();
        var variantCount = variants.Count;
        var imageCount = allPublicIds.Count;
        var cloudinaryFailures = 0;

        // Step 3: Delete every Cloudinary image (best-effort — never block
        // Firestore cleanup because one image failed)
        foreach (var publicId in allPublicIds)
        {
            try
            {
                await _cloudinary.DeleteImageAsync(publicId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete Cloudinary image {PublicId} for product {ProductId}", publicId, id);
                cloudinaryFailures++;
            }
        }

        // Step 4: Delete every variant document
        await _variantRepository.DeleteAllVariantsAsync(id, cancellationToken);

        // Step 5: Delete product document
        await _repository.DeleteAsync(id, cancellationToken);

        // Logging — complete audit trail
        _logger.LogInformation(
            "Product permanently deleted: ProductId={ProductId}, ProductName={ProductName}, DeletedBy={DeletedBy}, " +
            "DeletedAt={DeletedAt}, VariantsDeleted={VariantCount}, ImagesDeleted={ImageCount}, CloudinaryFailures={CloudinaryFailures}",
            id, productName, deletedBy, DateTime.UtcNow, variantCount, imageCount, cloudinaryFailures);

        return new DeleteProductResponse
        {
            Success = true,
            Message = "Product deleted successfully.",
        };
    }

    public async Task<ProductDetailResponse> DuplicateProductAsync(string id, string createdBy, CancellationToken cancellationToken)
    {
        var source = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new ProductNotFoundException(id);

        var newId = _repository.GenerateId();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var newSlug = $"{source.Slug}-copy-{suffix}";
        var newSku = $"{source.Sku}-COPY-{suffix}".ToUpperInvariant();
        var now = DateTime.UtcNow;

        var document = new ProductDocument
        {
            Name = $"{source.Name} (Copy)",
            Slug = newSlug,
            Category = source.Category,
            SubCategory = source.SubCategory,
            Description = source.Description,
            ShortDescription = source.ShortDescription,
            Price = source.Price,
            Mrp = source.Mrp,
            Discount = source.Discount,
            Fabric = source.Fabric,
            Pattern = source.Pattern,
            Fit = source.Fit,
            Sleeve = source.Sleeve,
            Neck = source.Neck,
            Occasion = source.Occasion,
            Color = source.Color,
            WashCare = source.WashCare,
            Sizes = source.Sizes.Select(s => new ProductSizeDocument { Size = s.Size, Stock = s.Stock }).ToList(),
            Stock = source.Stock,
            Sku = newSku,
            Tags = source.Tags,
            Featured = source.Featured,
            NewArrival = source.NewArrival,
            BestSeller = source.BestSeller,
            // Deliberately always false, regardless of the source's status —
            // a duplicate never silently republishes (same reasoning as
            // RestoreProductAsync leaving Active false).
            Active = false,
            DisplayOrder = source.DisplayOrder,
            CreatedBy = createdBy,
            CreatedAt = now,
            UpdatedBy = createdBy,
            UpdatedAt = now,
            Images = [],
            Brand = source.Brand,
            FlipkartProductUrl = source.FlipkartProductUrl,
            FlipkartProductId = source.FlipkartProductId,
            SeoTitle = source.SeoTitle,
            SeoDescription = source.SeoDescription,
            SeoKeywords = source.SeoKeywords,
            SearchKeywords = BuildSearchKeywords(source.Name, source.Brand, source.Category, newSku, source.Tags),
            LowStockThreshold = source.LowStockThreshold,
            AutoHideWhenOutOfStock = source.AutoHideWhenOutOfStock,
        };

        await _repository.CreateAsync(newId, document, cancellationToken);
        return ToDetail(newId, document);
    }

    public async Task UpdateStatusAsync(string id, bool active, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.UpdateAsync(id, new Dictionary<string, object?>
        {
            ["active"] = active,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);
    }

    /// <summary>Public-only (always active-only) — admin already has its own full-catalog client-side search from Phase 3.</summary>
    public async Task<PagedProductsResponse> SearchProductsAsync(string query, int pageSize, string? cursor, CancellationToken cancellationToken)
    {
        var tokens = SearchTokenizer.Tokenize(query).Take(10).ToList();
        if (tokens.Count == 0)
        {
            return new PagedProductsResponse();
        }

        var result = await _repository.SearchAsync(tokens, pageSize, cursor, cancellationToken);

        return new PagedProductsResponse
        {
            Items = result.Items.Select(x => ToSummary(x.Id, x.Data)).ToList(),
            NextCursor = result.NextCursor,
            TotalCount = result.TotalCount,
        };
    }

    public async Task<List<ProductSummaryResponse>> GetSummariesByIdsAsync(List<string> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var docs = await _repository.GetByIdsAsync(ids, cancellationToken);
        // Archived products are automatically kept off the homepage's curated
        // sections (Featured/Trending/New-Arrivals-override/Collections) —
        // this is the one choke point all of them resolve through.
        var byId = docs.Where(d => d.Data.Active && d.Data.LifecycleStage != LifecycleStage.Archived).ToDictionary(d => d.Id, d => d.Data);

        return ids.Where(byId.ContainsKey).Select(id => ToSummary(id, byId[id])).ToList();
    }

    public async Task UpdateFlipkartOpsAsync(string id, UpdateFlipkartOpsRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.UpdateAsync(id, new Dictionary<string, object?>
        {
            ["flipkartProductUrl"] = OptionalField(request.FlipkartProductUrl),
            ["flipkartProductId"] = OptionalField(request.FlipkartProductId),
            ["flipkartSellerSku"] = OptionalField(request.FlipkartSellerSku),
            ["flipkartFsn"] = OptionalField(request.FlipkartFsn),
            ["launchDate"] = request.LaunchDate.HasValue ? request.LaunchDate.Value : FieldValue.Delete,
            ["lastSyncDate"] = request.LastSyncDate.HasValue ? request.LastSyncDate.Value : FieldValue.Delete,
            ["marketplacePrice"] = request.MarketplacePrice.HasValue ? request.MarketplacePrice.Value : FieldValue.Delete,
            ["marketplaceMrp"] = request.MarketplaceMrp.HasValue ? request.MarketplaceMrp.Value : FieldValue.Delete,
            ["marketplaceDiscount"] = request.MarketplaceDiscount.HasValue ? request.MarketplaceDiscount.Value : FieldValue.Delete,
            ["marketplaceCategory"] = OptionalField(request.MarketplaceCategory),
            ["marketplaceTags"] = request.MarketplaceTags,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);

    }

    public async Task BulkUpdateFlipkartUrlsAsync(List<BulkFlipkartUrlItem> items, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkUpdateFlipkartUrlsAsync(items, updatedBy, cancellationToken);
    }

    public async Task BulkLaunchAsync(List<string> ids, DateTime? launchDate, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkLaunchAsync(ids, launchDate ?? DateTime.UtcNow, updatedBy, cancellationToken);
    }

    private async Task EnsureUniqueAsync(string slug, string? sku, string? excludeId, CancellationToken cancellationToken)
    {
        if (await _validationService.SlugExistsAsync(slug, excludeId, cancellationToken))
        {
            throw new DuplicateSlugException(slug);
        }

        // Product-level SKU is legacy — new products store SKU per-variant.
        // Only check uniqueness if a non-empty SKU is provided.
        if (!string.IsNullOrWhiteSpace(sku) && await _validationService.SkuExistsAsync(sku, excludeId, cancellationToken))
        {
            throw new DuplicateSkuException(sku);
        }
    }

    private static object? OptionalField(string? value) => string.IsNullOrWhiteSpace(value) ? FieldValue.Delete : value;

    /// <summary>Lowercased, deduped word bag from name/brand/category/sku/tags — powers GET /products/search's array-contains-any query.</summary>
    private static List<string> BuildSearchKeywords(string name, string? brand, string category, string? sku, List<string> tags)
    {
        var text = string.Join(' ', new[] { name, brand, category, sku }.Concat(tags).Where(s => !string.IsNullOrWhiteSpace(s)));
        return SearchTokenizer.Tokenize(text);
    }

    private static ProductSizeDocument ToSizeDocument(ProductSizeDto dto) => new() { Size = dto.Size, Stock = dto.Stock };

    private static ProductImageDocument ToImageDocument(ProductImageDto dto) => new() { Url = dto.Url, PublicId = dto.PublicId, Slot = dto.Slot, Order = dto.Order };

    private static ProductImageDto ToImageDto(ProductImageDocument doc) => new() { Url = doc.Url, PublicId = doc.PublicId, Slot = doc.Slot, Order = doc.Order };

    private static ProductPricingDocument? ToPricingDocument(PricingRequestDto? dto)
    {
        if (dto == null) return null;
        return new ProductPricingDocument
        {
            PurchaseCost = dto.PurchaseCost,
            PackagingCharges = dto.PackagingCharges,
            FlipkartCharges = dto.FlipkartCharges,
            OtherCharges = dto.OtherCharges,
            DesiredProfit = dto.DesiredProfit,
            TotalCost = dto.TotalCost,
            SellingPrice = dto.SellingPrice,
            ProfitMargin = dto.ProfitMargin,
            Roi = dto.Roi,
        };
    }

    private static PricingResponseDto? ToPricingResponse(ProductPricingDocument? doc)
    {
        if (doc == null) return null;
        return new PricingResponseDto
        {
            PurchaseCost = doc.PurchaseCost,
            PackagingCharges = doc.PackagingCharges,
            FlipkartCharges = doc.FlipkartCharges,
            OtherCharges = doc.OtherCharges,
            DesiredProfit = doc.DesiredProfit,
            TotalCost = doc.TotalCost,
            SellingPrice = doc.SellingPrice,
            ProfitMargin = doc.ProfitMargin,
            Roi = doc.Roi,
        };
    }

    private static object ToPricingDict(PricingRequestDto dto)
    {
        var dict = new Dictionary<string, object?>();
        dict["purchaseCost"] = dto.PurchaseCost;
        dict["packagingCharges"] = dto.PackagingCharges;
        dict["flipkartCharges"] = dto.FlipkartCharges;
        dict["otherCharges"] = dto.OtherCharges;
        dict["desiredProfit"] = dto.DesiredProfit;
        dict["totalCost"] = dto.TotalCost;
        dict["sellingPrice"] = dto.SellingPrice;
        dict["profitMargin"] = dto.ProfitMargin;
        dict["roi"] = dto.Roi;
        return dict;
    }

    /// <summary>Derived, not persisted — the image with the lowest Order (position 0 in the admin's gallery).</summary>
    private static ProductImageDto? DeriveThumbnail(List<ProductImageDocument> images)
    {
        var first = images.OrderBy(i => i.Order).FirstOrDefault();
        return first == null ? null : ToImageDto(first);
    }

    private static ProductSummaryResponse ToSummary(string id, ProductDocument doc) => new()
    {
        Id = id,
        Name = doc.Name,
        Slug = doc.Slug,
        Category = doc.Category,
        Sku = doc.Sku,
        Price = doc.LowestPrice ?? doc.Price,
        Mrp = doc.LowestPrice ?? doc.Mrp,
        Discount = doc.Discount,
        Pricing = doc.Pricing != null ? ToPricingResponse(doc.Pricing) : null,
        Stock = doc.TotalStock,
        Featured = doc.Featured,
        NewArrival = doc.NewArrival,
        BestSeller = doc.BestSeller,
        Active = doc.Active,
        DisplayOrder = doc.DisplayOrder,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
        Brand = doc.Brand,
        FlipkartProductUrl = doc.FlipkartProductUrl,
        FlipkartProductId = doc.FlipkartProductId,
        Deleted = doc.Deleted,
        DeletedAt = doc.DeletedAt,
        Thumbnail = doc.ThumbnailUrl != null ? new ProductImageDto { Url = doc.ThumbnailUrl } : DeriveThumbnail(doc.Images),
        FlipkartSellerSku = doc.FlipkartSellerSku,
        FlipkartFsn = doc.FlipkartFsn,
        LaunchDate = doc.LaunchDate,
        LastSyncDate = doc.LastSyncDate,
        MarketplacePrice = doc.MarketplacePrice,
        MarketplaceMrp = doc.MarketplaceMrp,
        MarketplaceDiscount = doc.MarketplaceDiscount,
        MarketplaceCategory = doc.MarketplaceCategory,
        MarketplaceTags = doc.MarketplaceTags,
        WebsiteClickCount = doc.WebsiteClickCount,
        LastClickAt = doc.LastClickAt,
        LifecycleStage = doc.LifecycleStage,
        LowStockThreshold = doc.LowStockThreshold,
        ReservedStock = doc.ReservedStock,
        AutoHideWhenOutOfStock = doc.AutoHideWhenOutOfStock,
        StockUpdatedAt = doc.StockUpdatedAt,
        IsOutOfStock = doc.TotalStock <= 0,
        IsLowStock = doc.TotalStock > 0 && doc.LowStockThreshold.HasValue && doc.TotalStock <= doc.LowStockThreshold.Value,
        VariantCount = doc.VariantCount,
        TotalStock = doc.TotalStock,
        LowestPrice = doc.LowestPrice,
        HighestPrice = doc.HighestPrice,
    };

    private static ProductDetailResponse ToDetail(string id, ProductDocument doc, List<VariantResponse>? variants = null)
    {
        var activeVariants = variants?.Where(v => v.IsActive).ToList();
        var firstActive = activeVariants?.FirstOrDefault();
        var flatImages = variants != null ? FlattenVariantImages(variants) : doc.Images.Select(ToImageDto).ToList();
        var computedStock = activeVariants?.Sum(v => v.Sizes.Sum(s => s.Stock)) ?? (variants != null ? 0 : doc.Stock);

        return new()
        {
            Id = id,
            Name = doc.Name,
            Slug = doc.Slug,
            Category = doc.Category,
            SubCategory = doc.SubCategory,
            Description = doc.Description,
            ShortDescription = doc.ShortDescription,
            Fabric = doc.Fabric,
            Pattern = doc.Pattern,
            Fit = doc.Fit,
            Sleeve = doc.Sleeve,
            Neck = doc.Neck,
            Occasion = doc.Occasion,
            WashCare = doc.WashCare,
            Tags = doc.Tags,
            Featured = doc.Featured,
            NewArrival = doc.NewArrival,
            BestSeller = doc.BestSeller,
            Active = doc.Active,
            DisplayOrder = doc.DisplayOrder,
            CreatedBy = doc.CreatedBy,
            CreatedAt = doc.CreatedAt,
            UpdatedBy = doc.UpdatedBy,
            UpdatedAt = doc.UpdatedAt,
            Images = flatImages,
            Pricing = doc.Pricing != null ? ToPricingResponse(doc.Pricing) : null,
            Brand = doc.Brand,
            SeoTitle = doc.SeoTitle,
            SeoDescription = doc.SeoDescription,
            SeoKeywords = doc.SeoKeywords,
            Deleted = doc.Deleted,
            DeletedAt = doc.DeletedAt,
            Thumbnail = doc.ThumbnailUrl != null ? new ProductImageDto { Url = doc.ThumbnailUrl } : DeriveThumbnail(doc.Images),
            Variants = variants ?? [],
            // Legacy backward‑compat — populated from first active variant when available
            Price = firstActive?.SellingPrice ?? doc.Price,
            Mrp = firstActive?.Mrp ?? doc.Mrp,
            Discount = doc.Discount,
            Sizes = firstActive?.Sizes.Select(s => new ProductSizeDto { Size = s.Size, Stock = s.Stock }).ToList()
                    ?? doc.Sizes.Select(s => new ProductSizeDto { Size = s.Size, Stock = s.Stock }).ToList(),
            Stock = computedStock,
            Sku = firstActive?.Sku ?? doc.Sku,
            Color = firstActive?.ColourName ?? doc.Color,
            FlipkartProductUrl = doc.FlipkartProductUrl,
            FlipkartProductId = doc.FlipkartProductId,
            FlipkartSellerSku = doc.FlipkartSellerSku,
            FlipkartFsn = doc.FlipkartFsn,
            LaunchDate = doc.LaunchDate,
            LastSyncDate = doc.LastSyncDate,
            MarketplacePrice = doc.MarketplacePrice,
            MarketplaceMrp = doc.MarketplaceMrp,
            MarketplaceDiscount = doc.MarketplaceDiscount,
            MarketplaceCategory = doc.MarketplaceCategory,
            MarketplaceTags = doc.MarketplaceTags,
            WebsiteClickCount = doc.WebsiteClickCount,
            LastClickAt = doc.LastClickAt,
            LifecycleStage = doc.LifecycleStage,
            LowStockThreshold = doc.LowStockThreshold,
            ReservedStock = doc.ReservedStock,
            AutoHideWhenOutOfStock = doc.AutoHideWhenOutOfStock,
            StockUpdatedAt = doc.StockUpdatedAt,
            IsOutOfStock = computedStock <= 0,
            IsLowStock = computedStock > 0 && doc.LowStockThreshold.HasValue && computedStock <= doc.LowStockThreshold.Value,
            VariantCount = activeVariants?.Count ?? doc.VariantCount,
            TotalStock = activeVariants?.Sum(v => v.Sizes.Sum(s => s.Stock)) ?? doc.TotalStock,
            LowestPrice = doc.LowestPrice,
            HighestPrice = doc.HighestPrice,
        };
    }

    private async Task<ProductDetailResponse> ToDetailWithVariants(string id, ProductDocument doc, CancellationToken ct)
    {
        _logger.LogDebug("ToDetailWithVariants: loading variants for product {ProductId}", id);
        var variantTuples = await _variantRepository.GetVariantsAsync(id, ct);
        _logger.LogDebug("ToDetailWithVariants: loaded {Count} variants for product {ProductId}", variantTuples.Count, id);
        var variantResponses = variantTuples.Select(t => ToVariantResponse(t.Id, t.Data)).ToList();
        return ToDetail(id, doc, variantResponses);
    }

    private static VariantResponse ToVariantResponse(string variantId, ProductVariantDocument doc) => new()
    {
        Id = variantId,
        ColourName = doc.ColourName,
        ColourHex = doc.ColourHex,
        Sku = doc.Sku,
        SellingPrice = doc.SellingPrice,
        Mrp = doc.Mrp,
        PurchaseCost = doc.PurchaseCost,
        PackagingCost = doc.PackagingCost,
        FlipkartCommission = doc.FlipkartCommission,
        ShippingCharges = doc.ShippingCharges,
        MarketingCost = doc.MarketingCost,
        OtherCharges = doc.OtherCharges,
        DesiredProfit = doc.DesiredProfit,
        IsActive = doc.IsActive,
        FlipkartUrl = doc.FlipkartUrl,
        DisplayOrder = doc.DisplayOrder,
        IsFeatured = doc.IsFeatured,
        IsBestSeller = doc.IsBestSeller,
        IsNewArrival = doc.IsNewArrival,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
        Sizes = (doc.Sizes ?? []).Select(s => new VariantSizeResponse { Size = s.Size, Stock = s.Stock }).ToList(),
        Images = ToVariantImageResponse(doc.Images),
    };

    private static VariantImagesResponse ToVariantImageResponse(VariantImagesDocument? doc)
    {
        if (doc == null) return new();
        return new()
        {
            Primary = ToSlotResponse(doc.Primary),
            Front = ToSlotResponse(doc.Front),
            Back = ToSlotResponse(doc.Back),
            Left = ToSlotResponse(doc.Left),
            Right = ToSlotResponse(doc.Right),
            Closeup = ToSlotResponse(doc.Closeup),
            Gallery = (doc.Gallery ?? []).Select(ToSlotResponse).ToList(),
        };
    }

    private static VariantImageSlotResponse ToSlotResponse(VariantImageSlotDocument? slot) =>
        slot == null ? null! : new()
        {
            Url = slot.Url,
            PublicId = slot.PublicId,
            Width = slot.Width,
            Height = slot.Height,
            Alt = slot.Alt,
        };

    private static List<ProductImageDto> FlattenVariantImages(List<VariantResponse> variants)
    {
        var result = new List<ProductImageDto>();
        foreach (var v in variants)
        {
            if (v.Images?.Primary != null)
                result.Add(new ProductImageDto { Url = v.Images.Primary.Url, PublicId = v.Images.Primary.PublicId, Order = result.Count });
            foreach (var g in v.Images?.Gallery ?? [])
                result.Add(new ProductImageDto { Url = g.Url, PublicId = g.PublicId, Order = result.Count });
        }
        return result;
    }

    private static VariantImageSlotDocument? ToSlotDocument(VariantImageSlotInput? input)
    {
        if (input == null || string.IsNullOrEmpty(input.Url)) return null;
        return new VariantImageSlotDocument
        {
            Url = input.Url,
            PublicId = input.PublicId ?? string.Empty,
            Width = input.Width,
            Height = input.Height,
            Alt = input.Alt,
        };
    }

    private async Task SyncVariantsAsync(string productId, List<EmbeddedVariantRequest>? variants, CancellationToken ct)
    {
        if (variants == null) return; // null means "don't touch variants"

        var existingIds = await _variantRepository.GetVariantIdsAsync(productId, ct);
        var requestedIds = variants.Where(v => v.Id != null).Select(v => v.Id!).ToHashSet();

        // Delete variants not in the request, cleaning up their Cloudinary images
        var docPathPrefix = $"products/{productId}/variants/";
        foreach (var id in existingIds.Where(id => !requestedIds.Contains(id)))
        {
            var variantPath = $"{docPathPrefix}{id}";
            var variantDoc = await _variantRepository.GetVariantAsync(variantPath, ct);
            if (variantDoc != null)
            {
                var publicIds = GetImagePublicIds(variantDoc.Images);
                foreach (var pid in publicIds)
                {
                    try { await _cloudinary.DeleteImageAsync(pid, ct); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Failed to delete variant image {PublicId} during sync", pid); }
                }
            }
            await _variantRepository.DeleteVariantAsync(variantPath, ct);
        }

        // Track computed denormalized values
        var activeVariantCount = 0;
        long totalStock = 0;
        double? lowestPrice = null;
        double? highestPrice = null;
        string? thumbnailUrl = null;

        // Create or update each variant in the request
        foreach (var v in variants)
        {
            _logger.LogInformation("[SyncVariants] Variant {VariantId}: FlipkartUrl from request = '{FlipkartUrl}' (null? {IsNull}, empty? {IsEmpty})",
                v.Id ?? "new", v.FlipkartUrl, v.FlipkartUrl == null, string.IsNullOrEmpty(v.FlipkartUrl));
            var images = v.Images;
            var sizes = (v.Sizes ?? []).Select(s => new VariantSizeDocument { Size = s.Size, Stock = s.Stock }).ToList();
            var variantStock = sizes.Sum(s => s.Stock);

            if (v.IsActive)
            {
                activeVariantCount++;
                totalStock += variantStock;
                if (v.SellingPrice.HasValue)
                {
                    if (lowestPrice is null || v.SellingPrice.Value < lowestPrice) lowestPrice = v.SellingPrice;
                    if (highestPrice is null || v.SellingPrice.Value > highestPrice) highestPrice = v.SellingPrice;
                }

                if (thumbnailUrl == null)
                {
                    thumbnailUrl = v.Images?.Primary?.Url
                        ?? v.Images?.Gallery?.FirstOrDefault()?.Url;
                }
            }

            var doc = new ProductVariantDocument
            {
                ColourName = v.ColourName,
                ColourHex = v.ColourHex,
                Sku = v.Sku,
                SellingPrice = v.SellingPrice,
                Mrp = v.Mrp,
                PurchaseCost = v.PurchaseCost,
                PackagingCost = v.PackagingCost,
                FlipkartCommission = v.FlipkartCommission,
                ShippingCharges = v.ShippingCharges,
                MarketingCost = v.MarketingCost,
                OtherCharges = v.OtherCharges,
                DesiredProfit = v.DesiredProfit,
                IsActive = v.IsActive,
                FlipkartUrl = v.FlipkartUrl,
                DisplayOrder = v.DisplayOrder,
                IsFeatured = v.IsFeatured,
                IsBestSeller = v.IsBestSeller,
                IsNewArrival = v.IsNewArrival,
                Sizes = sizes,
                Images = new VariantImagesDocument
                {
                    Primary = ToSlotDocument(images?.Primary),
                    Front = ToSlotDocument(images?.Front),
                    Back = ToSlotDocument(images?.Back),
                    Left = ToSlotDocument(images?.Left),
                    Right = ToSlotDocument(images?.Right),
                    Closeup = ToSlotDocument(images?.Closeup),
                    Gallery = (images?.Gallery ?? []).Select(g => ToSlotDocument(g)).Where(s => s != null).ToList()!,
                },
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            if (v.Id != null && existingIds.Contains(v.Id))
            {
                await _variantRepository.UpdateVariantAsync($"{docPathPrefix}{v.Id}", doc, ct);
            }
            else
            {
                var newId = v.Id ?? Guid.NewGuid().ToString("N");
                await _variantRepository.CreateVariantWithIdAsync(productId, newId, doc, ct);
            }
        }

        // Promote the first non-empty variant flipkartUrl to the product-level field
        // so list views (home page, category, etc.) see it via ProductSummaryResponse.FlipkartProductUrl
        var firstFlipkartUrl = variants
            .Select(v => v.FlipkartUrl)
            .FirstOrDefault(u => !string.IsNullOrWhiteSpace(u));

        _logger.LogInformation("[SyncVariants] Promoting firstFlipkartUrl = '{Url}' to product doc flipkartProductUrl", firstFlipkartUrl);
        // Write denormalized variant summary onto the product document
        await _repository.UpdateAsync(productId, new Dictionary<string, object?>
        {
            ["variantCount"] = activeVariantCount,
            ["totalStock"] = totalStock,
            ["lowestPrice"] = lowestPrice.HasValue ? lowestPrice.Value : FieldValue.Delete,
            ["highestPrice"] = highestPrice.HasValue ? highestPrice.Value : FieldValue.Delete,
            ["thumbnailUrl"] = thumbnailUrl ?? (object)FieldValue.Delete,
            ["flipkartProductUrl"] = firstFlipkartUrl ?? (object)FieldValue.Delete,
        }, ct);
    }

    private static List<string> GetImagePublicIds(VariantImagesDocument images)
    {
        var ids = new List<string>();
        if (images.Primary is { PublicId.Length: > 0 }) ids.Add(images.Primary.PublicId);
        if (images.Front is { PublicId.Length: > 0 }) ids.Add(images.Front.PublicId);
        if (images.Back is { PublicId.Length: > 0 }) ids.Add(images.Back.PublicId);
        if (images.Left is { PublicId.Length: > 0 }) ids.Add(images.Left.PublicId);
        if (images.Right is { PublicId.Length: > 0 }) ids.Add(images.Right.PublicId);
        if (images.Closeup is { PublicId.Length: > 0 }) ids.Add(images.Closeup.PublicId);
        ids.AddRange((images.Gallery ?? []).Where(g => g.PublicId.Length > 0).Select(g => g.PublicId));
        return ids;
    }
}
