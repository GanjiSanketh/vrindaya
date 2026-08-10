using System.Net;
using Vrindaya.Api.Common.Exceptions;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// Raised when a Gemini call cannot produce generated text — a non-success HTTP
/// status, an unreachable endpoint, a timeout, an unreadable body or an empty
/// candidate list.
///
/// Carries the upstream <see cref="StatusCode"/> and the API's canonical error
/// status so callers can branch on the cause, and implements
/// <see cref="IHasStatusCode"/> so <c>GlobalExceptionMiddleware</c> maps it to a
/// sensible response status without special-casing this type. The API key is
/// never part of the message.
/// </summary>
public class GeminiApiException : Exception, IHasStatusCode
{
    /// <summary>Upstream HTTP status, when the failure came from a response.</summary>
    public HttpStatusCode? UpstreamStatusCode { get; }

    /// <summary>Canonical API error status (e.g. "PERMISSION_DENIED"), when supplied.</summary>
    public string? UpstreamStatus { get; }

    /// <summary>
    /// Response status for this API. Caller-fault statuses (400) are surfaced as
    /// 400; every upstream-fault status — including a rejected or throttled key,
    /// which is this application's misconfiguration, not the caller's — becomes
    /// 502/503, since this app is the client that failed to reach Gemini.
    /// </summary>
    public int StatusCode => UpstreamStatusCode switch
    {
        HttpStatusCode.BadRequest => StatusCodes.Status400BadRequest,
        HttpStatusCode.TooManyRequests => StatusCodes.Status503ServiceUnavailable,
        _ => StatusCodes.Status502BadGateway,
    };

    public GeminiApiException(string message)
        : base(message)
    {
    }

    public GeminiApiException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public GeminiApiException(
        string message,
        HttpStatusCode upstreamStatusCode,
        string? upstreamStatus = null,
        Exception? innerException = null)
        : base(message, innerException)
    {
        UpstreamStatusCode = upstreamStatusCode;
        UpstreamStatus = upstreamStatus;
    }
}
