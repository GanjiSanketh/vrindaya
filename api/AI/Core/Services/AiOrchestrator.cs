using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IAiOrchestrator"/>. Routes campaign generation,
/// summarization and health probes to the AI provider chosen by
/// <see cref="IAiProviderSelector"/> from the "AI:Provider" configuration
/// value:
///
/// <list type="bullet">
///   <item>"Gemini" — every request goes to the live Gemini provider;</item>
///   <item>"Mock" (or anything unrecognized) — every request goes to the
///         deterministic mock provider.</item>
/// </list>
///
/// The decision is taken once per request and then reused for the call itself
/// and for every telemetry entry derived from it, so a configuration reload
/// mid-flight can never route the call to one provider and attribute it to
/// another. A reload between requests still takes effect immediately — the
/// orchestrator holds no cached provider.
///
/// The orchestrator owns the request flow only — prompt construction, provider
/// selection and response shaping stay behind their abstractions, so the
/// orchestrator never references a concrete provider and no caller needs a
/// switch statement to pick one.
///
/// Every routed request is also recorded to <see cref="IAiDiagnostics"/> —
/// response time, provider, model, token estimate and success/failure — and to
/// <see cref="IAiUsageService"/> — provider, module, execution time and estimated
/// tokens, plus success/failure. Cost is estimated via <see cref="IAiCostEstimator"/>
/// and attached to the usage entry. That recording is strictly observational: it
/// never alters a response, never suppresses an exception the caller should see,
/// and never stores request text (only a content-derived hash).
/// </summary>
public sealed class AiOrchestrator : IAiOrchestrator
{
    private readonly IAiProviderSelector _providerSelector;
    private readonly IAiDiagnostics _diagnostics;
    private readonly IAiUsageService _usage;
    private readonly IAiCostEstimator _costEstimator;
    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly ILogger<AiOrchestrator> _logger;

    /// <summary>MIME type requested when a module asks for a JSON payload.</summary>
    private const string JsonMimeType = "application/json";

    /// <summary>Deserialization settings for module-requested JSON payloads.</summary>
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public AiOrchestrator(
        IAiProviderSelector providerSelector,
        IAiDiagnostics diagnostics,
        IAiUsageService usage,
        IAiCostEstimator costEstimator,
        IOptions<GeminiSettings> geminiSettings,
        ILogger<AiOrchestrator> logger)
    {
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _diagnostics = diagnostics ?? throw new ArgumentNullException(nameof(diagnostics));
        _usage = usage ?? throw new ArgumentNullException(nameof(usage));
        _costEstimator = costEstimator ?? throw new ArgumentNullException(nameof(costEstimator));
        _geminiSettings = geminiSettings ?? throw new ArgumentNullException(nameof(geminiSettings));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public AiProviderType ActiveProvider => _providerSelector.ActiveProvider;

    public string ActiveProviderName => _providerSelector.Resolve().ProviderName;

    public async Task<CampaignResponseDto> GenerateCampaignsAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        if (request.MaximumCampaigns < 1)
            throw new ArgumentException(
                "MaximumCampaigns must be at least 1.", nameof(request));

        // One routing decision per request: the provider type and the instance
        // it maps to are captured together, then reused everywhere below.
        var providerType = _providerSelector.ActiveProvider;
        var provider = _providerSelector.Resolve(providerType);
        var promptHash = AiRequestSignature.ForCampaignRequest(request);

        _logger.LogInformation(
            "AiOrchestrator: routing campaign generation for objective {Objective} to {Provider} ({ProviderType}).",
            request.PreferredObjective,
            provider.ProviderName,
            providerType);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await provider.GenerateAsync(request, cancellationToken);
            stopwatch.Stop();

            _logger.LogInformation(
                "AiOrchestrator: {Provider} returned {TotalCampaigns} campaigns.",
                provider.ProviderName,
                response.TotalCampaigns);

            RecordSuccess(
                operation: "campaigns",
                providerType: providerType,
                provider: provider,
                promptHash: promptHash,
                responseTokens: AiRequestSignature.EstimateResponseTokens(response),
                elapsedMs: stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            RecordFailure("campaigns", providerType, provider, promptHash, ex, stopwatch.ElapsedMilliseconds);

            // Observational only — the caller still sees the original failure.
            throw;
        }
    }

    public async Task<AiSummaryResponse> SummarizeAsync(
        CampaignResponseDto source,
        CancellationToken cancellationToken = default)
    {
        if (source is null)
            throw new ArgumentNullException(nameof(source));

        var providerType = _providerSelector.ActiveProvider;
        var provider = _providerSelector.Resolve(providerType);
        var promptHash = AiRequestSignature.ForSummarySource(source);

        _logger.LogInformation(
            "AiOrchestrator: routing summarization of {TotalCampaigns} campaigns to {Provider} ({ProviderType}).",
            source.TotalCampaigns,
            provider.ProviderName,
            providerType);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var summary = await provider.SummarizeAsync(source, cancellationToken);
            stopwatch.Stop();

            RecordSuccess(
                operation: "summary",
                providerType: providerType,
                provider: provider,
                promptHash: promptHash,
                responseTokens: AiTokenEstimator.Estimate(summary.Summary),
                elapsedMs: stopwatch.ElapsedMilliseconds);

            return summary;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            RecordFailure("summary", providerType, provider, promptHash, ex, stopwatch.ElapsedMilliseconds);

            throw;
        }
    }

    public async Task<AiProviderHealthStatus> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        var providerType = _providerSelector.ActiveProvider;
        var provider = _providerSelector.Resolve(providerType);
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var status = await provider.HealthCheckAsync(cancellationToken);
            stopwatch.Stop();

            var model = ResolveModel(providerType, provider);
            var latencyMs = status.LatencyMs > 0 ? status.LatencyMs : stopwatch.ElapsedMilliseconds;

            _diagnostics.Record(new AiDiagnosticsEntry
            {
                Operation = "health",
                Provider = providerType,
                ProviderName = provider.ProviderName,
                Model = model,
                ResponseTimeMs = latencyMs,
                IsSuccess = status.IsHealthy,
                Status = status.Status,
                TokensEstimated = true,
            });

            var cost = _costEstimator.Estimate(providerType, model, 0, 0, tokensEstimated: true);

            RecordUsage(
                module: "Health",
                providerType: providerType,
                provider: provider,
                elapsedMs: latencyMs,
                estimatedTokens: 0,
                isSuccess: status.IsHealthy,
                status: status.Status,
                cost: cost);

            return status;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            RecordFailure("health", providerType, provider, promptHash: string.Empty, ex, stopwatch.ElapsedMilliseconds);

            throw;
        }
    }

    public async Task<string> GenerateTextAsync(
        string prompt,
        string? systemInstruction = null,
        string? module = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt must not be empty.", nameof(prompt));

        return await ExecutePromptAsync(
            prompt,
            systemInstruction,
            responseMimeType: null,
            module,
            cancellationToken);
    }

    public async Task<TValue?> GenerateJsonAsync<TValue>(
        string prompt,
        string? systemInstruction = null,
        string? module = null,
        CancellationToken cancellationToken = default)
        where TValue : class
    {
        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt must not be empty.", nameof(prompt));

        var text = await ExecutePromptAsync(
            prompt,
            systemInstruction,
            JsonMimeType,
            module,
            cancellationToken);

        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<TValue>(StripCodeFence(text), JsonOptions);
        }
        catch (JsonException ex)
        {
            // A malformed payload is a provider-quality problem, not a caller
            // error: report null so the module falls back deterministically.
            _logger.LogWarning(ex,
                "AiOrchestrator: {Module} received a payload that is not valid {Contract}.",
                module ?? "prompt",
                typeof(TValue).Name);

            return null;
        }
    }

    /// <summary>
    /// Shared execution path for the free-form prompt surface. Routes to the
    /// provider pinned for this request and records the same diagnostics and
    /// usage telemetry as the campaign path, so every module's AI traffic is
    /// visible in one place.
    /// </summary>
    private async Task<string> ExecutePromptAsync(
        string prompt,
        string? systemInstruction,
        string? responseMimeType,
        string? module,
        CancellationToken cancellationToken)
    {
        var providerType = _providerSelector.ActiveProvider;
        var provider = _providerSelector.Resolve(providerType);
        var operation = string.IsNullOrWhiteSpace(module) ? "prompt" : module!;
        var promptHash = AiRequestSignature.ForPrompt(prompt);

        _logger.LogInformation(
            "AiOrchestrator: routing {Operation} prompt to {Provider} ({ProviderType}).",
            operation,
            provider.ProviderName,
            providerType);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var text = await provider.GenerateTextAsync(
                prompt, systemInstruction, responseMimeType, cancellationToken);

            stopwatch.Stop();

            RecordSuccess(
                operation: operation,
                providerType: providerType,
                provider: provider,
                promptHash: promptHash,
                responseTokens: AiTokenEstimator.Estimate(text),
                elapsedMs: stopwatch.ElapsedMilliseconds);

            return text;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            RecordFailure(operation, providerType, provider, promptHash, ex, stopwatch.ElapsedMilliseconds);

            throw;
        }
    }

    /// <summary>
    /// Strips a markdown code fence the model may wrap JSON in, so the payload
    /// stays deserializable even when the JSON MIME type is not honoured.
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

    /// <summary>
    /// Records a completed operation. Also records a parallel usage entry; token
    /// counts are estimates: the <see cref="IAiProvider"/> contract returns shaped
    /// DTOs rather than raw provider usage metadata, so the orchestrator
    /// approximates from content length and flags the values accordingly.
    ///
    /// Cost is estimated from the response-token count using the configured
    /// per-provider pricing; only Gemini carries real rates — every other provider
    /// is treated as zero-cost.
    /// </summary>
    private void RecordSuccess(
        string operation,
        AiProviderType providerType,
        IAiProvider provider,
        string promptHash,
        int responseTokens,
        long elapsedMs)
    {
        var model = ResolveModel(providerType, provider);

        _diagnostics.Record(new AiDiagnosticsEntry
        {
            Operation = operation,
            Provider = providerType,
            ProviderName = provider.ProviderName,
            Model = model,
            PromptHash = promptHash,
            ResponseTimeMs = elapsedMs,
            ResponseTokens = responseTokens,
            TotalTokens = responseTokens,
            TokensEstimated = true,
            IsSuccess = true,
            Status = nameof(AiDiagnosticsOutcome.Success),
        });

        var cost = _costEstimator.Estimate(providerType, model, 0, responseTokens, tokensEstimated: true);

        RecordUsage(
            operation,
            providerType,
            provider,
            elapsedMs,
            responseTokens,
            true,
            nameof(AiUsageOutcome.Success),
            cost: cost);
    }

    /// <summary>Records a failed operation without altering the exception flow.</summary>
    private void RecordFailure(
        string operation,
        AiProviderType providerType,
        IAiProvider provider,
        string promptHash,
        Exception exception,
        long elapsedMs)
    {
        var status = exception is OperationCanceledException
            ? nameof(AiDiagnosticsOutcome.Cancelled)
            : nameof(AiDiagnosticsOutcome.Failed);

        var model = ResolveModel(providerType, provider);

        _diagnostics.Record(new AiDiagnosticsEntry
        {
            Operation = operation,
            Provider = providerType,
            ProviderName = provider.ProviderName,
            Model = model,
            PromptHash = promptHash,
            ResponseTimeMs = elapsedMs,
            TokensEstimated = true,
            IsSuccess = false,
            Status = status,
            ErrorMessage = exception.Message,
        });

        var cost = _costEstimator.Estimate(providerType, model, 0, 0, tokensEstimated: true);

        RecordUsage(operation, providerType, provider, elapsedMs, 0, false, status, exception.Message, cost: cost);
    }

    /// <summary>
    /// Records an in-memory usage entry for the routed request. Observational
    /// only — never alters a response or suppresses an exception. Includes the
    /// cost estimate produced by <see cref="IAiCostEstimator"/>.
    /// </summary>
    private void RecordUsage(
        string module,
        AiProviderType providerType,
        IAiProvider provider,
        long elapsedMs,
        int estimatedTokens,
        bool isSuccess,
        string status,
        string? errorMessage = null,
        AiCostEstimate? cost = null)
    {
        _usage.Record(new AiUsageEntry
        {
            Module = module,
            Provider = providerType,
            ProviderName = provider.ProviderName,
            Model = ResolveModel(providerType, provider),
            ExecutionTimeMs = elapsedMs,
            EstimatedTokens = estimatedTokens,
            TokensEstimated = true,
            IsSuccess = isSuccess,
            Status = status,
            ErrorMessage = errorMessage,
            EstimatedCostUsd = cost?.EstimatedCostUsd ?? 0m,
            Currency = cost?.Currency ?? "USD",
        });
    }

    /// <summary>
    /// The model attributed to an operation, for the provider the request was
    /// actually routed to. Only the Gemini path has a model name; the mock
    /// provider is reported as its own implementation.
    /// </summary>
    private string ResolveModel(AiProviderType providerType, IAiProvider provider) =>
        providerType == AiProviderType.Gemini
            ? _geminiSettings.Value.Model
            : provider.ProviderName;
}
