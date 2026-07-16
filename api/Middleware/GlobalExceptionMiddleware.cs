using System.Net;
using System.Text.Json;
using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;

namespace Vrindaya.Api.Middleware;

/// <summary>
/// Catches every unhandled exception from downstream middleware/controllers
/// and converts it into a single, consistent JSON error envelope instead of
/// leaking framework stack traces to API consumers. Exceptions implementing
/// IHasStatusCode (e.g. ProductNotFoundException, DuplicateSlugException)
/// surface their own status code and message — everything else still
/// becomes a generic 500, unchanged from before. This lets Product (and any
/// future) endpoints get real 404/409 semantics without any controller
/// needing its own try/catch, keeping the "no try/catch in repositories/
/// services" convention intact.
/// </summary>
public class GlobalExceptionMiddleware
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unhandled exception while processing {Method} {Path} (TraceId: {TraceId})",
                context.Request.Method,
                context.Request.Path,
                context.TraceIdentifier);

            await WriteErrorResponseAsync(context, ex);
        }
    }

    private static async Task WriteErrorResponseAsync(HttpContext context, Exception ex)
    {
        var (statusCode, message) = ex is IHasStatusCode hasStatusCode
            ? (hasStatusCode.StatusCode, ex.Message)
            : ((int)HttpStatusCode.InternalServerError, "Unexpected error occurred.");

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        var response = new ApiErrorResponse
        {
            Success = false,
            Message = message,
            TraceId = context.TraceIdentifier,
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, SerializerOptions));
    }
}
