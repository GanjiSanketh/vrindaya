using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class ProductVariantService : IProductVariantService
{
    private readonly IProductVariantRepository _repo;
    private readonly IProductRepository _productRepo;

    public ProductVariantService(IProductVariantRepository repo, IProductRepository productRepo)
    {
        _repo = repo;
        _productRepo = productRepo;
    }

    public async Task<List<VariantResponse>> GetVariantsAsync(string productId, CancellationToken ct = default)
    {
        var hasVariants = await _repo.HasVariantsAsync(productId, ct);
        if (!hasVariants)
        {
            await EnsureDefaultVariantAsync(productId, ct);
        }
        var docs = await _repo.GetVariantsAsync(productId, ct);
        return docs.Select(d => MapToResponse(d.Data, d.Id)).ToList();
    }

    private async Task EnsureDefaultVariantAsync(string productId, CancellationToken ct)
    {
        var product = await _productRepo.GetByIdAsync(productId, ct);
        if (product == null) return;

        var variant = new ProductVariantDocument
        {
            ColourName = string.IsNullOrEmpty(product.Color) ? "Default" : product.Color,
            ColourHex = null,
            Sku = string.IsNullOrEmpty(product.Sku) ? $"LEGACY-{productId[..Math.Min(8, productId.Length)]}" : product.Sku,
            SellingPrice = product.Price,
            Mrp = product.Mrp,
            FlipkartUrl = product.FlipkartProductUrl,
            DisplayOrder = 0,
            IsActive = true,
            IsFeatured = product.Featured,
            IsBestSeller = product.BestSeller,
            IsNewArrival = product.NewArrival,
            Sizes = product.Sizes.Select(s => new VariantSizeDocument
            {
                Size = s.Size,
                Stock = (int)s.Stock,
            }).ToList(),
            Images = MapLegacyImages(product.Images),
        };

        await _repo.CreateVariantAsync(productId, variant, ct);
    }

    private static VariantImagesDocument MapLegacyImages(List<ProductImageDocument> images)
    {
        var result = new VariantImagesDocument();
        if (images.Count == 0) return result;

        var ordered = images.OrderBy(i => i.Order).ToList();

        result.Primary = ordered[0].Url;
        var gallery = ordered.Skip(1).Select(i => i.Url).ToList();
        if (gallery.Count > 0)
        {
            result.Gallery = gallery;
            if (gallery.Count >= 1) result.Front = gallery[0];
            if (gallery.Count >= 2) result.Back = gallery[1];
            if (gallery.Count >= 3) result.Left = gallery[2];
            if (gallery.Count >= 4) result.Right = gallery[3];
        }

        return result;
    }

    public async Task<VariantResponse> GetVariantAsync(string variantId, CancellationToken ct = default)
    {
        var doc = await _repo.GetVariantAsync(variantId, ct);
        if (doc == null)
            throw new KeyNotFoundException($"Variant '{variantId}' not found.");
        return MapToResponse(doc, variantId);
    }

    public async Task<VariantResponse> CreateVariantAsync(string productId, CreateVariantRequest request, string createdBy, CancellationToken ct = default)
    {
        if (await _repo.SkuExistsAsync(request.Sku, null, ct))
            throw new DuplicateSkuException(request.Sku);

        var doc = new ProductVariantDocument
        {
            ColourName = request.ColourName,
            ColourHex = request.ColourHex,
            Sku = request.Sku,
            SellingPrice = request.SellingPrice,
            Mrp = request.Mrp,
            FlipkartUrl = request.FlipkartUrl,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            IsFeatured = request.IsFeatured,
            IsBestSeller = request.IsBestSeller,
            IsNewArrival = request.IsNewArrival,
            Sizes = request.Sizes.Select(s => new VariantSizeDocument
            {
                Size = s.Size,
                Stock = s.Stock,
            }).ToList(),
        };

        var id = await _repo.CreateVariantAsync(productId, doc, ct);
        return MapToResponse(doc, id);
    }

    public async Task<VariantResponse> UpdateVariantAsync(string variantId, UpdateVariantRequest request, string updatedBy, CancellationToken ct = default)
    {
        var existing = await _repo.GetVariantAsync(variantId, ct);
        if (existing == null)
            throw new KeyNotFoundException($"Variant '{variantId}' not found.");

        if (await _repo.SkuExistsAsync(request.Sku, variantId, ct))
            throw new DuplicateSkuException(request.Sku);

        existing.ColourName = request.ColourName;
        existing.ColourHex = request.ColourHex;
        existing.Sku = request.Sku;
        existing.SellingPrice = request.SellingPrice;
        existing.Mrp = request.Mrp;
        existing.FlipkartUrl = request.FlipkartUrl;
        existing.DisplayOrder = request.DisplayOrder;
        existing.IsActive = request.IsActive;
        existing.IsFeatured = request.IsFeatured;
        existing.IsBestSeller = request.IsBestSeller;
        existing.IsNewArrival = request.IsNewArrival;
        existing.Sizes = request.Sizes.Select(s => new VariantSizeDocument
        {
            Size = s.Size,
            Stock = s.Stock,
        }).ToList();

        if (request.Images != null)
        {
            existing.Images = new VariantImagesDocument
            {
                Primary = request.Images.Primary,
                Front = request.Images.Front,
                Back = request.Images.Back,
                Left = request.Images.Left,
                Right = request.Images.Right,
                Closeup = request.Images.Closeup,
                Gallery = request.Images.Gallery,
            };
        }

        await _repo.UpdateVariantAsync(variantId, existing, ct);
        return MapToResponse(existing, variantId);
    }

    public async Task DeleteVariantAsync(string variantId, CancellationToken ct = default)
    {
        await _repo.DeleteVariantAsync(variantId, ct);
    }

    public async Task<string> GenerateIdAsync()
    {
        return await _repo.GenerateIdAsync();
    }

    private static VariantResponse MapToResponse(ProductVariantDocument doc, string? id = null)
    {
        return new VariantResponse
        {
            Id = id ?? string.Empty,
            ColourName = doc.ColourName,
            ColourHex = doc.ColourHex,
            Sku = doc.Sku,
            SellingPrice = doc.SellingPrice,
            Mrp = doc.Mrp,
            FlipkartUrl = doc.FlipkartUrl,
            DisplayOrder = doc.DisplayOrder,
            IsActive = doc.IsActive,
            IsFeatured = doc.IsFeatured,
            IsBestSeller = doc.IsBestSeller,
            IsNewArrival = doc.IsNewArrival,
            Images = new VariantImagesResponse
            {
                Primary = doc.Images.Primary,
                Front = doc.Images.Front,
                Back = doc.Images.Back,
                Left = doc.Images.Left,
                Right = doc.Images.Right,
                Closeup = doc.Images.Closeup,
                Gallery = doc.Images.Gallery,
            },
            Sizes = doc.Sizes.Select(s => new VariantSizeResponse
            {
                Size = s.Size,
                Stock = s.Stock,
            }).ToList(),
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt,
        };
    }
}
