using Microsoft.Extensions.Caching.Memory;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Homepage;

public class HomepageCacheService : IHomepageCacheService
{
    private readonly IMemoryCache _cache;

    public HomepageCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public void Invalidate() => _cache.Remove(AppConstants.HomepageCacheKey);
}
