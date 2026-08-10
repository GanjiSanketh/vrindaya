using System.Security.Cryptography;
using System.Text;
using Vrindaya.Api.AI.Campaigns.Dtos;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Builds stable, content-derived fingerprints for AI requests so diagnostics
/// can group and correlate operations without ever retaining request text.
///
/// The fingerprint covers only the fields that change the AI answer, so two
/// logically identical requests produce the same hash — which lets a
/// diagnostics reader spot repeated work and correlate an entry with the
/// response cache.
/// </summary>
internal static class AiRequestSignature
{
    /// <summary>Number of hex characters retained from the SHA-256 digest.</summary>
    private const int HashLength = 32;

    /// <summary>Fingerprints a campaign generation request.</summary>
    public static string ForCampaignRequest(CampaignRequestDto request)
    {
        var signature = string.Join('|',
            request.PreferredObjective,
            request.Platform?.ToString() ?? "any",
            request.MaximumCampaigns,
            request.IncludeLowStock,
            request.IncludeNewProducts,
            request.IncludeBestSellers,
            request.FestivalName,
            request.TargetAudience,
            string.Join(',', request.ProductIds));

        return Hash(signature);
    }

    /// <summary>
    /// Fingerprints a free-form prompt. The prompt text itself is never
    /// retained — only its digest — so diagnostics can correlate repeated
    /// module prompts without storing content.
    /// </summary>
    public static string ForPrompt(string prompt) => Hash(prompt);

    /// <summary>Fingerprints a summarization source.</summary>
    public static string ForSummarySource(CampaignResponseDto source)
    {
        var signature = string.Join('|',
            source.TotalCampaigns,
            source.TotalProductsAnalyzed,
            string.Join(',', source.Campaigns.Select(c => $"{c.ProductId}:{c.Score}")));

        return Hash(signature);
    }

    /// <summary>
    /// Approximates the token weight of a campaign response, used when the
    /// provider reports no usage metadata (the mock path, and any short-circuit
    /// before the API answers).
    /// </summary>
    public static int EstimateResponseTokens(CampaignResponseDto response)
    {
        var total = 0;

        foreach (var campaign in response.Campaigns)
        {
            total += AiTokenEstimator.Estimate(campaign.Title);
            total += AiTokenEstimator.Estimate(campaign.Rationale);
            total += AiTokenEstimator.Estimate(campaign.InstagramCaption);
            total += AiTokenEstimator.Estimate(campaign.ReelScript);
            total += AiTokenEstimator.Estimate(campaign.Cta);
            total += campaign.CarouselSlides.Sum(AiTokenEstimator.Estimate);
            total += campaign.Hashtags.Sum(AiTokenEstimator.Estimate);
        }

        return total;
    }

    /// <summary>Hashes a signature into a fixed-length lowercase hex fragment.</summary>
    private static string Hash(string signature)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(signature));

        return Convert.ToHexString(bytes)[..HashLength].ToLowerInvariant();
    }
}
