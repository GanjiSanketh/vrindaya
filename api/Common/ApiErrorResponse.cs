namespace Vrindaya.Api.Common;

/// <summary>
/// The consistent error envelope returned by GlobalExceptionMiddleware for
/// every unhandled exception, regardless of which endpoint threw it.
/// </summary>
public class ApiErrorResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string TraceId { get; set; } = string.Empty;
}
