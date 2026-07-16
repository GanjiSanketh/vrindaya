using Asp.Versioning.ApiExplorer;
using Microsoft.AspNetCore.HttpOverrides;
using Vrindaya.Api.Middleware;

namespace Vrindaya.Api.Extensions;

/// <summary>
/// Pipeline-configuration extension methods, mirroring ServiceCollectionExtensions
/// on the app.Use... side so Program.cs stays a short, readable list of steps.
/// </summary>
public static class ApplicationBuilderExtensions
{
    public static WebApplication UseGlobalExceptionHandling(this WebApplication app)
    {
        app.UseMiddleware<GlobalExceptionMiddleware>();
        return app;
    }

    /// <summary>
    /// Trusts X-Forwarded-For/X-Forwarded-Proto from Render's edge proxy, so
    /// HttpContext.Connection.RemoteIpAddress and Request.Scheme reflect the
    /// original client request rather than the proxy's plain-HTTP hop into
    /// the container. Must run before UseHttpsRedirection() — otherwise that
    /// middleware would see Scheme as "http" (the proxy's hop, not the
    /// client's actual HTTPS request) and redirect every single request,
    /// even ones that already arrived over HTTPS at Render's edge.
    ///
    /// Render's proxy isn't a fixed, well-known IP we can pin via the
    /// default KnownProxies/KnownNetworks allow-list, so both are cleared —
    /// the same approach Microsoft's own docs recommend for cloud load
    /// balancers with no fixed address.
    /// </summary>
    public static WebApplication UseRenderForwardedHeaders(this WebApplication app)
    {
        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
        };
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();

        app.UseForwardedHeaders(options);
        return app;
    }

    /// <summary>Swagger UI is Development-only — never exposed in production.</summary>
    public static WebApplication UseSwaggerInDevelopment(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            return app;
        }

        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            var provider = app.Services.GetRequiredService<IApiVersionDescriptionProvider>();
            foreach (var description in provider.ApiVersionDescriptions)
            {
                options.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json", description.GroupName.ToUpperInvariant());
            }
        });

        return app;
    }

    /// <summary>
    /// Must run early — before anything that writes to the response body —
    /// so every JSON API response (this app has no static files/views to
    /// compress) gets gzip/brotli applied. Paired with
    /// AddResponseCompressionSupport() in ServiceCollectionExtensions.
    /// </summary>
    public static WebApplication UseResponseCompressionSupport(this WebApplication app)
    {
        app.UseResponseCompression();
        return app;
    }
}
