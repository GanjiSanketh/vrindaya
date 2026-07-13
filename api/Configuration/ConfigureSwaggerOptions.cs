using Asp.Versioning.ApiExplorer;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Configuration;

/// <summary>
/// Generates one Swagger document per discovered API version, so new
/// versions (v2, v3, ...) register themselves automatically without any
/// change to this class.
/// </summary>
public class ConfigureSwaggerOptions : IConfigureOptions<SwaggerGenOptions>
{
    private readonly IApiVersionDescriptionProvider _provider;

    public ConfigureSwaggerOptions(IApiVersionDescriptionProvider provider)
    {
        _provider = provider;
    }

    public void Configure(SwaggerGenOptions options)
    {
        foreach (var description in _provider.ApiVersionDescriptions)
        {
            options.SwaggerDoc(description.GroupName, new OpenApiInfo
            {
                Title = AppConstants.ApplicationName,
                Version = description.ApiVersion.ToString(),
                Description = "Backend foundation for the Vrindaya e-commerce and marketing platform.",
            });
        }
    }
}
