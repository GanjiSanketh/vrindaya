using Asp.Versioning;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Helpers;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Services;
using Vrindaya.Api.Services.CampaignDelivery;
using Vrindaya.Api.Services.WhatsApp;

namespace Vrindaya.Api.Extensions;

/// <summary>
/// Composition-root extension methods, kept out of Program.cs so the
/// startup pipeline stays readable as the application grows.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers every application service behind its interface. New
    /// modules plug in here — nowhere else needs to change.
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();

        services.AddScoped<IHealthService, HealthService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IMarketingService, MarketingService>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddScoped<IWhatsAppService, WhatsAppService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IOrderService, OrderService>();

        // Singleton: wraps one lazily built, reused FirestoreDb client — the
        // same reasoning as reusing an HttpClient rather than rebuilding it
        // per call. CampaignDeliveryWorker (a singleton itself) resolves
        // this directly; nothing about it is request-scoped.
        services.AddSingleton<IFirebaseService, FirebaseService>();

        services.AddScoped<ICampaignDeliveryRepository, CampaignDeliveryRepository>();

        return services;
    }

    /// <summary>
    /// Binds every strongly typed configuration section (Options pattern).
    /// Values come from appsettings.*.json, overridable by environment
    /// variables using the standard double-underscore convention (e.g.
    /// Firebase__ServiceAccountPath, WhatsApp__AccessToken, Jwt__SecretKey).
    ///
    /// FirebaseOptions.ServiceAccountJson is the one exception:
    /// FIREBASE_SERVICE_ACCOUNT_JSON doesn't follow that "Section__Key"
    /// convention (Render sets it as a flat variable name), so it can't
    /// bind automatically from the "Firebase" section alone. It's merged
    /// in here explicitly — read via the configuration indexer, which is
    /// backed by the environment-variables provider ASP.NET Core registers
    /// by default, never via Environment.GetEnvironmentVariable() — so
    /// FirebaseService only ever depends on IOptions&lt;FirebaseOptions&gt;,
    /// same as every other consumer of this method.
    /// </summary>
    public static IServiceCollection AddApplicationOptions(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<FirebaseOptions>(options =>
        {
            configuration.GetSection(FirebaseOptions.SectionName).Bind(options);

            var serviceAccountJson = configuration["FIREBASE_SERVICE_ACCOUNT_JSON"];
            if (!string.IsNullOrWhiteSpace(serviceAccountJson))
            {
                options.ServiceAccountJson = serviceAccountJson;
            }
        });

        services.Configure<WhatsAppOptions>(configuration.GetSection(WhatsAppOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.Configure<CampaignDeliveryOptions>(configuration.GetSection(CampaignDeliveryOptions.SectionName));

        return services;
    }

    /// <summary>
    /// Registers a named CORS policy restricted to the origins configured
    /// under "Cors:AllowedOrigins" — the Angular dev server and the
    /// production Vercel deployment, nothing else.
    /// </summary>
    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection(CorsOptions.SectionName + ":AllowedOrigins").Get<string[]>() ?? [];

        services.AddCors(options =>
        {
            options.AddPolicy(AppConstants.CorsPolicyName, policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        return services;
    }

    /// <summary>
    /// Registers URL-segment API versioning (/api/v1/...) and the API
    /// explorer that Swagger uses to group endpoints by version.
    /// </summary>
    public static IServiceCollection AddApiVersioningSupport(this IServiceCollection services)
    {
        services
            .AddApiVersioning(options =>
            {
                options.DefaultApiVersion = new ApiVersion(1, 0);
                options.AssumeDefaultVersionWhenUnspecified = true;
                options.ReportApiVersions = true;
            })
            .AddMvc()
            .AddApiExplorer(options =>
            {
                options.GroupNameFormat = "'v'VVV";
                options.SubstituteApiVersionInUrl = true;
            });

        return services;
    }

    /// <summary>
    /// Registers Swagger generation. The UI itself is only exposed in
    /// Development — see ApplicationBuilderExtensions.UseSwaggerInDevelopment.
    /// </summary>
    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        services.ConfigureOptions<ConfigureSwaggerOptions>();
        services.AddSwaggerGen(options =>
        {
            options.CustomSchemaIds(type => type.FullName);
        });

        return services;
    }

    /// <summary>
    /// Registers MetaWhatsAppProvider as a typed HttpClient (this is what
    /// registers IHttpClientFactory under the hood and gives this client
    /// pooled/reused connections). The Graph API root is fixed here; the
    /// versioned, phone-number-specific path is built per request inside
    /// MetaWhatsAppProvider from WhatsAppOptions.
    /// </summary>
    public static IServiceCollection AddWhatsAppIntegration(this IServiceCollection services)
    {
        services.AddHttpClient<IWhatsAppProvider, MetaWhatsAppProvider>(client =>
        {
            client.BaseAddress = new Uri(AppConstants.WhatsAppGraphApiBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }

    /// <summary>
    /// Registers CampaignDeliveryWorker as a hosted BackgroundService — it
    /// starts with the app and runs for the app's lifetime, polling
    /// campaignExecutions/campaignRecipients on the interval configured
    /// under "CampaignDelivery".
    /// </summary>
    public static IServiceCollection AddCampaignDeliveryWorker(this IServiceCollection services)
    {
        services.AddHostedService<CampaignDeliveryWorker>();
        return services;
    }
}
