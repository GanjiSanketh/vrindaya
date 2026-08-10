namespace Vrindaya.Api.Models;

/// <summary>
/// Coarse, count-only product aggregates computed from a single pass over
/// the products collection and cached separately from any list/paged read
/// (see IProductRepository.GetStatisticsAsync). These are stable statistics
/// that change only on product create/update/delete — the exact operation
/// set that invalidates the "products" cache prefix.
/// </summary>
public sealed record ProductStatistics(
    int TotalProducts,
    int ActiveProducts,
    int FeaturedProducts,
    int CategoriesCount);
