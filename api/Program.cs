using Serilog;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Extensions;
using Vrindaya.Api.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// ── Logging ──────────────────────────────────────────────────────────────────
builder.Host.UseSerilog((context, services, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

// ── Configuration (strongly typed Options) ────────────────────────────────────
builder.Services.AddApplicationOptions(builder.Configuration);

// ── Application services (DI composition root) ───────────────────────────────
builder.Services.AddApplicationServices();

// ── Authentication/authorization — two JWT Bearer schemes (validating
// Firebase's ID token for the one-time /auth/login call, and this app's own
// minted AppJwt for everything else); "AdminOnly" requires either RBAC role ──
builder.Services.AddAdminAuthentication();

// ── Cross-cutting infrastructure ──────────────────────────────────────────────
builder.Services.AddCorsPolicy(builder.Configuration);
builder.Services.AddApiVersioningSupport();
builder.Services.AddResponseCompressionSupport();
builder.Services.AddRateLimitingSupport();
builder.Services.AddHealthChecks();

// ── MVC + API documentation ───────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerDocumentation();

var app = builder.Build();

// ── Startup validation — fail fast if required env vars are missing ───────────
ValidateRequiredConfiguration(app.Services);

// ── Eagerly initialize singletons that touch the network, so the first
// real request doesn't pay for cold-start + JWKS download + Firestore init
// all in the same response. Non-fatal if any fails — the first request will
// retry naturally. ─────────────────────────────────────────────────────────────
EagerInitialize(app.Services);

// ── One-time schema migration: upgrades variant image documents stored in
// the old format (plain URL strings) to the current object format
// ({ url, publicId, width, height, alt }). The repository reads both formats
// transparently, so this is optional — run it once to clean up Firestore data.
_ = RunVariantImageMigrationAsync(app.Services);

// ── Request pipeline ──────────────────────────────────────────────────────────
// Order matters: exception handling wraps everything, forwarded headers
// come next so every later middleware (logging, HTTPS redirection) sees the
// client's real IP/scheme instead of Render's proxy hop, then request
// logging, then Swagger/CORS/auth/routing. UseAuthentication() must run
// before UseAuthorization() — it populates HttpContext.User from a valid
// Bearer token if one was sent, even on endpoints with no [Authorize]
// attribute at all (see ProductController's GET actions).
app.UseGlobalExceptionHandling();
app.UseRenderForwardedHeaders();
app.UseResponseCompressionSupport();
app.UseSerilogRequestLogging();

app.UseSwaggerInDevelopment();

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors(AppConstants.CorsPolicyName);

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

// Anonymous by design (Render's health monitor calls this unauthenticated) —
// everything else in this app defaults to admin-only via the fallback
// authorization policy (see AddAdminAuthentication), so this needs an
// explicit opt-out.
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();

// ── Startup helpers ────────────────────────────────────────────────────────────

// Validates every required configuration value at startup. Throws on the
// first missing value so the app crashes immediately with a clear message
// instead of producing a 504 at runtime.
static void ValidateRequiredConfiguration(IServiceProvider services)
{
    var logger = services.GetRequiredService<ILogger<Program>>();
    var errors = new List<string>();

    // Firebase
    var firebaseOptions = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Vrindaya.Api.Configuration.FirebaseOptions>>();
    if (string.IsNullOrWhiteSpace(firebaseOptions.Value.ProjectId))
        errors.Add("Firebase:ProjectId is missing. Set Firebase__ProjectId or FIREBASE_SERVICE_ACCOUNT_JSON.");
    if (string.IsNullOrWhiteSpace(firebaseOptions.Value.ServiceAccountJson) && string.IsNullOrWhiteSpace(firebaseOptions.Value.ServiceAccountPath))
        errors.Add("Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or Firebase:ServiceAccountPath.");

    // JWT
    var jwtOptions = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Vrindaya.Api.Configuration.JwtOptions>>();
    if (string.IsNullOrWhiteSpace(jwtOptions.Value.SigningKey))
        errors.Add("Jwt:SigningKey is missing. Set Jwt__SigningKey (minimum 32 characters).");
    else if (jwtOptions.Value.SigningKey.Length < 32)
        errors.Add($"Jwt:SigningKey is too short ({jwtOptions.Value.SigningKey.Length} chars). Minimum 32 characters required for HMAC-SHA256.");
    if (string.IsNullOrWhiteSpace(jwtOptions.Value.Issuer))
        errors.Add("Jwt:Issuer is missing. Set Jwt__Issuer.");
    if (string.IsNullOrWhiteSpace(jwtOptions.Value.Audience))
        errors.Add("Jwt:Audience is missing. Set Jwt__Audience.");

    // Cloudinary
    var cloudinaryOptions = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Vrindaya.Api.Configuration.CloudinaryOptions>>();
    if (string.IsNullOrWhiteSpace(cloudinaryOptions.Value.CloudName))
        errors.Add("Cloudinary:CloudName is missing. Set Cloudinary__CloudName.");
    if (string.IsNullOrWhiteSpace(cloudinaryOptions.Value.ApiKey))
        errors.Add("Cloudinary:ApiKey is missing. Set Cloudinary__ApiKey.");
    if (string.IsNullOrWhiteSpace(cloudinaryOptions.Value.ApiSecret))
        errors.Add("Cloudinary:ApiSecret is missing. Set Cloudinary__ApiSecret.");

    if (errors.Count > 0)
    {
        foreach (var err in errors)
            logger.LogCritical("[STARTUP] {Error}", err);
        throw new InvalidOperationException(
            $"Required configuration values are missing. Details have been logged.{Environment.NewLine}{string.Join(Environment.NewLine, errors)}");
    }

    logger.LogInformation("[STARTUP] All required configuration values present.");
}

// Eagerly initializes network-bound singletons (FirestoreDb, Cloudinary
// client) so the first real request doesn't pay for cold-start initialization.
// FirestoreDb creation triggers credential validation and a gRPC handshake.
static void EagerInitialize(IServiceProvider services)
{
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var firebase = services.GetRequiredService<IFirebaseService>();
        _ = firebase.GetFirestoreDb();
        logger.LogInformation("[STARTUP] FirestoreDb initialized successfully.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "[STARTUP] Firestore eager initialization failed — will retry on first request.");
    }

    try
    {
        _ = services.GetRequiredService<ICloudinaryService>();
        logger.LogInformation("[STARTUP] Cloudinary service initialized successfully.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "[STARTUP] Cloudinary eager initialization failed — will retry on first request.");
    }

    logger.LogInformation("[STARTUP] Eager initialization complete.");
}

/// <summary>
/// One-time migration from old image schema (string URLs) to new image schema
/// (VariantImageSlotDocument objects). Runs in the background so it doesn't
/// block the first request. Migration is idempotent — documents already in the
/// new format are skipped.
/// </summary>
static async Task RunVariantImageMigrationAsync(IServiceProvider services)
{
    try
    {
        var repo = services.GetRequiredService<IProductVariantRepository>();
        var logger = services.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("[STARTUP] Checking for variant image schema migration...");
        await repo.MigrateAllVariantsImagesAsync();
        logger.LogInformation("[STARTUP] Variant image migration check complete.");
    }
    catch (Exception ex)
    {
        // Non-fatal — the repository handles both schemas transparently.
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "[STARTUP] Variant image migration failed — old-format documents will still be readable.");
    }
}
