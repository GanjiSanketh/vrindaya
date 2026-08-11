using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Providers.Gemini.Models;
using Vrindaya.Api.AI.Core.Services;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// Default <see cref="IGeminiHttpClient"/>. Builds the Gemini connection from
/// <see cref="IHttpClientFactory"/> and <see cref="GeminiSettings"/> — base
/// address, timeout and headers — and performs the one round trip that turns a
/// prompt into generated text.
///
/// Everything configurable comes from the "AI:Gemini" / "Gemini" configuration
/// sections via <see cref="IOptions{TOptions}"/>, so nothing — least of all the
/// API key — is hardcoded. The key travels in the <c>x-goog-api-key</c> header
/// only; it is never placed in a URL and never logged.
///
/// Using the factory (rather than a long-lived <see cref="HttpClient"/> field)
/// keeps socket handling, handler pooling and DNS refresh with the platform,
/// and lets the shared <see cref="GeminiRetryHandler"/> sit in the pipeline —
/// so throttled and server-side statuses are already retried before this type
/// sees them.
///
/// Failures are thrown, not swallowed: every non-success status maps to a
/// <see cref="GeminiApiException"/> whose message names the cause.
/// </summary>
public sealed class GeminiHttpClient : IGeminiHttpClient
{
    /// <summary>Name of the factory registration this client resolves.</summary>
    public const string ClientName = "Gemini";

    /// <summary>Fallback base address when <see cref="GeminiSettings.BaseUrl"/> is blank.</summary>
    public const string DefaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

    /// <summary>Header carrying the API key on every Gemini request.</summary>
    public const string ApiKeyHeader = "x-goog-api-key";

    /// <summary>MIME type the API speaks, sent as the Accept header.</summary>
    private const string JsonMimeType = "application/json";

    /// <summary>User agent identifying this application to the API.</summary>
    private const string UserAgent = "Vrindaya-AI/1.0";

    /// <summary>
    /// Slack added on top of the settings' overall budget so the client-level
    /// timeout never cancels a retry sequence that is still making progress —
    /// the per-attempt budget belongs to <see cref="GeminiRetryHandler"/>.
    /// </summary>
    private static readonly TimeSpan TimeoutSlack = TimeSpan.FromSeconds(10);

    /// <summary>
    /// Serialization settings for the outbound request. Property names come
    /// from the wire models' <c>JsonPropertyName</c> attributes; null members
    /// are dropped so the API applies its own defaults.
    /// </summary>
    private static readonly JsonSerializerOptions RequestJsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>Deserialization settings for the inbound response and error bodies.</summary>
    private static readonly JsonSerializerOptions ResponseJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<GeminiSettings> _options;
    private readonly ILogger<GeminiHttpClient> _logger;

    public GeminiHttpClient(
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiSettings> options,
        ILogger<GeminiHttpClient> logger)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.Value.ApiKey);

    public Uri BaseAddress => ResolveBaseAddress(_options.Value);

    public TimeSpan Timeout => ResolveTimeout(_options.Value);

    public string Model => _options.Value.Model;

    public HttpClient CreateClient()
    {
        var client = _httpClientFactory.CreateClient(ClientName);

        Configure(client, _options.Value);

        if (!IsConfigured)
        {
            // Not an error here — callers decide whether to fall back. Logged
            // once per client creation, and never with the key itself.
            _logger.LogWarning(
                "GeminiHttpClient: no API key configured — requests made with this client will be rejected by the API.");
        }

        return client;
    }

    public Task<string> GenerateAsync(string prompt, CancellationToken cancellationToken = default) =>
        GenerateAsync(prompt, systemInstruction: null, responseMimeType: null, cancellationToken);

    public async Task<string> GenerateAsync(
        string prompt,
        string? systemInstruction,
        string? responseMimeType,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(prompt))
        {
            throw new ArgumentException("Prompt must not be empty.", nameof(prompt));
        }

        cancellationToken.ThrowIfCancellationRequested();

        var settings = _options.Value;

        if (!IsConfigured)
        {
            throw new GeminiApiException(
                "Gemini is not configured: no API key was supplied. Set Gemini__ApiKey (or AI__Gemini__ApiKey) in the environment.");
        }

        var client = CreateClient();
        var model = ResolveModel(settings);

        using var httpRequest = BuildRequest(model, prompt, systemInstruction, responseMimeType, settings);

        // Captured up front so a failed call can be logged with the exact URL
        // (never containing the API key — it travels only in a header) and the
        // exact payload that was sent.
        var requestUrl = ResolveRequestUrl(client, httpRequest);
        var requestPayload = await httpRequest.Content!.ReadAsStringAsync(cancellationToken);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var httpResponse = await client.SendAsync(
                httpRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                throw await BuildFailureAsync(
                    model, requestUrl, requestPayload, httpResponse, stopwatch, cancellationToken);
            }

            var rawResponse = await httpResponse.Content.ReadAsStringAsync(cancellationToken);

            stopwatch.Stop();

            // Full request/response trail: the exact prompt that was sent (the
            // API key never appears in it — it travels in a header) and the raw
            // Gemini HTTP response body, before any parsing or projection.
            _logger.LogDebug(
                "GeminiHttpClient: request {Method} {RequestUrl} for model {Model} succeeded after " +
                "{ElapsedMs}ms. Request payload: {RequestPayload}. Raw response body: {RawResponse}.",
                HttpMethod.Post,
                requestUrl,
                model,
                stopwatch.ElapsedMilliseconds,
                requestPayload,
                rawResponse);

            var payload = JsonSerializer.Deserialize<GeminiResponse>(rawResponse, ResponseJsonOptions);

            return ExtractText(payload, model, stopwatch.ElapsedMilliseconds);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Caller aborted — surface the cancellation rather than masking it.
            throw;
        }
        catch (OperationCanceledException ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                "GeminiHttpClient: request {Method} {RequestUrl} for model {Model} timed out after " +
                "{TimeoutSeconds:F0}s. Request payload: {RequestPayload}.",
                HttpMethod.Post,
                requestUrl,
                model,
                Timeout.TotalSeconds,
                requestPayload);

            throw new GeminiApiException(
                $"Gemini call to model '{model}' timed out after {Timeout.TotalSeconds:F0}s.",
                ex);
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                "GeminiHttpClient: request {Method} {RequestUrl} for model {Model} could not be reached. " +
                "{FailureDetail} Request payload: {RequestPayload}.",
                HttpMethod.Post,
                requestUrl,
                model,
                AiFailureLog.Describe(ex),
                requestPayload);

            throw new GeminiApiException(
                $"Gemini could not be reached at '{BaseAddress}' for model '{model}'.",
                ex);
        }
        catch (JsonException ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                "GeminiHttpClient: request {Method} {RequestUrl} for model {Model} returned an unreadable " +
                "response body. {FailureDetail} Request payload: {RequestPayload}.",
                HttpMethod.Post,
                requestUrl,
                model,
                AiFailureLog.Describe(ex),
                requestPayload);

            throw new GeminiApiException(
                $"Gemini returned an unreadable response body for model '{model}'.",
                ex);
        }
    }

    /// <summary>
    /// Builds the POST to "{model}:generateContent" carrying the minimal
    /// contents/parts/text payload. The URI is relative, so the client's
    /// configured base address supplies the "/v1beta/models" prefix and the key
    /// stays in the header, never the query string.
    ///
    /// The "./" prefix is required, not cosmetic: "{model}:generateContent"
    /// alone parses as an absolute URI whose scheme is the model name, which
    /// <see cref="Uri"/> refuses to treat as relative.
    /// </summary>
    private static HttpRequestMessage BuildRequest(
        string model,
        string prompt,
        string? systemInstruction,
        string? responseMimeType,
        GeminiSettings settings)
    {
        var payload = new GeminiRequest
        {
            Contents = new List<GeminiContent>
            {
                new()
                {
                    Parts = new List<GeminiPart>
                    {
                        new() { Text = prompt },
                    },
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
                Temperature = settings.Temperature,
                MaxOutputTokens = settings.MaxOutputTokens > 0 ? settings.MaxOutputTokens : null,
                ResponseMimeType = string.IsNullOrWhiteSpace(responseMimeType) ? null : responseMimeType,
            },
        };

        var json = JsonSerializer.Serialize(payload, RequestJsonOptions);

        return new HttpRequestMessage(
            HttpMethod.Post,
            new Uri($"./{Uri.EscapeDataString(model)}:generateContent", UriKind.Relative))
        {
            Content = new StringContent(json, Encoding.UTF8, JsonMimeType),
        };
    }

    /// <summary>
    /// Maps a non-success response onto a descriptive
    /// <see cref="GeminiApiException"/>. The API's own error message is read
    /// from the body when present, so the reason ("API key not valid", "quota
    /// exceeded", …) reaches the log instead of a bare status code. The status
    /// is logged; the key never is.
    /// </summary>
    private async Task<GeminiApiException> BuildFailureAsync(
        string model,
        string requestUrl,
        string requestPayload,
        HttpResponseMessage response,
        Stopwatch stopwatch,
        CancellationToken cancellationToken)
    {
        stopwatch.Stop();

        var statusCode = response.StatusCode;
        var reason = DescribeStatus(statusCode);

        string? rawBody = null;
        GeminiErrorDetail? error = null;

        try
        {
            rawBody = await response.Content.ReadAsStringAsync(cancellationToken);

            error = string.IsNullOrWhiteSpace(rawBody)
                ? null
                : JsonSerializer
                    .Deserialize<GeminiErrorResponse>(rawBody, ResponseJsonOptions)?
                    .Error;
        }
        catch (Exception ex) when (ex is JsonException or HttpRequestException or InvalidOperationException)
        {
            _logger.LogWarning(
                ex,
                "GeminiHttpClient: could not read or parse the error body for model {Model}. {FailureDetail}",
                model,
                AiFailureLog.Describe(ex));
        }

        var detail = string.IsNullOrWhiteSpace(error?.Message) ? null : error!.Message!.Trim();

        _logger.LogError(
            "GeminiHttpClient: request {Method} {RequestUrl} for model {Model} failed with HTTP " +
            "{StatusCode} ({ApiStatus}) after {ElapsedMs}ms. " +
            "Request payload: {RequestPayload}. Response body: {ResponseBody}.",
            HttpMethod.Post,
            requestUrl,
            model,
            (int)statusCode,
            error?.Status ?? "unknown",
            stopwatch.ElapsedMilliseconds,
            requestPayload,
            rawBody ?? string.Empty);

        var message = detail is null
            ? $"Gemini request for model '{model}' failed with HTTP {(int)statusCode}: {reason}"
            : $"Gemini request for model '{model}' failed with HTTP {(int)statusCode}: {reason} — {detail}";

        return new GeminiApiException(message, statusCode, error?.Status);
    }

    /// <summary>
    /// Human-readable cause per status, so a caller reading the exception knows
    /// what to do about it. The five statuses called out explicitly are the ones
    /// the API actually uses to signal actionable conditions.
    /// </summary>
    private static string DescribeStatus(HttpStatusCode statusCode) => statusCode switch
    {
        HttpStatusCode.BadRequest =>
            "the request was rejected as malformed — check the model name, prompt content and generation settings.",
        HttpStatusCode.Unauthorized =>
            "the API key was not accepted — verify Gemini__ApiKey is set to a valid, unexpired key.",
        HttpStatusCode.Forbidden =>
            "the API key is valid but not permitted to use this model or the Generative Language API is not enabled for the project.",
        HttpStatusCode.TooManyRequests =>
            "the rate limit or quota was exceeded — retries were already exhausted, so back off before retrying.",
        HttpStatusCode.InternalServerError =>
            "Gemini reported an internal server error — the request was well-formed but could not be served.",
        HttpStatusCode.NotFound =>
            "the model or endpoint does not exist — check the configured model name.",
        HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable or HttpStatusCode.GatewayTimeout =>
            "Gemini is temporarily unavailable — retries were already exhausted.",
        _ => "the API returned an unexpected status.",
    };

    /// <summary>
    /// Projects the response onto the generated text of the first candidate.
    /// A blocked prompt, an absent candidate or an empty text block are all
    /// failures — a caller asking for text must never receive "".
    /// </summary>
    private string ExtractText(GeminiResponse? payload, string model, long elapsedMs)
    {
        if (payload is null)
        {
            throw new GeminiApiException(
                $"Gemini returned an empty response body for model '{model}'.");
        }

        var blockReason = payload.PromptFeedback?.BlockReason;
        if (!string.IsNullOrWhiteSpace(blockReason))
        {
            throw new GeminiApiException(
                $"Gemini blocked the prompt for model '{model}': {blockReason}.");
        }

        var candidate = payload.Candidates?.FirstOrDefault();
        if (candidate is null)
        {
            throw new GeminiApiException(
                $"Gemini returned no candidates for model '{model}'.");
        }

        var text = string.Concat(
            candidate.Content?.Parts?
                .Select(part => part.Text)
                .Where(part => !string.IsNullOrEmpty(part))
                ?? []);

        if (string.IsNullOrWhiteSpace(text))
        {
            var finishReason = string.IsNullOrWhiteSpace(candidate.FinishReason)
                ? "no finish reason was reported"
                : $"finish reason was '{candidate.FinishReason}'";

            throw new GeminiApiException(
                $"Gemini returned no text for model '{model}' — {finishReason}.");
        }

        _logger.LogDebug(
            "GeminiHttpClient: model {Model} generated {Characters} characters in {ElapsedMs}ms.",
            model,
            text.Length,
            elapsedMs);

        return text;
    }

    /// <summary>Model name guarded against a blank configuration value.</summary>
    private static string ResolveModel(GeminiSettings settings) =>
        string.IsNullOrWhiteSpace(settings.Model) ? "gemini-2.5-flash" : settings.Model.Trim();

    /// <summary>
    /// Resolves the absolute URL a request will be sent to, for failure
    /// logging. The API key is never part of the URL (it travels in the
    /// <c>x-goog-api-key</c> header), so logging the resolved URL is safe.
    /// </summary>
    private static string ResolveRequestUrl(HttpClient client, HttpRequestMessage request)
    {
        if (request.RequestUri is null)
        {
            return string.Empty;
        }

        if (request.RequestUri.IsAbsoluteUri)
        {
            return request.RequestUri.ToString();
        }

        return client.BaseAddress is null
            ? request.RequestUri.ToString()
            : new Uri(client.BaseAddress, request.RequestUri).ToString();
    }

    /// <summary>
    /// Applies base address, timeout and headers to a factory-supplied client.
    /// Shared with the factory registration so a client is configured
    /// identically whether it is built here or by the DI pipeline, and applied
    /// per creation so a configuration reload is picked up.
    /// </summary>
    internal static void Configure(HttpClient client, GeminiSettings settings)
    {
        client.BaseAddress = ResolveBaseAddress(settings);
        client.Timeout = ResolveTimeout(settings);

        client.DefaultRequestHeaders.Accept.Clear();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(JsonMimeType));

        client.DefaultRequestHeaders.UserAgent.Clear();
        client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);

        client.DefaultRequestHeaders.Remove(ApiKeyHeader);

        if (!string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            client.DefaultRequestHeaders.TryAddWithoutValidation(ApiKeyHeader, settings.ApiKey);
        }
    }

    /// <summary>
    /// Resolves the configured base URL, falling back to the public endpoint
    /// when it is blank or malformed, and guarantees a trailing slash so
    /// relative request URIs append rather than replace the last segment.
    /// </summary>
    private static Uri ResolveBaseAddress(GeminiSettings settings)
    {
        var configured = string.IsNullOrWhiteSpace(settings.BaseUrl)
            ? DefaultBaseUrl
            : settings.BaseUrl.Trim();

        if (!Uri.TryCreate(configured, UriKind.Absolute, out var baseUri))
        {
            baseUri = new Uri(DefaultBaseUrl, UriKind.Absolute);
        }

        var absolute = baseUri.AbsoluteUri;

        return absolute.EndsWith('/') ? baseUri : new Uri(absolute + "/", UriKind.Absolute);
    }

    /// <summary>
    /// The overall budget — every attempt plus worst-case backoff — with a
    /// small slack, matching the existing Gemini typed-client convention.
    /// </summary>
    private static TimeSpan ResolveTimeout(GeminiSettings settings) =>
        settings.OverallTimeout + TimeoutSlack;
}
