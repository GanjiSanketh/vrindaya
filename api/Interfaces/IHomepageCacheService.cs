namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Wraps the single cached GET /homepage response. Every homepage-CMS
/// mutation (hero banners, promotional banners, categories, homepage
/// config) calls Invalidate() after writing, so an admin edit is visible
/// immediately instead of waiting out the cache TTL.
/// </summary>
public interface IHomepageCacheService
{
    void Invalidate();
}
