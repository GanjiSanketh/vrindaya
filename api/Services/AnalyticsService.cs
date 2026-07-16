using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly IProductRepository _productRepository;

    public AnalyticsService(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public Task RecordProductClickAsync(string productId, CancellationToken cancellationToken)
    {
        return _productRepository.IncrementWebsiteClickAsync(productId, cancellationToken);
    }
}
