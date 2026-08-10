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
using Vrindaya.Api.Services.Analytics;
using Vrindaya.Api.Services.HeroBanners;
using Vrindaya.Api.Services.Homepage;
using Vrindaya.Api.Services.Implementations;
using Vrindaya.Api.Services.Interfaces;
using Vrindaya.Api.Services.Products;
using Vrindaya.Api.Services.Sales;
using Vrindaya.Api.AI.Campaigns.Engines;
using Vrindaya.Api.AI.Campaigns.Interfaces;
using Vrindaya.Api.AI.Campaigns.Prompts;
using Vrindaya.Api.AI.Campaigns.Scoring;
using Vrindaya.Api.AI.Campaigns.Services;
using Vrindaya.Api.AI.ContentGeneration.Engines;
using Vrindaya.Api.AI.ContentGeneration.Interfaces;
using Vrindaya.Api.AI.ContentGeneration.Prompts;
using Vrindaya.Api.AI.ContentGeneration.Services;
using Vrindaya.Api.AI.Copilot.Interfaces;
using Vrindaya.Api.AI.Copilot.Services;
using Vrindaya.Api.AI.Dashboard.Interfaces;
using Vrindaya.Api.AI.Workspace.Interfaces;
using Vrindaya.Api.AI.Workspace.Services;
using Vrindaya.Api.AI.Dashboard.Services;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Analysis;
using Vrindaya.Api.AI.Flipkart.Engines;
using Vrindaya.Api.AI.Flipkart.Generators;
using Vrindaya.Api.AI.Flipkart.Prompts;
using Vrindaya.Api.AI.Flipkart.Services;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Modules;
using Vrindaya.Api.AI.Orchestrator.Services;
using Vrindaya.Api.AI.Notifications.Engines;
using Vrindaya.Api.AI.Notifications.Interfaces;
using Vrindaya.Api.AI.Suggestions.Interfaces;
using Vrindaya.Api.AI.Suggestions.Services;
using Vrindaya.Api.AI.Workspace.Configuration;

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
        services.AddScoped<IAnalyticsSettingsService, AnalyticsSettingsService>();
        services.AddScoped<IMarketingService, MarketingService>();

        // Singleton: wraps one lazily built, reused FirestoreDb client.
        services.AddSingleton<IFirebaseService, FirebaseService>();

        // Singleton: wraps one Cloudinary client built once in the constructor.
        services.AddSingleton<ICloudinaryService, CloudinaryService>();

        // Product module
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IProductAnalyticsRepository, ProductAnalyticsRepository>();
        services.AddScoped<IProductValidationService, ProductValidationService>();
        services.AddScoped<ILifecycleService, LifecycleService>();
        services.AddScoped<IImageCompressionService, ImageCompressionService>();
        services.AddScoped<IProductVariantRepository, ProductVariantRepository>();
        services.AddScoped<IProductVariantService, ProductVariantService>();
        services.AddScoped<IVariantImageService, VariantImageService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IPricingService, PricingService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IBIService, BIService>();

        // Sales
        services.AddScoped<ISaleRepository, SaleRepository>();
        services.AddScoped<ISaleService, SaleService>();

        // Caching — reusable in-process cache (IMemoryCache wrapper, singleton).
        services.AddMemoryCache();
        services.AddSingleton<ICacheService, MemoryCacheService>();

        // Request-scoped cache: lets repositories reuse a whole-collection
        // Firestore snapshot within a single HTTP request (scoped lifetime, so
        // never shared across requests; additive to ICacheService above).
        services.AddScoped<IRequestScopedCache, RequestScopedCache>();

        // Categories
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICategoryService, CategoryService>();

        // Hero banners (legacy fallback — kept intact for backward compatibility)
        services.AddScoped<IHeroBannerService, HeroBannerService>();

        // Hero showcase (CMS-driven homepage hero, nested under homepageConfig/active)
        services.AddScoped<IHeroShowcaseService, HeroShowcaseService>();

        #region AI Campaigns

        // AI Campaigns — deterministic scoring engine (no Firestore, no AI)
        services.AddScoped<ICampaignScoringEngine, CampaignScoringEngine>();

        // AI Campaigns — high-level generation service (orchestrates engine + scoring)
        services.AddScoped<ICampaignGenerationService, CampaignGenerationService>();
        services.AddScoped<ICampaignEngine, CampaignEngine>();
        services.AddScoped<ICampaignService, CampaignService>();

        // AI Campaigns — AI provider. Builds the brief with IPromptBuilder and
        // routes it through the core orchestrator, so the copy comes from the
        // configured provider (Gemini when selected) while the scoring engine
        // keeps ownership of every number.
        services.AddScoped<ICampaignAiProvider, CampaignAiProvider>();

        // AI Campaigns — prompt builder
        services.AddSingleton<IPromptBuilder, PromptBuilder>();

        // AI Campaigns — API response mapper
        services.AddSingleton<CampaignApiResponseMapper>();

        #endregion

        // AI Recommendations — deterministic recommendation engine (no ML, no AI)
        services.AddScoped<Vrindaya.Api.AI.Recommendations.Engines.IRecommendationEngine, Vrindaya.Api.AI.Recommendations.Engines.RecommendationEngine>();

        // AI Recommendations — narrator. Rewrites the engine's metric-derived
        // reasons through the core orchestrator; the recommendation set, its
        // ordering, confidence and ROI stay deterministic.
        services.AddScoped<
            Vrindaya.Api.AI.Recommendations.Services.IRecommendationNarrator,
            Vrindaya.Api.AI.Recommendations.Services.RecommendationNarrator>();

        #region AI Content Generation

        // AI Content — deterministic scoring engine (reuses the shared campaign scoring engine)
        services.AddScoped<IContentEngine, ContentEngine>();

        // AI Content — high-level generation service (scoring + mock AI provider)
        services.AddScoped<IContentGenerationService, ContentGenerationService>();

        // AI Content — AI provider. Builds the brief with IContentPromptBuilder
        // and routes it through the core orchestrator, so the copy comes from
        // the configured provider (Gemini when selected) while the content
        // engine keeps ownership of scoring and targeting.
        services.AddScoped<IContentGenerationProvider, ContentGenerationProvider>();

        // AI Content — prompt builder
        services.AddSingleton<IContentPromptBuilder, ContentPromptBuilder>();

        #endregion

        #region AI Content API

        // AI Content API — public content-generation adapter that routes through the hub-and-spoke AI orchestrator
        services.AddScoped<
            Vrindaya.Api.AI.Content.Interfaces.IContentGenerationService,
            Vrindaya.Api.AI.Content.Services.ContentGenerationService>();

        #endregion

        #region AI Content Generators

        // AI Content — Instagram content generator (shared PromptBuilder + the core AI orchestrator)
        services.AddScoped<Vrindaya.Api.AI.Content.Generators.InstagramContentGenerator>();

        // AI Content — reel script generator (shared PromptBuilder + the core AI orchestrator)
        services.AddScoped<Vrindaya.Api.AI.Content.Generators.ReelScriptGenerator>();

        // AI Content — carousel generator (shared PromptBuilder + the core AI orchestrator)
        services.AddScoped<Vrindaya.Api.AI.Content.Generators.CarouselGenerator>();

        // AI Content — image prompt generator (text-to-image prompts only, no image generation)
        services.AddScoped<Vrindaya.Api.AI.Content.Generators.ImagePromptGenerator>();

        #endregion

        #region AI Orchestrator

        // AI Orchestrator — hub-and-spoke route coordinator over the registered AI modules
        services.AddScoped<IAiOrchestrator, AiOrchestrator>();
        services.AddScoped<IAiModule, PromptAiModule>();
        services.AddScoped<IAiModule, CampaignAiModule>();
        services.AddScoped<IAiModule, RecommendationAiModule>();
        services.AddScoped<IAiModule, ContentGenerationAiModule>();
        services.AddScoped<IAiModule, FlipkartAiModule>();

        #endregion

        #region AI Copilot

        // AI Copilot — deterministic intent classifier (keyword rules only, no AI provider)
        services.AddSingleton<IIntentClassifier, IntentClassifier>();

        // AI Copilot — routes conversational requests to existing AI modules via the orchestrator (no direct generation)
        services.AddScoped<IAiCopilotService, AiCopilotService>();

        #endregion

        #region AI Workspace

        // AI Workspace — stateful workspace manager that persists conversations to Firestore and routes through the copilot
        services.AddScoped<IWorkspaceService, WorkspaceService>();

        // AI Workspace — orchestrator that receives workspace requests, determines type, and forwards to copilot
        services.AddScoped<IWorkspaceOrchestrator, WorkspaceOrchestrator>();

        // AI Workspace — in-memory conversation history (no database)
        services.AddSingleton<IConversationMemoryService, ConversationMemoryService>();

        // AI Workspace — in-memory prompt execution history (no persistence)
        services.AddSingleton<IPromptHistoryService, PromptHistoryService>();

        #endregion

        #region AI Dashboard

        // AI Dashboard — aggregates product intelligence, recommendations, campaigns, listing quality and inventory
        services.AddScoped<IDashboardInsightService, DashboardInsightService>();

        // AI Dashboard — projects the live catalog onto the aggregation input (reuses the existing product/sale repositories)
        services.AddScoped<IDashboardInsightSource, DashboardInsightSource>();

        #endregion

        #region AI Suggestions

        // AI Suggestions — rule-based business suggestions over the existing engines (no AI provider)
        services.AddScoped<IAiSuggestionService, AiSuggestionService>();

        #endregion

        #region AI Notifications

        // AI Notifications — maps suggestions onto actionable notifications (no AI provider)
        services.AddScoped<INotificationRecommendationEngine, NotificationRecommendationEngine>();

        #endregion

        #region AI Flipkart

        // AI Flipkart — deterministic Flipkart optimization service
        services.AddScoped<IFlipkartAiService, FlipkartAiService>();

        // AI Flipkart — listing service. Projects the content generator's
        // AI-authored bundle onto the public listing contract.
        services.AddScoped<IFlipkartListingService, FlipkartListingService>();

        // AI Flipkart — deterministic, Flipkart-optimized prompt builder (reuses PromptBuilder; no AI calls)
        services.AddScoped<IFlipkartPromptBuilder, FlipkartPromptBuilder>();

        // AI Flipkart — listing content generator (shape mock campaign copy into Flipkart listing fields)
        services.AddScoped<IFlipkartContentGenerator, FlipkartContentGenerator>();

        // AI Flipkart — deterministic listing quality analyzer (no AI calls)
        services.AddScoped<IListingQualityAnalyzer, ListingQualityAnalyzer>();

        // AI Flipkart — deterministic product intelligence engine (no AI calls, no Firestore)
        services.AddScoped<Vrindaya.Api.AI.Flipkart.Interfaces.IProductIntelligenceEngine, Vrindaya.Api.AI.Flipkart.Engines.ProductIntelligenceEngine>();

        // AI Flipkart — product intelligence narrator. Renders the managed
        // ProductIntelligence prompt template with the engine's metrics and
        // routes it through the core orchestrator; the metrics themselves stay
        // deterministic.
        services.AddScoped<
            Vrindaya.Api.AI.Flipkart.Services.IProductIntelligenceNarrator,
            Vrindaya.Api.AI.Flipkart.Services.ProductIntelligenceNarrator>();

        // AI Flipkart — deterministic listing quality engine (no AI calls, no Firestore)
        services.AddScoped<IListingQualityEngine, ListingQualityEngine>();

        // AI Flipkart — deterministic pricing recommendation engine (no AI, no external APIs)
        services.AddScoped<IPricingRecommendationEngine, PricingRecommendationEngine>();

        // AI Flipkart — deterministic inventory recommendation engine (no AI, no external APIs)
        services.AddScoped<IInventoryRecommendationEngine, InventoryRecommendationEngine>();

        // AI Flipkart — deterministic campaign suggestion engine (no AI, no marketing text)
        services.AddScoped<ICampaignSuggestionEngine, CampaignSuggestionEngine>();

        // AI Flipkart — dashboard service aggregating all intelligence modules
        services.AddScoped<IFlipkartDashboardService, FlipkartDashboardService>();

        #endregion

        // AI Core — orchestrator. Routes every request to the provider chosen by
        // IAiProviderSelector; it never names a concrete provider itself.
        services.AddScoped<Vrindaya.Api.AI.Core.Interfaces.IAiOrchestrator, Vrindaya.Api.AI.Core.Services.AiOrchestrator>();

        // AI Core — prompt template service. Loads reusable prompt templates
        // (Campaign, Flipkart, Instagram, Reels, Carousel, Product Intelligence)
        // from embedded resources with optional configuration overrides, so
        // services never hardcode prompt strings. Singleton: loaded once.
        services.AddSingleton<
            Vrindaya.Api.AI.Core.Interfaces.IPromptTemplateService,
            Vrindaya.Api.AI.Core.Services.PromptTemplateService>();

        // AI Core — provider registrations. Both concrete providers are exposed
        // so the selector can hold them side by side. Which one serves requests
        // is decided by AiProviderSelector from the "AI:Provider" configuration
        // value — that is the single place the decision is made, and no
        // controller, service or engine branches on the provider.
        services.AddScoped<Vrindaya.Api.AI.Core.Providers.MockAiProvider>();

        // AI Core — diagnostics. Bounded in-memory telemetry (response time,
        // provider, model, cache hit, token estimate, success/failure) shared
        // across requests, so a singleton. DTO-only surface; no controller.
        services.AddSingleton<
            Vrindaya.Api.AI.Core.Interfaces.IAiDiagnostics,
            Vrindaya.Api.AI.Core.Services.AiDiagnostics>();

        // AI Core — usage. Bounded in-memory usage accounting (requests, provider,
        // module, execution time, estimated tokens, success/failure) shared across
        // requests, so a singleton. Memory-only — no persistence. DTO-only surface.
        services.AddSingleton<
            Vrindaya.Api.AI.Core.Interfaces.IAiUsageService,
            Vrindaya.Api.AI.Core.Services.AiUsageService>();

        // AI Core — cost estimator. Configuration-driven (no external API calls)
        // token-cost estimation for the configured Gemini pricing. Stateless over
        // IOptions, so a singleton is enough; injectable by diagnostics/usage and
        // later by controllers that surface cost to callers.
        services.AddSingleton<
            Vrindaya.Api.AI.Core.Interfaces.IAiCostEstimator,
            Vrindaya.Api.AI.Core.Services.AiCostEstimator>();

        // AI Core — provider health service. Read-only composition of provider
        // selection + diagnostics telemetry into a strongly typed report for the
        // active provider. Scoped per request, safe to poll.
        services.AddScoped<
            Vrindaya.Api.AI.Core.Interfaces.IAiProviderHealthService,
            Vrindaya.Api.AI.Core.Diagnostics.AiProviderHealthService>();

        // AI Core — AI health monitor. Top-level, in-memory, read-only snapshot of
        // provider availability, the active provider, mock mode and rolling request
        // telemetry (success/failure, latency). Safe to poll — no provider call, no
        // mutation, no persistence. Scoped per request like the provider selector
        // it composes.
        services.AddScoped<
            Vrindaya.Api.AI.Core.Interfaces.IAiHealthService,
            Vrindaya.Api.AI.Core.Services.AiHealthService>();

        // AI Core — diagnostics dashboard. Read-only rollup of usage, cost and
        // health telemetry into a single AiDiagnosticsSummary. Scoped per request
        // like the provider selector and health services it composes.
        services.AddScoped<
            Vrindaya.Api.AI.Core.Interfaces.IAiDiagnosticsDashboardService,
            Vrindaya.Api.AI.Core.Services.AiDiagnosticsDashboardService>();

        // AI startup validation. Validates AI configuration, prompt templates,
        // and module registrations. Registered as singleton; invoked once at
        // startup from Program.cs.
        services.AddSingleton<
            IAiStartupValidationService,
            AiStartupValidationService>();

        // AI Core — response cache. Memoizes provider answers on the
        // prompt/provider/model triple over the shared ICacheService
        // (IMemoryCache), so identical prompts are not billed twice.
        services.AddSingleton<
            Vrindaya.Api.AI.Core.Interfaces.IAiResponseCache,
            Vrindaya.Api.AI.Core.Services.AiResponseCache>();

        // AI Core — retry handler shared by both Gemini typed clients. Registered
        // as a transient message handler so IHttpClientFactory can place a fresh
        // instance in each client's pipeline.
        services.AddTransient<Vrindaya.Api.AI.Core.Providers.Gemini.GeminiRetryHandler>();

        // AI Core — named Gemini HttpClient registration. Base address, timeout
        // and headers come from AI:Gemini/Gemini configuration (never hardcoded,
        // API key never logged). The retry handler owns the per-attempt
        // TimeoutSeconds budget and the exponential backoff between attempts;
        // the client-level timeout is therefore the overall budget (all attempts
        // + worst-case backoff) so HttpClient never aborts a retry sequence that
        // is still making progress. Connections are recycled every 5 minutes so
        // DNS changes are picked up.
        services.AddHttpClient(Vrindaya.Api.AI.Core.Providers.Gemini.GeminiHttpClient.ClientName)
            .ConfigureHttpClient(ConfigureGeminiHttpClient)
            .AddHttpMessageHandler<Vrindaya.Api.AI.Core.Providers.Gemini.GeminiRetryHandler>()
            .SetHandlerLifetime(TimeSpan.FromMinutes(5));

        // IGeminiHttpClient is the single generateContent transport: every
        // Gemini call the providers make goes through it.
        services.AddSingleton<
            Vrindaya.Api.AI.Core.Providers.Gemini.IGeminiHttpClient,
            Vrindaya.Api.AI.Core.Providers.Gemini.GeminiHttpClient>();

        // AI Core — Gemini provider. Calls the live API through
        // IGeminiHttpClient above; it holds no HttpClient of its own.
        services.AddScoped<Vrindaya.Api.AI.Core.Providers.Gemini.GeminiAiProvider>();

        // AI Core — Gemini prompt executor. Single-responsibility transport for
        // the generateContent endpoint (prompt in, strongly typed result out),
        // sharing the same GeminiSettings, retry policy and typed-HttpClient
        // conventions as the provider above. Consumers depend on
        // IGeminiPromptExecutor only.
        services.AddHttpClient<
            Vrindaya.Api.AI.Core.Providers.Gemini.IGeminiPromptExecutor,
            Vrindaya.Api.AI.Core.Providers.Gemini.GeminiPromptExecutor>()
            .ConfigureHttpClient(ConfigureGeminiHttpClient)
            .AddHttpMessageHandler<Vrindaya.Api.AI.Core.Providers.Gemini.GeminiRetryHandler>()
            .SetHandlerLifetime(TimeSpan.FromMinutes(5));

        // AI Core — Gemini response parser. Pure translation from raw model JSON
        // onto the existing Campaign/Content/Flipkart DTOs; stateless, so a
        // singleton is enough.
        services.AddSingleton<
            Vrindaya.Api.AI.Core.Providers.Gemini.IGeminiResponseParser,
            Vrindaya.Api.AI.Core.Providers.Gemini.GeminiResponseParser>();

        // AI Core — provider selector. Reads "AI:Provider" and resolves the
        // matching implementation (with a mock fallback when Gemini is selected
        // without an API key).
        services.AddScoped<
            Vrindaya.Api.AI.Core.Interfaces.IAiProviderSelector,
            Vrindaya.Api.AI.Core.Services.AiProviderSelector>();

        // IAiProvider resolves to whatever the selector considers active, so
        // existing consumers that inject IAiProvider keep working unchanged.
        services.AddScoped<Vrindaya.Api.AI.Core.Interfaces.IAiProvider>(sp =>
            sp.GetRequiredService<Vrindaya.Api.AI.Core.Interfaces.IAiProviderSelector>().Resolve());

        return services;
    }

    /// <summary>
    /// Shared configuration for every Gemini typed HttpClient. The timeout is
    /// the <em>overall</em> budget — all attempts plus worst-case backoff — so
    /// HttpClient never cancels a retry sequence that is still progressing;
    /// GeminiRetryHandler enforces the per-attempt TimeoutSeconds budget.
    /// </summary>
    private static void ConfigureGeminiHttpClient(IServiceProvider sp, HttpClient client)
    {
        var options = sp
            .GetRequiredService<Microsoft.Extensions.Options.IOptions<Vrindaya.Api.AI.Core.Configuration.GeminiSettings>>()
            .Value;

        client.Timeout = options.OverallTimeout + TimeSpan.FromSeconds(10);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Vrindaya-AI/1.0");
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

        // AI Core — root AI options bound from the "AI" section, overridable by
        // environment variables (AI__Provider). Drives provider selection.
        services.Configure<Vrindaya.Api.AI.Core.Configuration.AiProviderSettings>(
            configuration.GetSection(Vrindaya.Api.AI.Core.Configuration.AiProviderSettings.SectionName));

        // AI Core — response cache options bound from the "AI:Cache" section
        // (AI__Cache__Enabled, AI__Cache__AbsoluteExpirationMinutes, etc.).
        services.Configure<Vrindaya.Api.AI.Core.Configuration.AiCacheOptions>(
            configuration.GetSection(Vrindaya.Api.AI.Core.Configuration.AiCacheOptions.SectionName));

        // AI Core — Gemini options. Bound from the "AI:Gemini" section first, then
        // layered with the top-level "Gemini" section so a deployment can supply
        // the flat Gemini__ApiKey / Gemini__Model / Gemini__MaxTokens variables
        // instead of the nested AI__Gemini__* ones. Only keys actually present in
        // the top-level section override, and a blank ApiKey there never clears an
        // already-configured key. The API key itself is never hardcoded — it comes
        // from configuration/environment only, and is never logged.
        services.Configure<Vrindaya.Api.AI.Core.Configuration.GeminiSettings>(options =>
        {
            configuration
                .GetSection(Vrindaya.Api.AI.Core.Configuration.GeminiSettings.SectionName)
                .Bind(options);

            var rootSection = configuration
                .GetSection(Vrindaya.Api.AI.Core.Configuration.GeminiSettings.RootSectionName);

            if (!rootSection.Exists())
            {
                return;
            }

            var configuredApiKey = options.ApiKey;
            rootSection.Bind(options);

            if (string.IsNullOrWhiteSpace(options.ApiKey))
            {
                options.ApiKey = configuredApiKey;
            }
        });

        // AI Core — Mock provider options bound from the "AI:Mock" section,
        // overridable by environment variables (AI__Mock__Model, etc.).
        services.Configure<Vrindaya.Api.AI.Core.Configuration.MockProviderSettings>(
            configuration.GetSection(Vrindaya.Api.AI.Core.Configuration.MockProviderSettings.SectionName));

        // AI Core — aggregate configuration view composing provider selection and
        // every per-provider settings block. Singleton: reads IOptions only, so
        // it stays in sync with the same option bindings every consumer uses.
        services.AddSingleton<Vrindaya.Api.AI.Core.Configuration.AiConfiguration>();

        // AI Workspace — conversation memory options bound from "AI:Workspace:Memory" section
        services.Configure<ConversationMemoryOptions>(
            configuration.GetSection(ConversationMemoryOptions.SectionName));

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
