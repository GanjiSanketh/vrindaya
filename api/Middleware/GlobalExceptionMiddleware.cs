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
    private readonly IWebHostEnvironment _environment;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
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

    private async Task WriteErrorResponseAsync(HttpContext context, Exception ex)
    {
        if (ex is IHasStatusCode hasStatusCode)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = hasStatusCode.StatusCode;
            var response = new ApiErrorResponse
            {
                Success = false,
                Message = ex.Message,
                TraceId = context.TraceIdentifier,
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response, SerializerOptions));
            return;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        if (_environment.IsDevelopment())
        {
            var detail = new
            {
                Success = false,
                Message = ex.Message,
                ExceptionType = ex.GetType().FullName,
                StackTrace = ex.ToString(),
                TraceId = context.TraceIdentifier,
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(detail, SerializerOptions));
        }
        else
        {
            var response = new ApiErrorResponse
            {
                Success = false,
                Message = "Unexpected error occurred.",
                TraceId = context.TraceIdentifier,
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response, SerializerOptions));
        }
    }
}
