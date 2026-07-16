using System.Threading.RateLimiting;
using Asp.Versioning;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Vrindaya.Api.Authorization;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Helpers;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Services;
using Vrindaya.Api.Services.Brand;
using Vrindaya.Api.Services.CampaignDelivery;
using Vrindaya.Api.Services.Homepage;
using Vrindaya.Api.Services.Marketing;
using Vrindaya.Api.Services.Products;
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
        // IFirebaseService directly; nothing about it is request-scoped.
        services.AddSingleton<IFirebaseService, FirebaseService>();

        // Singleton: wraps one Cloudinary client built once in the
        // constructor — every image upload/replace/delete in the app goes
        // through this (see ICloudinaryService's doc comment).
        services.AddSingleton<ICloudinaryService, CloudinaryService>();

        services.AddScoped<ICampaignDeliveryRepository, CampaignDeliveryRepository>();

        // Product module — see api's Product Management architecture docs.
        // ProductRepository is pure Firestore data access (mirrors
        // CampaignDeliveryRepository); the other three are ProductService's
        // internal collaborators, composed there rather than called
        // directly by the controller (except ProductStorageService, which
        // the controller calls directly for upload-images since uploading
        // doesn't touch the product document at all).
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IProductValidationService, ProductValidationService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<ILifecycleService, LifecycleService>();
        services.AddScoped<IImageCompressionService, ImageCompressionService>();
        services.AddScoped<IProductStorageService, ProductStorageService>();

        // Homepage CMS module — HomepageService aggregates every section
        // below into the single GET /homepage response; IHomepageCacheService
        // wraps the same IMemoryCache instance HomepageService reads from,
        // so every mutation here invalidates that one cached response.
        services.AddMemoryCache();
        services.AddSingleton<IHomepageCacheService, HomepageCacheService>();
        services.AddScoped<IHomepageStorageService, HomepageStorageService>();
        services.AddScoped<IHeroBannerRepository, HeroBannerRepository>();
        services.AddScoped<IHeroBannerService, HeroBannerService>();
        services.AddScoped<IPromotionalBannerRepository, PromotionalBannerRepository>();
        services.AddScoped<IPromotionalBannerService, PromotionalBannerService>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ICollectionRepository, CollectionRepository>();
        services.AddScoped<ICollectionService, CollectionService>();
        services.AddScoped<IHomepageConfigRepository, HomepageConfigRepository>();
        services.AddScoped<IHomepageConfigService, HomepageConfigService>();
        services.AddScoped<IHomepageService, HomepageService>();

        // Brand CMS module (Phase 9) — About Us/Contact/Store Info/Social
        // Links/FAQs/Policies/Footer, all in one singleton document.
        // BrandConfigService reads/writes the same shared IMemoryCache
        // instance registered above, keyed by AppConstants.BrandConfigCacheKey.
        services.AddScoped<IBrandConfigRepository, BrandConfigRepository>();
        services.AddScoped<IBrandConfigService, BrandConfigService>();

        // Marketing/Campaign media — image uploads only (see MarketingAssetsController).
        services.AddScoped<IMarketingStorageService, MarketingStorageService>();

        return services;
    }

    /// <summary>
    /// Verifies the Firebase ID token Angular already obtains from its
    /// existing Google Sign-In flow — no new login system. The token's
    /// signature/issuer/audience/expiry are validated against Google's own
    /// Secure Token Service (JWKS auto-discovered via the Authority, so key
    /// rotation needs no manual code); the "AdminOnly" policy then further
    /// requires the token's email claim to match AppConstants.AdminEmail,
    /// the same trust boundary as firestore.rules'/storage.rules'
    /// isAdminUser(). Endpoints with no [Authorize] attribute at all still
    /// get HttpContext.User populated if a valid token was sent, but aren't
    /// rejected if one wasn't — see ProductController's GET actions.
    ///
    /// FirebaseOptions.ProjectId is resolved lazily via IOptions&lt;FirebaseOptions&gt;
    /// (not read from raw IConfiguration here) so this stays in sync with
    /// the same options binding — including its FIREBASE_SERVICE_ACCOUNT_JSON
    /// merge-in — used everywhere else FirebaseOptions is consumed.
    /// </summary>
    public static IServiceCollection AddFirebaseAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<FirebaseOptions>>((jwtOptions, firebaseOptions) =>
            {
                var projectId = firebaseOptions.Value.ProjectId;
                var authority = $"https://securetoken.google.com/{projectId}";

                jwtOptions.Authority = authority;
                jwtOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = authority,
                    ValidateAudience = true,
                    ValidAudience = projectId,
                    ValidateLifetime = true,
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(AppConstants.AdminOnlyPolicy, policy => policy.Requirements.Add(new AdminOnlyRequirement()));

        services.AddSingleton<IAuthorizationHandler, AdminOnlyAuthorizationHandler>();

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
        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.Configure<CampaignDeliveryOptions>(configuration.GetSection(CampaignDeliveryOptions.SectionName));
        services.Configure<CloudinaryOptions>(configuration.GetSection(CloudinaryOptions.SectionName));

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
    /// Gzip + Brotli for every JSON API response — this API has no static
    /// files/views to worry about excluding. EnableForHttps is safe here:
    /// this isn't serving secret-bearing responses vulnerable to the
    /// BREACH-style compression oracle (no per-request reflected secrets in
    /// the JSON bodies), and Render already terminates TLS at its edge.
    /// </summary>
    public static IServiceCollection AddResponseCompressionSupport(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/json"]);
        });

        return services;
    }

    /// <summary>
    /// Per-client-IP fixed-window limits — generous globally (this API has
    /// no known legitimate burst pattern anywhere near these numbers), with
    /// a much stricter named policy ("whatsapp-send") for the one endpoint
    /// that triggers a real, billable, quota-limited Meta Cloud API call
    /// per request. Paired with app.UseRateLimiter() in Program.cs.
    /// </summary>
    public static IServiceCollection AddRateLimitingSupport(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 100,
                        Window = TimeSpan.FromSeconds(10),
                        QueueLimit = 0,
                    }));

            options.AddPolicy("whatsapp-send", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    }));
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
