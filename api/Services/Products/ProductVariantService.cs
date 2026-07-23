using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Products;

public class ProductVariantService : IProductVariantService
{
    private readonly IProductVariantRepository _repo;
    private readonly IProductRepository _productRepo;
    private readonly ICloudinaryService _cloudinary;
    private readonly ILogger<ProductVariantService> _logger;

    public ProductVariantService(
        IProductVariantRepository repo,
        IProductRepository productRepo,
        ICloudinaryService cloudinary,
        ILogger<ProductVariantService> logger)
    {
        _repo = repo;
        _productRepo = productRepo;
        _cloudinary = cloudinary;
        _logger = logger;
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

        result.Primary = new VariantImageSlotDocument { Url = ordered[0].Url, PublicId = ordered[0].PublicId };
        var gallery = ordered.Skip(1).ToList();
        if (gallery.Count > 0)
        {
            result.Gallery = gallery.Select(i => new VariantImageSlotDocument { Url = i.Url, PublicId = i.PublicId }).ToList();
            if (gallery.Count >= 1) result.Front = new VariantImageSlotDocument { Url = gallery[0].Url, PublicId = gallery[0].PublicId };
            if (gallery.Count >= 2) result.Back = new VariantImageSlotDocument { Url = gallery[1].Url, PublicId = gallery[1].PublicId };
            if (gallery.Count >= 3) result.Left = new VariantImageSlotDocument { Url = gallery[2].Url, PublicId = gallery[2].PublicId };
            if (gallery.Count >= 4) result.Right = new VariantImageSlotDocument { Url = gallery[3].Url, PublicId = gallery[3].PublicId };
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
            var oldPublicIds = GetImagePublicIds(existing.Images);
            existing.Images = MapImagesInput(request.Images);
            var newPublicIds = GetImagePublicIds(existing.Images);

            var removed = oldPublicIds.Where(id => !newPublicIds.Contains(id)).ToList();
            foreach (var pid in removed)
            {
                try { await _cloudinary.DeleteImageAsync(pid, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to delete variant image {PublicId} during update", pid); }
            }
        }

        await _repo.UpdateVariantAsync(variantId, existing, ct);
        return MapToResponse(existing, variantId);
    }

    public async Task DeleteVariantAsync(string variantId, CancellationToken ct = default)
    {
        ProductVariantDocument? doc = null;
        try
        {
            doc = await _repo.GetVariantAsync(variantId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read variant document {VariantId} before delete; skipping image cleanup", variantId);
        }

        if (doc != null)
        {
            var publicIds = GetImagePublicIds(doc.Images);
            foreach (var pid in publicIds)
            {
                try { await _cloudinary.DeleteImageAsync(pid, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to delete variant image {PublicId}", pid); }
            }
        }

        await _repo.DeleteVariantAsync(variantId, ct);
    }

    public async Task<string> GenerateIdAsync()
    {
        return await _repo.GenerateIdAsync();
    }

    private static VariantImagesDocument MapImagesInput(VariantImagesInput input)
    {
        static VariantImageSlotDocument? ToDoc(VariantImageSlotInput? s)
        {
            if (s == null || string.IsNullOrEmpty(s.Url)) return null;
            return new VariantImageSlotDocument
            {
                Url = s.Url,
                PublicId = s.PublicId ?? string.Empty,
                Width = s.Width,
                Height = s.Height,
                Alt = s.Alt,
            };
        }

        return new VariantImagesDocument
        {
            Primary = ToDoc(input.Primary),
            Front = ToDoc(input.Front),
            Back = ToDoc(input.Back),
            Left = ToDoc(input.Left),
            Right = ToDoc(input.Right),
            Closeup = ToDoc(input.Closeup),
            Gallery = (input.Gallery ?? []).Select(g => ToDoc(g)).Where(x => x != null).Cast<VariantImageSlotDocument>().ToList(),
        };
    }

    private static VariantImageSlotResponse? ToSlotResponse(VariantImageSlotDocument? slot) =>
        slot == null ? null : new()
        {
            Url = slot.Url,
            PublicId = slot.PublicId,
            Width = slot.Width,
            Height = slot.Height,
            Alt = slot.Alt,
        };

    internal static List<string> GetImagePublicIds(VariantImagesDocument images)
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
                Primary = ToSlotResponse(doc.Images.Primary),
                Front = ToSlotResponse(doc.Images.Front),
                Back = ToSlotResponse(doc.Images.Back),
                Left = ToSlotResponse(doc.Images.Left),
                Right = ToSlotResponse(doc.Images.Right),
                Closeup = ToSlotResponse(doc.Images.Closeup),
                Gallery = (doc.Images.Gallery ?? []).Select(ToSlotResponse).ToList(),
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
