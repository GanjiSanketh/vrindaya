using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Products;

public class LifecycleService : ILifecycleService
{
    private readonly IProductRepository _repository;

    public LifecycleService(IProductRepository repository)
    {
        _repository = repository;
    }

    public async Task UpdateStageAsync(string productId, string stage, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.UpdateAsync(productId, new Dictionary<string, object?>
        {
            ["lifecycleStage"] = stage,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);
    }

    public async Task BulkUpdateStageAsync(List<string> ids, string stage, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkUpdateLifecycleStageAsync(ids, stage, updatedBy, cancellationToken);
    }
}
