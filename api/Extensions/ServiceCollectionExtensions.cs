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
using Vrindaya.Api.Services.Admin;
using Vrindaya.Api.Services.Audit;
using Vrindaya.Api.Services.Brand;
using Vrindaya.Api.Services.CampaignDelivery;
using Vrindaya.Api.Services.ListingManagement;
using Vrindaya.Api.Services.Marketplace;
using Vrindaya.Api.Services.Homepage;
using Vrindaya.Api.Services.InventoryManagement;
using Vrindaya.Api.Services.Marketing;
using Vrindaya.Api.Services.Products;
using Vrindaya.Api.Services.Suppliers;
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
        services.AddHttpContextAccessor();

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

        // Marketplace Management — Flipkart settings singleton document at
        // marketplaceSettings/flipkart. Same singleton/cache pattern as
        // BrandConfigService, keyed by AppConstants.FlipkartSettingsCacheKey.
        services.AddScoped<IMarketplaceSettingsRepository, MarketplaceSettingsRepository>();
        services.AddScoped<IMarketplaceSettingsService, MarketplaceSettingsService>();

        // Listing Management — per-(Product, Marketplace) records in the
        // productListings collection. Manual management only for now; swap
        // StubListingSyncService for a real IListingSyncService when the
        // Flipkart API integration goes live.
        services.AddScoped<IProductListingRepository, ProductListingRepository>();
        services.AddScoped<IProductListingService, ProductListingService>();
        services.AddScoped<IListingSyncService, StubListingSyncService>();

        // Marketing/Campaign media — image uploads only (see MarketingAssetsController).
        services.AddScoped<IMarketingStorageService, MarketingStorageService>();

        // RBAC — who may sign in and with which role (AdminUsersController),
        // plus the AppJwt this app mints for itself after a successful login
        // (see AddAdminAuthentication/JwtTokenService).
        services.AddScoped<IAdminUserRepository, AdminUserRepository>();
        services.AddScoped<IAdminUserService, AdminUserService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // Inventory Management module — dedicated inventory/purchaseEntries/
        // stockMovements collections (cost tracking, purchase history, stock
        // movement ledger) — the sole owner of stock quantity now that the
        // legacy ProductDocument.Sizes[].Stock write path has been removed.
        services.AddScoped<IInventoryVariantRepository, InventoryVariantRepository>();
        services.AddScoped<IPurchaseEntryRepository, PurchaseEntryRepository>();
        services.AddScoped<IPurchaseItemRepository, PurchaseItemRepository>();
        services.AddScoped<IStockMovementRepository, StockMovementRepository>();
        services.AddScoped<IInventoryManagementService, InventoryManagementService>();

        // Audit Log — append-only ledger for every important admin action.
        // Reusable across all modules via IAuditLogService.
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IAuditLogService, AuditLogService>();

        // Inventory Core — primitive stock operations (Reserve/Release/
        // Decrease/Return/Adjust/GetAvailable) that every feature (Order
        // Management, Purchase Register, manual adjustments) uses. Every
        // method writes an append-only StockMovementDocument automatically.
        services.AddScoped<IInventoryCoreService, InventoryCoreService>();

        // Reports module — 7 report types + CSV export
        services.AddScoped<IReportsService, Services.Reports.ReportsService>();

        // SKU generation — auto-generates VRD-{categoryCode}-{color}-{size}
        // with Firestore-backed uniqueness and never-reuse via skuRegistry.
        services.AddScoped<ISkuGenerationService, SkuGenerationService>();

        // Stock alert notifications — stub until real email/SMS is wired.
        // Replace the registration with a real IStockAlertNotificationService
        // implementation (e.g. EmailStockAlertNotificationService) when
        // notifications go live.
        services.AddScoped<IStockAlertNotificationService, StubStockAlertNotificationService>();

        // Supplier Management — dedicated suppliers collection, sequential
        // SupplierCode generation, GSTIN uniqueness, and stats/purchase-history
        // aggregated from purchaseEntries (via the optional SupplierId link).
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<ISupplierService, SupplierService>();

        // Expense Management — expenses collection with CRUD, search, filters,
        // pagination, monthly/yearly summaries, and audit trail.
        services.AddScoped<IExpenseRepository, Services.Expenses.ExpenseRepository>();
        services.AddScoped<IExpenseService, Services.Expenses.ExpenseService>();

        // Revenue Management — revenues collection with CRUD, search, filters,
        // pagination, monthly/yearly summaries, and audit trail.
        services.AddScoped<IRevenueRepository, Services.Revenues.RevenueRepository>();
        services.AddScoped<IRevenueService, Services.Revenues.RevenueService>();

        // Profit & Loss Dashboard — aggregates revenues, expenses, inventory,
        // and profitability data into a single P&L view with chart series,
        // category/supplier/marketplace breakdowns.
        services.AddScoped<IPnLService, Services.ProfitLoss.PnLService>();

        // Cash Flow — aggregates paid revenues (money in) and paid expenses
        // (money out) into a cash flow dashboard with pending settlements,
        // pending expenses, monthly/yearly series.
        services.AddScoped<ICashFlowService, Services.CashFlow.CashFlowService>();

        // Settlement Reconciliation — compares expected vs actual settlements,
        // detects missing payments, commission mismatches, unexpected charges,
        // and settlement delays. Future-ready for Flipkart API data source.
        services.AddScoped<ISettlementReconciliationService, Services.Settlement.SettlementReconciliationService>();

        // Profitability module — per-product pricing analysis across all
        // marketplaces, the primary pricing analysis tool for Vrindaya.
        services.AddScoped<IProfitabilityService, Services.Profitability.ProfitabilityService>();

        // Inventory Forecasting — pluggable architecture for future order
        // integration. Replace StockBasedSalesVelocityProvider with an
        // OrderBasedSalesVelocityProvider when Order Management is built.
        services.AddScoped<ISalesVelocityProvider, Services.Forecasting.StockBasedSalesVelocityProvider>();
        services.AddScoped<ILeadTimeProvider, Services.Forecasting.ConfigLeadTimeProvider>();
        services.AddScoped<IInventoryForecastService, Services.Forecasting.InventoryForecastService>();

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

        services.Configure<WhatsAppOptions>(configuration.GetSection(WhatsAppOptions.SectionName));
        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.Configure<CampaignDeliveryOptions>(configuration.GetSection(CampaignDeliveryOptions.SectionName));
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
