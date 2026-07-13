using Asp.Versioning.ApiExplorer;
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

    public static WebApplication UseTokenValidation(this WebApplication app)
    {
        app.UseMiddleware<TokenValidationMiddleware>();
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
}
