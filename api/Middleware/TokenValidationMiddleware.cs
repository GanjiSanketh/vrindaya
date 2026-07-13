namespace Vrindaya.Api.Middleware;

/// <summary>
/// Reserved pipeline slot for Firebase ID token validation. Currently a
/// pass-through — no token is inspected or rejected. Wiring this up now
/// (rather than adding it later) means future auth work only has to fill
/// in InvokeAsync, not touch the pipeline registration in Program.cs.
/// </summary>
public class TokenValidationMiddleware
{
    private readonly RequestDelegate _next;

    public TokenValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);
    }
}
