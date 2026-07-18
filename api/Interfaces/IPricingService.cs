using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.Pricing;

namespace Vrindaya.Api.Interfaces;

public interface IPricingService
{
    Task<PagedResult<PricingResponse>> GetPricingAsync(PricingQuery query, CancellationToken cancellationToken);

    Task<PricingResponse> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task<List<PricingResponse>> GetByVariantIdAsync(string variantId, CancellationToken cancellationToken);

    Task<PricingResponse> CreateAsync(CreatePricingRequest request, CancellationToken cancellationToken);

    Task<PricingResponse> UpdateAsync(string id, UpdatePricingRequest request, CancellationToken cancellationToken);

    Task<List<ProductPricingSummaryResponse>> GetProductPricingAsync(string productId, CancellationToken cancellationToken);

    Task<PricingResponse> RecalculateAsync(string id, CancellationToken cancellationToken);

    Task<BulkPricingPreviewResponse> BulkPreviewAsync(BulkPricingUpdateRequest request, CancellationToken cancellationToken);

    Task<int> BulkApplyAsync(BulkPricingUpdateRequest request, CancellationToken cancellationToken);

    Task<PricingDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken);

    Task<PricingRecommendationResponse> GetRecommendationsAsync(string id, CancellationToken cancellationToken);

    Task<List<PricingResponse>> GetAllUnpagedAsync(CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);
}
