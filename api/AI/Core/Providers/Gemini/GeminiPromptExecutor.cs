using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;
using Vrindaya.Api.AI.Core.Providers.Gemini.Models;
using Vrindaya.Api.AI.Core.Services;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// Default <see cref="IGeminiPromptExecutor"/>. Owns exactly one concern: the
/// Gemini "generateContent" round trip — serialize the prompt into a
/// <see cref="GeminiRequest"/>, POST it over the typed <see cref="HttpClient"/>,
/// deserialize the <see cref="GeminiResponse"/> and project it onto a
/// <see cref="GeminiPromptResult"/>.
///
/// Reuses the existing provider infrastructure: the same wire models, the same
/// <see cref="GeminiSettings"/> ("AI:Gemini") and the same typed HttpClient
/// registration used by <see cref="GeminiAiProvider"/>.
///
/// Failure handling is deliberately flat — every transport, timeout, safety and
/// parse problem becomes a <see cref="GeminiExecutionStatus"/> on the result.
/// Retries are applied by <see cref="GeminiRetryHandler"/> inside the
/// HttpClient pipeline, not here.
///
/// Successful results are memoized by <see cref="IAiResponseCache"/> on the
/// prompt/provider/model triple, so a repeated prompt is served from memory
/// instead of being billed again. Failures are never cached.
///
/// The API key travels in the <c>x-goog-api-key</c> header only; it is never
/// placed in a URL, a result field or a log entry.
/// </summary>
public sealed class GeminiPromptExecutor : IGeminiPromptExecutor
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<GeminiSettings> _options;
    private readonly IAiResponseCache _responseCache;
    private readonly IAiDiagnostics _diagnostics;
    private readonly ILogger<GeminiPromptExecutor> _logger;

    /// <summary>Fallback base address when <see cref="GeminiSettings.BaseUrl"/> is blank.</summary>
    private const string DefaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

    /// <summary>Header carrying the API key on every Gemini request.</summary>
    private const string ApiKeyHeader = "x-goog-api-key";

    /// <summary>MIME type used for the request body and for JSON-mode responses.</summary>
    private const string JsonMimeType = "application/json";

    /// <summary>
    /// Serialization settings for the outbound <see cref="GeminiRequest"/>.
    /// Property names come from the wire models' <c>JsonPropertyName</c>
    /// attributes; null members are dropped so the API applies its own defaults.
    /// </summary>
    private static readonly JsonSerializerOptions RequestJsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>
    /// Deserialization settings for the inbound <see cref="GeminiResponse"/> and
    /// for any typed payload carried inside the candidate text.
    /// </summary>
    private static readonly JsonSerializerOptions ResponseJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public GeminiPromptExecutor(
        HttpClient httpClient,
        IOptions<GeminiSettings> options,
        IAiResponseCache responseCache,
        IAiDiagnostics diagnostics,
        ILogger<GeminiPromptExecutor> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _responseCache = responseCache ?? throw new ArgumentNullException(nameof(responseCache));
        _diagnostics = diagnostics ?? throw new ArgumentNullException(nameof(diagnostics));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.Value.ApiKey);

    public async Task<GeminiPromptResult> ExecuteAsync(
        string prompt,
        string? systemInstruction = null,
        string? responseMimeType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt must not be empty.", nameof(prompt));

        cancellationToken.ThrowIfCancellationRequested();

        var options = _options.Value;

        if (!IsConfigured)
        {
            _logger.LogWarning(
                "GeminiPromptExecutor: no API key configured — prompt not executed.");

            return Failure(
                GeminiExecutionStatus.NotConfigured,
                "No Gemini API key is configured.",
                options.Model,
                latencyMs: 0);
        }

        // The model is never hardcoded and never defaulted here — it must come
        // from configuration. A blank value fails before any URL is built so a
        // deployment can never silently hit a model it did not select.
        if (string.IsNullOrWhiteSpace(options.Model))
        {
            _logger.LogWarning(
                "GeminiPromptExecutor: no model configured — prompt not executed.");

            return Failure(
                GeminiExecutionStatus.NotConfigured,
                "No Gemini model is configured (set Gemini__Model or AI__Gemini__Model).",
                options.Model,
                latencyMs: 0);
        }

        var cacheKeyPrompt = $"{systemInstruction}\n{prompt}";
        var operation = responseMimeType == JsonMimeType ? "json" : "text";

        // A cache hit is inferred rather than reported: the factory only runs on
        // a miss, so if it never ran the answer came from the cache.
        var factoryRan = false;
        var stopwatch = Stopwatch.StartNew();

        // Identical prompt + provider + model ⇒ identical answer, so memoize the
        // round trip. The system instruction is part of the hashed prompt, since
        // it changes the answer too. Only successful results are kept: a failure
        // is transient by nature and must be retried on the next call.
        var result = await _responseCache.GetOrCreateAsync(
            cacheKeyPrompt,
            AiProviderType.Gemini,
            options.Model,
            ct =>
            {
                factoryRan = true;
                return ExecuteUncachedAsync(prompt, systemInstruction, responseMimeType, ct);
            },
            operation,
            cancellationToken);

        stopwatch.Stop();

        if (result is { IsSuccess: false })
        {
            _responseCache.Remove(cacheKeyPrompt, AiProviderType.Gemini, options.Model, operation);
        }

        result ??= Failure(
            GeminiExecutionStatus.EmptyResponse,
            "Gemini returned no result.",
            options.Model,
            latencyMs: 0);

        RecordDiagnostics(
            operation,
            options.Model,
            cacheKeyPrompt,
            result,
            cacheHit: !factoryRan,
            elapsedMs: stopwatch.ElapsedMilliseconds);

        return result;
    }

    /// <summary>
    /// Publishes telemetry for a completed execution: response time, provider,
    /// model, cache hit, token estimate and success/failure. Token counts come
    /// from the provider when reported, and are estimated otherwise. Recording
    /// never affects the returned result.
    /// </summary>
    private void RecordDiagnostics(
        string operation,
        string model,
        string prompt,
        GeminiPromptResult result,
        bool cacheHit,
        long elapsedMs)
    {
        var reportedTokens = result.TotalTokenCount > 0;

        var promptTokens = reportedTokens
            ? result.PromptTokenCount
            : AiTokenEstimator.Estimate(prompt);

        var responseTokens = reportedTokens
            ? result.CandidateTokenCount
            : AiTokenEstimator.Estimate(result.Text);

        _diagnostics.Record(new AiDiagnosticsEntry
        {
            Operation = operation,
            Provider = AiProviderType.Gemini,
            ProviderName = nameof(GeminiPromptExecutor),
            Model = model,
            PromptHash = ExtractPromptHash(
                _responseCache.BuildKey(prompt, AiProviderType.Gemini, model, operation)),
            ResponseTimeMs = cacheHit ? elapsedMs : result.LatencyMs,
            CacheHit = cacheHit,
            PromptTokens = promptTokens,
            ResponseTokens = responseTokens,
            TotalTokens = reportedTokens ? result.TotalTokenCount : promptTokens + responseTokens,
            TokensEstimated = !reportedTokens,
            IsSuccess = result.IsSuccess,
            Status = result.Status.ToString(),
            ErrorMessage = result.ErrorMessage,
        });
    }

    /// <summary>
    /// Performs the actual round trip, with no caching. Split out so the cache
    /// wraps exactly one call site and the transport logic stays untouched.
    /// </summary>
    private async Task<GeminiPromptResult> ExecuteUncachedAsync(
        string prompt,
        string? systemInstruction,
        string? responseMimeType,
        CancellationToken cancellationToken)
    {
        var options = _options.Value;

        // Overall budget: GeminiRetryHandler owns the per-attempt TimeoutSeconds
        // window and the backoff between attempts, so this ceiling must cover
        // the whole retry sequence or it would cut a healthy retry short.
        var overallTimeout = options.OverallTimeout;

        // Linked to the caller's token, so the two sources stay distinguishable
        // in the catch blocks below.
        using var timeoutCts = new CancellationTokenSource(overallTimeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken, timeoutCts.Token);

        using var httpRequest = BuildHttpRequest(options, prompt, systemInstruction, responseMimeType);

        // Captured up front so a failed call can be logged with the exact URL
        // (the API key travels only in a header, never in the URL) and the
        // exact payload that was sent.
        var requestUrl = httpRequest.RequestUri?.ToString() ?? string.Empty;
        var requestPayload = await httpRequest.Content!.ReadAsStringAsync(linkedCts.Token);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var httpResponse = await _httpClient.SendAsync(
                httpRequest,
                HttpCompletionOption.ResponseHeadersRead,
                linkedCts.Token);

            if (!httpResponse.IsSuccessStatusCode)
            {
                stopwatch.Stop();

                var responseBody = await ReadBodySafelyAsync(httpResponse, linkedCts.Token);

                _logger.LogError(
                    "GeminiPromptExecutor: request {Method} {RequestUrl} for model {Model} failed with HTTP " +
                    "{StatusCode} after {ElapsedMs}ms. " +
                    "Request payload: {RequestPayload}. Response body: {ResponseBody}.",
                    HttpMethod.Post,
                    requestUrl,
                    options.Model,
                    (int)httpResponse.StatusCode,
                    stopwatch.ElapsedMilliseconds,
                    requestPayload,
                    responseBody);

                return Failure(
                    GeminiExecutionStatus.HttpError,
                    $"Gemini returned HTTP {(int)httpResponse.StatusCode}.",
                    options.Model,
                    stopwatch.ElapsedMilliseconds);
            }

            await using var stream = await httpResponse.Content.ReadAsStreamAsync(linkedCts.Token);

            var payload = await JsonSerializer.DeserializeAsync<GeminiResponse>(
                stream, ResponseJsonOptions, linkedCts.Token);

            stopwatch.Stop();

            return Project(payload, options.Model, stopwatch.ElapsedMilliseconds);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Caller aborted — surface it instead of masking it as a failure.
            throw;
        }
        catch (OperationCanceledException)
        {
            stopwatch.Stop();

            _logger.LogError(
                "GeminiPromptExecutor: request {Method} {RequestUrl} for model {Model} exhausted its " +
                "{TimeoutSeconds:F0}s overall budget. Request payload: {RequestPayload}.",
                HttpMethod.Post,
                requestUrl,
                options.Model,
                overallTimeout.TotalSeconds,
                requestPayload);

            return Failure(
                GeminiExecutionStatus.Timeout,
                $"Gemini call timed out after {overallTimeout.TotalSeconds:F0}s.",
                options.Model,
                stopwatch.ElapsedMilliseconds);
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "GeminiPromptExecutor: request {Method} {RequestUrl} for model {Model} failed with a transport " +
                "error. {FailureDetail} Request payload: {RequestPayload}.",
                HttpMethod.Post,
                requestUrl,
                options.Model,
                AiFailureLog.Describe(ex),
                requestPayload);

            return Failure(
                GeminiExecutionStatus.TransportError,
                "Gemini could not be reached.",
                options.Model,
                stopwatch.ElapsedMilliseconds);
        }
        catch (JsonException ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "GeminiPromptExecutor: request {Method} {RequestUrl} for model {Model} returned an unreadable " +
                "response body. {FailureDetail} Request payload: {RequestPayload}.",
                HttpMethod.Post,
                requestUrl,
                options.Model,
                AiFailureLog.Describe(ex),
                requestPayload);

            return Failure(
                GeminiExecutionStatus.InvalidResponse,
                "Gemini returned an unreadable response body.",
                options.Model,
                stopwatch.ElapsedMilliseconds);
        }
    }

    /// <summary>
    /// Reads a failed response's body for logging. Never throws: an unreadable
    /// body must not mask the HTTP failure it was already about to report.
    /// </summary>
    private async Task<string> ReadBodySafelyAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        try
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            return body ?? string.Empty;
        }
        catch (Exception ex) when (ex is JsonException or HttpRequestException or InvalidOperationException)
        {
            _logger.LogWarning(
                ex,
                "GeminiPromptExecutor: could not read the error body. {FailureDetail}",
                AiFailureLog.Describe(ex));

            return string.Empty;
        }
    }

    public async Task<GeminiPromptResult<TValue>> ExecuteAsync<TValue>(
        string prompt,
        string? systemInstruction = null,
        CancellationToken cancellationToken = default)
        where TValue : class
    {
        var result = await ExecuteAsync(prompt, systemInstruction, JsonMimeType, cancellationToken);

        if (!result.IsSuccess)
        {
            return Wrap<TValue>(result, value: null, result.Status, result.ErrorMessage);
        }

        try
        {
            var value = JsonSerializer.Deserialize<TValue>(
                StripCodeFence(result.Text), ResponseJsonOptions);

            if (value is null)
            {
                _logger.LogWarning(
                    "GeminiPromptExecutor: model {Model} returned a null {Contract} payload.",
                    result.Model,
                    typeof(TValue).Name);

                return Wrap<TValue>(
                    result,
                    value: null,
                    GeminiExecutionStatus.EmptyResponse,
                    $"Gemini returned a null {typeof(TValue).Name} payload.");
            }

            return Wrap(result, value, GeminiExecutionStatus.Success, errorMessage: null);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex,
                "GeminiPromptExecutor: model {Model} returned text that is not a valid {Contract} payload.",
                result.Model,
                typeof(TValue).Name);

            return Wrap<TValue>(
                result,
                value: null,
                GeminiExecutionStatus.InvalidResponse,
                $"Gemini payload could not be parsed as {typeof(TValue).Name}.");
        }
    }

    /// <summary>
    /// Takes the trailing hash segment of a cache key, so diagnostics carry the
    /// prompt fingerprint alone rather than the whole key.
    /// </summary>
    private static string ExtractPromptHash(string cacheKey)
    {
        var lastSeparator = cacheKey.LastIndexOf(':');

        return lastSeparator >= 0 && lastSeparator < cacheKey.Length - 1
            ? cacheKey[(lastSeparator + 1)..]
            : cacheKey;
    }

    /// <summary>
    /// Serializes a <see cref="GeminiRequest"/> and wraps it in a POST message
    /// targeting "{BaseUrl}/{model}:generateContent".
    /// </summary>
    private static HttpRequestMessage BuildHttpRequest(
        GeminiSettings options,
        string prompt,
        string? systemInstruction,
        string? responseMimeType)
    {
        var payload = new GeminiRequest
        {
            Contents = new List<GeminiContent>
            {
                new()
                {
                    Role = "user",
                    Parts = new List<GeminiPart> { new() { Text = prompt } },
                },
            },
            SystemInstruction = string.IsNullOrWhiteSpace(systemInstruction)
                ? null
                : new GeminiContent
                {
                    Parts = new List<GeminiPart> { new() { Text = systemInstruction } },
                },
            GenerationConfig = new GeminiGenerationConfig
            {
                Temperature = options.Temperature,
                MaxOutputTokens = options.MaxOutputTokens > 0 ? options.MaxOutputTokens : null,
                ResponseMimeType = responseMimeType,
            },
        };

        var json = JsonSerializer.Serialize(payload, RequestJsonOptions);
        var baseUrl = (string.IsNullOrWhiteSpace(options.BaseUrl) ? DefaultBaseUrl : options.BaseUrl)
            .TrimEnd('/');

        var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"{baseUrl}/{options.Model.Trim()}:generateContent")
        {
            Content = new StringContent(json, Encoding.UTF8, JsonMimeType),
        };

        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(JsonMimeType));
        httpRequest.Headers.TryAddWithoutValidation(ApiKeyHeader, options.ApiKey);

        return httpRequest;
    }

    /// <summary>
    /// Projects a deserialized <see cref="GeminiResponse"/> onto the strongly
    /// typed result, classifying safety blocks and empty candidates.
    /// </summary>
    private GeminiPromptResult Project(GeminiResponse? response, string model, long latencyMs)
    {
        var blockReason = response?.PromptFeedback?.BlockReason;
        if (!string.IsNullOrWhiteSpace(blockReason))
        {
            _logger.LogWarning(
                "GeminiPromptExecutor: prompt blocked by the safety filter ({BlockReason}).",
                blockReason);

            return Failure(
                GeminiExecutionStatus.Blocked,
                $"Prompt blocked by the safety filter ({blockReason}).",
                model,
                latencyMs);
        }

        var candidate = response?.Candidates?.FirstOrDefault();
        var text = candidate?.Content?.Parts?
            .FirstOrDefault(p => !string.IsNullOrWhiteSpace(p.Text))?.Text;

        var usage = response?.UsageMetadata;

        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning(
                "GeminiPromptExecutor: model {Model} returned no text (finish reason {FinishReason}).",
                model,
                candidate?.FinishReason ?? "none");

            return new GeminiPromptResult
            {
                IsSuccess = false,
                Status = GeminiExecutionStatus.EmptyResponse,
                Model = model,
                FinishReason = candidate?.FinishReason,
                PromptTokenCount = usage?.PromptTokenCount ?? 0,
                CandidateTokenCount = usage?.CandidatesTokenCount ?? 0,
                TotalTokenCount = usage?.TotalTokenCount ?? 0,
                LatencyMs = latencyMs,
                ErrorMessage = "Gemini returned no candidate text.",
            };
        }

        _logger.LogDebug(
            "GeminiPromptExecutor: model {Model} responded in {ElapsedMs}ms ({TotalTokens} tokens).",
            model,
            latencyMs,
            usage?.TotalTokenCount ?? 0);

        return new GeminiPromptResult
        {
            IsSuccess = true,
            Status = GeminiExecutionStatus.Success,
            Text = text!.Trim(),
            Model = model,
            FinishReason = candidate?.FinishReason,
            PromptTokenCount = usage?.PromptTokenCount ?? 0,
            CandidateTokenCount = usage?.CandidatesTokenCount ?? 0,
            TotalTokenCount = usage?.TotalTokenCount ?? 0,
            LatencyMs = latencyMs,
        };
    }

    /// <summary>Builds an unsuccessful result carrying the failure classification.</summary>
    private static GeminiPromptResult Failure(
        GeminiExecutionStatus status,
        string errorMessage,
        string model,
        long latencyMs) =>
        new()
        {
            IsSuccess = false,
            Status = status,
            Model = model,
            LatencyMs = latencyMs,
            ErrorMessage = errorMessage,
        };

    /// <summary>Re-shapes a text result into its typed counterpart, preserving metadata.</summary>
    private static GeminiPromptResult<TValue> Wrap<TValue>(
        GeminiPromptResult source,
        TValue? value,
        GeminiExecutionStatus status,
        string? errorMessage)
        where TValue : class =>
        new()
        {
            IsSuccess = value is not null,
            Status = status,
            Value = value,
            Text = source.Text,
            Model = source.Model,
            FinishReason = source.FinishReason,
            PromptTokenCount = source.PromptTokenCount,
            CandidateTokenCount = source.CandidateTokenCount,
            TotalTokenCount = source.TotalTokenCount,
            LatencyMs = source.LatencyMs,
            ErrorMessage = errorMessage,
        };

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
