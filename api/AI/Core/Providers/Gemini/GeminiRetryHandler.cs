using System.Diagnostics;
using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// <see cref="DelegatingHandler"/> that retries transient Gemini failures with
/// exponential backoff and jitter. Registered on the Gemini typed clients via
/// <see cref="IHttpClientFactory"/>, so it sits inside the factory's handler
/// pipeline and applies to every Gemini call without any caller change.
///
/// What counts as transient:
/// <list type="bullet">
///   <item>408 Request Timeout, 429 Too Many Requests;</item>
///   <item>500, 502, 503, 504 server-side failures;</item>
///   <item><see cref="HttpRequestException"/> (DNS, connect, socket resets);</item>
///   <item>a per-attempt timeout firing.</item>
/// </list>
///
/// Everything else — including 4xx client errors such as 401/403/400 — is
/// returned to the caller untouched, because retrying them cannot help.
///
/// Backoff is <c>RetryBaseDelayMs * 2^(attempt-1)</c>, clamped to
/// <c>RetryMaxDelayMs</c>, with up to 25% random jitter to avoid synchronized
/// retry storms. A <c>Retry-After</c> header, when the API sends one, takes
/// precedence over the computed delay.
///
/// This handler changes no business logic: it only re-issues the same request
/// and returns the same <see cref="HttpResponseMessage"/> the caller expects.
/// Response interpretation, fallbacks and parsing stay with the provider and
/// the executor.
/// </summary>
public sealed class GeminiRetryHandler : DelegatingHandler
{
    private readonly IOptions<GeminiSettings> _options;
    private readonly ILogger<GeminiRetryHandler> _logger;

    /// <summary>Cap on any single backoff delay when configuration is unusable.</summary>
    private const int FallbackMaxDelayMs = 8_000;

    /// <summary>Base backoff delay when configuration is unusable.</summary>
    private const int FallbackBaseDelayMs = 500;

    public GeminiRetryHandler(
        IOptions<GeminiSettings> options,
        ILogger<GeminiRetryHandler> logger)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var options = _options.Value;
        var maxAttempts = Math.Max(0, options.MaxRetryAttempts) + 1;

        HttpResponseMessage? response = null;
        Exception? lastException = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // A request message cannot be sent twice, so each attempt gets a clone.
            using var attemptRequest = await CloneRequestAsync(request, cancellationToken);

            // Per-attempt timeout, so one stalled attempt cannot consume the
            // whole budget and starve the remaining retries.
            using var attemptCts = new CancellationTokenSource(
                TimeSpan.FromSeconds(options.EffectiveTimeoutSeconds));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
                cancellationToken, attemptCts.Token);

            var stopwatch = Stopwatch.StartNew();

            try
            {
                response?.Dispose();
                response = await base.SendAsync(attemptRequest, linkedCts.Token);
                stopwatch.Stop();
                lastException = null;

                if (!IsTransient(response.StatusCode))
                {
                    if (attempt > 1)
                    {
                        _logger.LogInformation(
                            "Gemini retry: attempt {Attempt}/{MaxAttempts} succeeded with HTTP {StatusCode} in {ElapsedMs}ms.",
                            attempt, maxAttempts, (int)response.StatusCode, stopwatch.ElapsedMilliseconds);
                    }

                    return response;
                }

                if (attempt == maxAttempts)
                {
                    _logger.LogWarning(
                        "Gemini retry: giving up after {Attempt} attempt(s) — last status HTTP {StatusCode}.",
                        attempt, (int)response.StatusCode);

                    return response;
                }

                var delay = ResolveDelay(options, attempt, response);

                _logger.LogWarning(
                    "Gemini retry: attempt {Attempt}/{MaxAttempts} returned transient HTTP {StatusCode} " +
                    "after {ElapsedMs}ms — retrying in {DelayMs}ms.",
                    attempt, maxAttempts, (int)response.StatusCode, stopwatch.ElapsedMilliseconds, delay.TotalMilliseconds);

                await Task.Delay(delay, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Caller (or the provider's timeout budget) aborted — never retry.
                throw;
            }
            catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or TimeoutException)
            {
                stopwatch.Stop();
                lastException = ex;

                var reason = ex is HttpRequestException ? "transport failure" : "timeout";

                if (attempt == maxAttempts)
                {
                    _logger.LogWarning(ex,
                        "Gemini retry: giving up after {Attempt} attempt(s) — last failure was a {Reason}.",
                        attempt, reason);

                    throw;
                }

                var delay = ResolveDelay(options, attempt, response: null);

                _logger.LogWarning(
                    "Gemini retry: attempt {Attempt}/{MaxAttempts} hit a {Reason} after {ElapsedMs}ms — " +
                    "retrying in {DelayMs}ms.",
                    attempt, maxAttempts, reason, stopwatch.ElapsedMilliseconds, delay.TotalMilliseconds);

                await Task.Delay(delay, cancellationToken);
            }
        }

        // Defensive: the loop always returns or throws, but keep the contract explicit.
        return response ?? throw lastException ?? new HttpRequestException("Gemini request failed.");
    }

    /// <summary>
    /// Status codes worth retrying — throttling and server-side faults only.
    /// Client errors are excluded because a repeat cannot change the outcome.
    /// </summary>
    private static bool IsTransient(HttpStatusCode statusCode) =>
        statusCode is HttpStatusCode.RequestTimeout
            or HttpStatusCode.TooManyRequests
            or HttpStatusCode.InternalServerError
            or HttpStatusCode.BadGateway
            or HttpStatusCode.ServiceUnavailable
            or HttpStatusCode.GatewayTimeout;

    /// <summary>
    /// Computes the wait before the next attempt: the server's Retry-After when
    /// present, otherwise exponential backoff with jitter, clamped to the
    /// configured maximum.
    /// </summary>
    private static TimeSpan ResolveDelay(GeminiSettings options, int attempt, HttpResponseMessage? response)
    {
        var maxDelayMs = options.RetryMaxDelayMs > 0 ? options.RetryMaxDelayMs : FallbackMaxDelayMs;

        var retryAfter = ReadRetryAfter(response);
        if (retryAfter.HasValue)
        {
            var capped = Math.Min(retryAfter.Value.TotalMilliseconds, maxDelayMs);
            return TimeSpan.FromMilliseconds(capped);
        }

        var baseDelayMs = options.RetryBaseDelayMs > 0 ? options.RetryBaseDelayMs : FallbackBaseDelayMs;

        // Exponential: base * 2^(attempt-1), guarded against overflow.
        var exponential = baseDelayMs * Math.Pow(2, attempt - 1);
        var clamped = Math.Min(exponential, maxDelayMs);

        // Jitter: up to +25%, still clamped, so retries de-synchronize.
        var jitter = Random.Shared.NextDouble() * 0.25 * clamped;

        return TimeSpan.FromMilliseconds(Math.Min(clamped + jitter, maxDelayMs));
    }

    /// <summary>Reads a Retry-After header expressed as a delay or a date.</summary>
    private static TimeSpan? ReadRetryAfter(HttpResponseMessage? response)
    {
        var retryAfter = response?.Headers.RetryAfter;

        if (retryAfter is null)
        {
            return null;
        }

        if (retryAfter.Delta is { } delta && delta > TimeSpan.Zero)
        {
            return delta;
        }

        if (retryAfter.Date is { } date)
        {
            var wait = date - DateTimeOffset.UtcNow;
            if (wait > TimeSpan.Zero)
            {
                return wait;
            }
        }

        return null;
    }

    /// <summary>
    /// Clones a request so it can be re-sent. The body is buffered into a byte
    /// array because the original content stream is consumed by the first
    /// attempt. Headers — including the API key header — are copied verbatim
    /// and never logged.
    /// </summary>
    private static async Task<HttpRequestMessage> CloneRequestAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri)
        {
            Version = request.Version,
            VersionPolicy = request.VersionPolicy,
        };

        if (request.Content is not null)
        {
            var body = await request.Content.ReadAsByteArrayAsync(cancellationToken);
            var content = new ByteArrayContent(body);

            foreach (var header in request.Content.Headers)
            {
                content.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            clone.Content = content;
        }

        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        foreach (var option in request.Options)
        {
            clone.Options.TryAdd(option.Key, option.Value);
        }

        return clone;
    }
}
