using System.Net;
using System.Text.Json;
using Vrindaya.Api.Common;

namespace Vrindaya.Api.Middleware;

/// <summary>
/// Catches every unhandled exception from downstream middleware/controllers
/// and converts it into a single, consistent JSON error envelope instead of
/// leaking framework stack traces to API consumers.
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

            await WriteErrorResponseAsync(context);
        }
    }

    private static async Task WriteErrorResponseAsync(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new ApiErrorResponse
        {
            Success = false,
            Message = "Unexpected error occurred.",
            TraceId = context.TraceIdentifier,
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, SerializerOptions));
    }
}
