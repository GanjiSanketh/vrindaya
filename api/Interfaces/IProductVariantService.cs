using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.Interfaces;

public interface IProductVariantService
{
    Task<List<VariantResponse>> GetVariantsAsync(string productId, CancellationToken ct = default);
    Task<VariantResponse> GetVariantAsync(string variantId, CancellationToken ct = default);
    Task<VariantResponse> CreateVariantAsync(string productId, CreateVariantRequest request, string createdBy, CancellationToken ct = default);
    Task<VariantResponse> UpdateVariantAsync(string variantId, UpdateVariantRequest request, string updatedBy, CancellationToken ct = default);
    Task DeleteVariantAsync(string variantId, CancellationToken ct = default);
    Task<string> GenerateIdAsync();
}
