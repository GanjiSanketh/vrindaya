namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Rough token accounting used by AI diagnostics when a provider reports no
/// usage metadata (the mock provider, and any path that short-circuits before
/// the API answers).
///
/// The heuristic is the widely used ~4 characters per token approximation for
/// English text. It is intentionally cheap and approximate: these numbers drive
/// diagnostics and cost awareness only, never billing or business logic.
/// </summary>
internal static class AiTokenEstimator
{
    /// <summary>Average characters per token for English prose.</summary>
    private const double CharactersPerToken = 4d;

    /// <summary>
    /// Estimates the token count of a text fragment. Returns 0 for empty input.
    /// </summary>
    public static int Estimate(string? text) =>
        string.IsNullOrEmpty(text)
            ? 0
            : (int)Math.Ceiling(text.Length / CharactersPerToken);
}
