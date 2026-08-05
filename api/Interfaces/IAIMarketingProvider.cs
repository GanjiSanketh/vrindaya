using Vrindaya.Api.DTOs.Marketing;

namespace Vrindaya.Api.Interfaces;

public interface IAIMarketingProvider
{
    Task<GeneratePostResponse> GeneratePostAsync();
    Task<GenerateReelResponse> GenerateReelAsync();
}