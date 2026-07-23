using System.Threading.RateLimiting;
using Asp.Versioning;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Vrindaya.Api.Authorization;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Helpers;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Services;
using Vrindaya.Api.Services.Homepage;
using Vrindaya.Api.Services.Products;

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
        services.AddHttpContextAccessor();

        services.AddScoped<IHealthService, HealthService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();

        // Singleton: wraps one lazily built, reused FirestoreDb client.
        services.AddSingleton<IFirebaseService, FirebaseService>();

        // Singleton: wraps one Cloudinary client built once in the constructor.
        services.AddSingleton<ICloudinaryService, CloudinaryService>();

        // Product module
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IProductValidationService, ProductValidationService>();
        services.AddScoped<ILifecycleService, LifecycleService>();
        services.AddScoped<IImageCompressionService, ImageCompressionService>();
        services.AddScoped<IProductStorageService, ProductStorageService>();
        services.AddScoped<IProductVariantRepository, ProductVariantRepository>();
        services.AddScoped<IProductVariantService, ProductVariantService>();
        services.AddScoped<IVariantImageService, VariantImageService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IPricingService, PricingService>();

        // Categories
        services.AddMemoryCache();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICategoryService, CategoryService>();

        return services;
    }

    /// <summary>
    /// Two JWT Bearer schemes, side by side:
    ///
    /// - "Firebase" (non-default) — validates the Firebase ID token
    ///   Angular obtains from its Google Sign-In popup. Signature/issuer/
    ///   audience/expiry are checked against Google's own Secure Token
    ///   Service (JWKS auto-discovered via the Authority). Used by exactly
    ///   one endpoint: AuthController.Login, via
    ///   [Authorize(AuthenticationSchemes = "Firebase")] — that's the only
    ///   place a Firebase ID token is ever accepted.
    ///
    /// - "Bearer" (the default scheme — every [Authorize] with no explicit
    ///   AuthenticationSchemes uses this) — validates the AppJwt this app
    ///   mints for itself once AuthController.Login confirms the caller is
    ///   an active AdminUsers record (see JwtTokenService). This is what
    ///   every other admin endpoint in the app actually runs against.
    ///
    /// The "AdminOnly" policy requires either role (SuperAdmin or Admin) —
    /// ClaimsPrincipalExtensions.IsAdmin() — the exact same trust boundary
    /// as firestore.rules'/storage.rules' isAdminUser(), just now backed by
    /// a real per-user AdminUsers record instead of one hardcoded email.
    ///
    /// Secure-by-default: AddAuthorizationBuilder's FallbackPolicy applies
    /// AdminOnlyPolicy to every endpoint that carries NEITHER an [Authorize]
    /// NOR an [AllowAnonymous] attribute — so a future controller/action
    /// added without either attribute is admin-only by construction, not
    /// accidentally public. Every genuinely public storefront endpoint
    /// (Products/Categories/Collections/Homepage GETs, search, the WhatsApp
    /// webhook, health checks) must carry an explicit [AllowAnonymous] —
    /// see each controller. Endpoints with an explicit [Authorize] policy
    /// still use that policy, not the fallback.
    ///
    /// FirebaseOptions.ProjectId/JwtOptions are resolved lazily via
    /// IOptions&lt;T&gt; (not read from raw IConfiguration here) so both stay in
    /// sync with the same options binding used everywhere else they're consumed.
    /// </summary>
    public static IServiceCollection AddAdminAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer("Firebase");

        services.AddOptions<JwtBearerOptions>("Firebase")
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

        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((jwtBearerOptions, jwtOptions) =>
            {
                var opts = jwtOptions.Value;

                jwtBearerOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = opts.Issuer,
                    ValidateAudience = true,
                    ValidAudience = opts.Audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opts.SigningKey)),
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(AppConstants.AdminOnlyPolicy, policy => policy.Requirements.Add(new AdminOnlyRequirement()))
            .SetFallbackPolicy(new AuthorizationPolicyBuilder()
                .AddRequirements(new AdminOnlyRequirement())
                .Build());

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

        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.Configure<CloudinaryOptions>(configuration.GetSection(CloudinaryOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

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

}
