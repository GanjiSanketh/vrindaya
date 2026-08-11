using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Prompts;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;
using Vrindaya.Api.AI.Core.Services;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// <see cref="IAiProvider"/> implementation backed by Google's Gemini content
/// generation API. Every operation — campaign generation, summarization and the
/// health probe — issues a real call through <see cref="IGeminiHttpClient"/>.
/// There is no mock payload and no offline branch: this provider either returns
/// model output or throws.
///
/// The prompt itself is produced by the shared <see cref="IPromptBuilder"/> —
/// the provider adds only the response-contract system instruction, so prompt
/// wording stays owned by the Campaigns module.
///
/// Failures surface as <see cref="GeminiApiException"/> from the transport.
/// Callers that want a deterministic answer when Gemini is unavailable select
/// the mock provider through <see cref="IAiProviderSelector"/> — that decision
/// belongs to configuration, not to this type.
///
/// Configuration comes from the "AI:Gemini"/"Gemini" sections via
/// <see cref="GeminiSettings"/>, overridable by environment variables
/// (Gemini__ApiKey, AI__Gemini__ApiKey, …). The API key is sent as a header by
/// the transport and is never logged.
/// </summary>
public sealed class GeminiAiProvider : IAiProvider
{
    private readonly IGeminiHttpClient _geminiHttpClient;
    private readonly IOptions<GeminiSettings> _options;
    private readonly IPromptBuilder _promptBuilder;
    private readonly ILogger<GeminiAiProvider> _logger;

    /// <summary>MIME type requested from the model for structured campaign output.</summary>
    private const string JsonMimeType = "application/json";

    /// <summary>
    /// System instruction pinning the model to the internal campaign contract.
    /// Combined with responseMimeType=application/json this keeps the payload
    /// directly deserializable into <see cref="CampaignResponseDto"/>.
    /// </summary>
    private const string CampaignSystemInstruction =
        "You are the marketing campaign strategist for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"campaigns\":[{\"productId\":string,\"productName\":string,\"category\":string," +
        "\"title\":string,\"objective\":string,\"rationale\":string,\"score\":0-100,\"priority\":\"Low\"|\"Medium\"|\"High\"," +
        "\"confidence\":0.0-1.0,\"expectedRoi\":number,\"estimatedRevenue\":number,\"instagramCaption\":string," +
        "\"reelScript\":string,\"carouselSlides\":[string],\"hashtags\":[string],\"cta\":string}]}. " +
        "Order campaigns by score descending and keep the objective identical to the requested one.";

    /// <summary>System instruction for the summarization round trip.</summary>
    private const string SummarySystemInstruction =
        "You summarize a marketing campaign plan for a busy store owner. " +
        "Reply with a single plain-text paragraph of at most 45 words. No markdown, no lists.";

    /// <summary>System instruction for the health probe.</summary>
    private const string HealthSystemInstruction = "Reply with the single word: OK.";

    /// <summary>
    /// Deserialization settings for the campaign payload carried inside the
    /// candidate text.
    /// </summary>
    private static readonly JsonSerializerOptions ResponseJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public GeminiAiProvider(
        IGeminiHttpClient geminiHttpClient,
        IOptions<GeminiSettings> options,
        IPromptBuilder promptBuilder,
        ILogger<GeminiAiProvider> logger)
    {
        _geminiHttpClient = geminiHttpClient ?? throw new ArgumentNullException(nameof(geminiHttpClient));
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public string ProviderName => "GeminiAiProvider";

    /// <summary>
    /// Always false: this provider generates nothing of its own. Consumers that
    /// report mock mode see the mock provider only when configuration selects it.
    /// </summary>
    public bool IsMock => false;

    public async Task<CampaignResponseDto> GenerateAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        var prompt = _promptBuilder.Build(request, suggestions: null);

        var text = await _geminiHttpClient.GenerateAsync(
            prompt,
            CampaignSystemInstruction,
            JsonMimeType,
            cancellationToken);

        var response = ParseCampaigns(text);

        _logger.LogInformation(
            "GeminiAiProvider generated {Total} campaign(s) for objective {Objective} using model {Model}.",
            response.TotalCampaigns,
            request.PreferredObjective,
            _options.Value.Model);

        return response;
    }

    public async Task<AiSummaryResponse> SummarizeAsync(
        CampaignResponseDto source,
        CancellationToken cancellationToken = default)
    {
        if (source is null)
            throw new ArgumentNullException(nameof(source));

        cancellationToken.ThrowIfCancellationRequested();

        var summary = await _geminiHttpClient.GenerateAsync(
            BuildSummaryPrompt(source),
            SummarySystemInstruction,
            responseMimeType: null,
            cancellationToken);

        _logger.LogInformation(
            "GeminiAiProvider summarized {Total} campaign{s}.",
            source.TotalCampaigns,
            source.TotalCampaigns == 1 ? string.Empty : "s");

        return new AiSummaryResponse
        {
            Summary = summary.Trim(),
            TotalItems = source.TotalCampaigns,
            GeneratedAt = DateTime.UtcNow,
        };
    }

    public async Task<AiProviderHealthStatus> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var probe = await _geminiHttpClient.GenerateAsync(
                "ping",
                HealthSystemInstruction,
                responseMimeType: null,
                cancellationToken);

            stopwatch.Stop();

            return new AiProviderHealthStatus
            {
                IsHealthy = !string.IsNullOrWhiteSpace(probe),
                Status = string.IsNullOrWhiteSpace(probe) ? "Unreachable" : "OK",
                LatencyMs = stopwatch.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow,
            };
        }
        catch (GeminiApiException ex)
        {
            stopwatch.Stop();

            // A health probe reports; it does not fail the caller. The reason is
            // carried in Status so operators can act on it. The full failure is
            // logged first so the swallowed reason is never lost.
            _logger.LogError(
                ex,
                "GeminiAiProvider: health probe failed. {FailureDetail}",
                AiFailureLog.Describe(ex));

            return new AiProviderHealthStatus
            {
                IsHealthy = false,
                Status = $"Unhealthy — {ex.Message}",
                LatencyMs = stopwatch.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow,
            };
        }
    }

    public async Task<string> GenerateTextAsync(
        string prompt,
        string? systemInstruction = null,
        string? responseMimeType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt must not be empty.", nameof(prompt));

        cancellationToken.ThrowIfCancellationRequested();

        var text = await _geminiHttpClient.GenerateAsync(
            prompt,
            systemInstruction,
            responseMimeType,
            cancellationToken);

        _logger.LogDebug(
            "GeminiAiProvider generated {Characters} characters using model {Model}.",
            text.Length,
            _options.Value.Model);

        return text;
    }

    /// <summary>Builds the summarization prompt from an existing campaign plan.</summary>
    private static string BuildSummaryPrompt(CampaignResponseDto source)
    {
        var lines = source.Campaigns
            .Where(c => !string.IsNullOrWhiteSpace(c.Title))
            .Take(10)
            .Select(c => $"- {c.Title} ({c.Objective}, score {c.Score}, priority {c.Priority})");

        return $"Campaign plan generated on {source.GeneratedAt:yyyy-MM-dd} " +
               $"with {source.TotalCampaigns} campaigns:{Environment.NewLine}" +
               string.Join(Environment.NewLine, lines);
    }

    /// <summary>
    /// Translates the model's JSON text into the strongly typed
    /// <see cref="CampaignResponseDto"/>. A payload that does not match the
    /// contract is an error, not something to paper over with synthetic
    /// content — the caller decides how to recover.
    /// </summary>
    private static CampaignResponseDto ParseCampaigns(string text)
    {
        CampaignResponseDto? parsed;

        try
        {
            parsed = JsonSerializer.Deserialize<CampaignResponseDto>(
                StripCodeFence(text), ResponseJsonOptions);
        }
        catch (JsonException ex)
        {
            throw new GeminiApiException(
                "Gemini returned text that is not a valid campaign payload.", ex);
        }

        if (parsed is not { Campaigns.Count: > 0 })
        {
            throw new GeminiApiException("Gemini returned no campaigns.");
        }

        parsed.GeneratedAt = parsed.GeneratedAt == default ? DateTime.UtcNow : parsed.GeneratedAt;
        parsed.TotalCampaigns = parsed.Campaigns.Count;
        parsed.TotalProductsAnalyzed = parsed.TotalProductsAnalyzed > 0
            ? parsed.TotalProductsAnalyzed
            : parsed.Campaigns.Count;

        return parsed;
    }

    /// <summary>
    /// Strips a markdown code fence the model may wrap JSON in, so the payload
    /// stays deserializable even when responseMimeType is not honoured.
    /// </summary>
    private static string StripCodeFence(string text)
    {
        var trimmed = text.Trim();

        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
            return trimmed;

        var firstBreak = trimmed.IndexOf('\n');
        if (firstBreak < 0)
            return trimmed;

        var body = trimmed[(firstBreak + 1)..];
        var lastFence = body.LastIndexOf("```", StringComparison.Ordinal);

        return (lastFence >= 0 ? body[..lastFence] : body).Trim();
    }
}
