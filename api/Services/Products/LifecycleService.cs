using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Services.Audit;

namespace Vrindaya.Api.Services.Products;

public class LifecycleService : ILifecycleService
{
    private readonly IProductRepository _repository;
    private readonly IAuditLogService _auditLogService;

    public LifecycleService(IProductRepository repository, IAuditLogService auditLogService)
    {
        _repository = repository;
        _auditLogService = auditLogService;
    }

    public async Task UpdateStageAsync(string productId, string stage, string updatedBy, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(productId, cancellationToken)
            ?? throw new ProductNotFoundException(productId);

        await _repository.UpdateAsync(productId, new Dictionary<string, object?>
        {
            ["lifecycleStage"] = stage,
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = DateTime.UtcNow,
        }, cancellationToken);

        try { await _auditLogService.LogUpdateAsync("Products", productId, existing.Name, null, null, updatedBy, null, null, $"Product '{existing.Name}' lifecycle stage changed to '{stage}'"); } catch { }
    }

    public async Task BulkUpdateStageAsync(List<string> ids, string stage, string updatedBy, CancellationToken cancellationToken)
    {
        await _repository.BulkUpdateLifecycleStageAsync(ids, stage, updatedBy, cancellationToken);
        try { await _auditLogService.LogCustomAsync("BulkUpdate", "Products", null, null, $"Bulk lifecycle stage update: {ids.Count} products set to '{stage}'", updatedBy, null, null); } catch { }
    }
}
