using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Providers.Gemini;

namespace Vrindaya.Api.Providers.Gemini;

/// <summary>
/// Provider that generates marketing copy with the Gemini API. Both operations
/// issue a real "generateContent" call through <see cref="IGeminiHttpClient"/>
/// — there is no mock response and no offline branch.
///
/// Configuration (API key, model, temperature, token cap, timeout) is owned by
/// the transport and comes from the "Gemini"/"AI:Gemini" sections, never from a
/// hardcoded value. The key is sent as a header and is never logged.
///
/// Failures surface as <see cref="GeminiApiException"/>, whose message names the
/// cause (rejected key, quota exhausted, upstream error, timeout, …).
/// </summary>
public class GeminiProvider
{
    private readonly IGeminiHttpClient _geminiHttpClient;
    private readonly ILogger<GeminiProvider> _logger;

    /// <summary>Instruction shaping a single Instagram-ready caption.</summary>
    private const string CaptionSystemInstruction =
        "You write Instagram captions for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with the caption only — one short paragraph, no markdown, no commentary, no hashtag list.";

    /// <summary>Instruction shaping a single campaign brief.</summary>
    private const string CampaignSystemInstruction =
        "You are the marketing campaign strategist for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with a concise plain-text campaign brief — no markdown, no commentary.";

    /// <summary>Prompt used when the caller supplies none.</summary>
    private const string DefaultCaptionPrompt =
        "Write an Instagram caption for a handwoven Vrindaya ethnic apparel piece.";

    /// <summary>Prompt used when the caller supplies none.</summary>
    private const string DefaultCampaignPrompt =
        "Draft a marketing campaign brief for Vrindaya's current handmade ethnic apparel collection.";

    public GeminiProvider(IGeminiHttpClient geminiHttpClient, ILogger<GeminiProvider> logger)
    {
        _geminiHttpClient = geminiHttpClient ?? throw new ArgumentNullException(nameof(geminiHttpClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates a caption using Gemini.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The generated caption.</returns>
    /// <exception cref="GeminiApiException">The API call could not produce text.</exception>
    public Task<string> GenerateCaptionAsync(CancellationToken cancellationToken = default) =>
        GenerateCaptionAsync(DefaultCaptionPrompt, cancellationToken);

    /// <summary>
    /// Generates a caption using Gemini from a caller-supplied prompt.
    /// </summary>
    /// <param name="prompt">The prompt describing the caption to write.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The generated caption.</returns>
    /// <exception cref="GeminiApiException">The API call could not produce text.</exception>
    public async Task<string> GenerateCaptionAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var caption = await _geminiHttpClient.GenerateAsync(
            string.IsNullOrWhiteSpace(prompt) ? DefaultCaptionPrompt : prompt,
            CaptionSystemInstruction,
            responseMimeType: null,
            cancellationToken);

        _logger.LogInformation(
            "GeminiProvider generated a caption of {Characters} characters using model {Model}.",
            caption.Length,
            _geminiHttpClient.Model);

        return caption.Trim();
    }

    /// <summary>
    /// Generates a campaign brief using Gemini.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The generated campaign brief.</returns>
    /// <exception cref="GeminiApiException">The API call could not produce text.</exception>
    public Task<string> GenerateCampaignAsync(CancellationToken cancellationToken = default) =>
        GenerateCampaignAsync(DefaultCampaignPrompt, cancellationToken);

    /// <summary>
    /// Generates a campaign brief using Gemini from a caller-supplied prompt.
    /// </summary>
    /// <param name="prompt">The prompt describing the campaign to draft.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The generated campaign brief.</returns>
    /// <exception cref="GeminiApiException">The API call could not produce text.</exception>
    public async Task<string> GenerateCampaignAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var campaign = await _geminiHttpClient.GenerateAsync(
            string.IsNullOrWhiteSpace(prompt) ? DefaultCampaignPrompt : prompt,
            CampaignSystemInstruction,
            responseMimeType: null,
            cancellationToken);

        _logger.LogInformation(
            "GeminiProvider generated a campaign brief of {Characters} characters using model {Model}.",
            campaign.Length,
            _geminiHttpClient.Model);

        return campaign.Trim();
    }
}
