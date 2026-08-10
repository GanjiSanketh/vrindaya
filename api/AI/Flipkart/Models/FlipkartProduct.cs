namespace Vrindaya.Api.AI.Flipkart.Models;

/// <summary>
/// Flipkart-specific product view with all attributes needed for listing optimization,
/// compliance checks, pricing analysis, and competitive intelligence.
/// </summary>
public sealed record FlipkartProduct(
    string ProductId,
    string Name,
    string Category,
    double Price,
    double PurchaseCost,
    double SellingPrice,
    int Stock,
    int Sales,
    DateTime CreatedDate,
    string? Brand = null,
    string? Description = null,
    string? ShortDescription = null,
    Dictionary<string, string>? Attributes = null,
    string? FlipkartProductUrl = null,
    string? FlipkartProductId = null,
    string? FlipkartSellerSku = null,
    string? FlipkartFsn = null,
    double? FlipkartCommission = null,
    List<FlipkartVariant>? Variants = null);

/// <summary>
/// Flipkart-specific variant view.
/// </summary>
public sealed record FlipkartVariant(
    string VariantId,
    string? FlipkartUrl = null,
    string? FlipkartSellerSku = null,
    string? FlipkartFsn = null,
    double? FlipkartCommission = null,
    string? Color = null,
    string? Size = null);