using Serilog;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Extensions;
using Vrindaya.Api.Scripts;
using Vrindaya.Api.Services.Admin;

var builder = WebApplication.CreateBuilder(args);

// ── Logging ──────────────────────────────────────────────────────────────────
// Serilog replaces the default provider entirely and reads its configuration
// from appsettings.*.json ("Serilog" section), so log levels and sinks are
// environment-specific without touching this file.
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

// ── External API integrations (typed HttpClient via IHttpClientFactory) ──────
builder.Services.AddWhatsAppIntegration();

// ── Background workers ────────────────────────────────────────────────────────
builder.Services.AddCampaignDeliveryWorker();

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

// ── One-time maintenance mode — see Scripts/LegacyImageMigration.cs. Runs
// the migration/scan and exits immediately; the web server never starts. ──
if (args.Length > 0 && args[0] == "migrate-legacy-images")
{
    await LegacyImageMigration.RunAsync(app.Services, args);
    return;
}

// ── RBAC bootstrap — idempotent; a no-op on every boot after the first
// (see AdminUserSeeder). Guarantees there's always at least one SuperAdmin
// who can sign in, even against a brand-new Firestore database. ───────────
await AdminUserSeeder.SeedInitialSuperAdminAsync(app.Services);

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
