# Backend Architecture

`api/` is a single ASP.NET Core 9 Web API project (`Vrindaya.Api.csproj`).
It uses a **folder-per-layer** structure inside one project, not multiple
class-library projects — deliberately, since there's no cross-cutting
reuse need yet that would justify the ceremony of separate assemblies.
Revisit this if `api/` grows a second consumer (e.g. a background worker)
that needs to share domain code without depending on ASP.NET Core itself.

## Folder responsibilities

```
api/
├── Controllers/     HTTP endpoints. Thin — parse request, call a service, return a result.
├── Interfaces/      What Controllers and DI depend on (I*Service contracts).
├── Services/        Implementations of the interfaces above. This is where business logic goes.
├── Models/          Firestore document POCOs (e.g. CampaignExecutionDocument) — [FirestoreData] classes the CampaignDelivery worker reads/writes. Not exposed via any controller; see DTOs/ for that boundary.
├── DTOs/            Request/response shapes that cross the HTTP boundary (e.g. HealthStatusDto).
├── Configuration/   Strongly typed Options classes + Swagger version config.
├── Middleware/       Cross-cutting request pipeline steps (exception handling, token validation).
├── Extensions/       DI composition root and pipeline wiring, kept out of Program.cs.
├── Helpers/          Small, testable utilities with no business meaning (e.g. IDateTimeProvider).
├── Validators/       Reserved for request validation — empty until a DTO needs it.
├── Constants/        Literal values shared across the app (app name, CORS policy name).
├── Common/           Shared response envelopes used by multiple features (ApiErrorResponse).
└── Properties/       launchSettings.json (local dev ports/profiles).
```

**Rule of thumb**: a Controller should never contain a `try`/`catch`, a
Firestore/HTTP call, or a conditional beyond routing — that all belongs in
the injected service. Several `I*Service`s tied to the API's original
scaffolding-only controllers are still intentionally empty (see
[Completed Features](../roadmap/completed-features.md)); WhatsApp
(`Services/WhatsApp/`), campaign delivery (`Services/CampaignDelivery/`),
Product Management (`Services/Products/`), and the Homepage CMS
(`Services/Homepage/`) are the feature areas that actually have
implementations, each in its own subfolder rather than flat in
`Services/` — a feature that spans several closely related classes (a
repository plus its collaborator services, or a provider plus its worker)
gets a subfolder; a single implementation class stays flat.

Note also `ICampaignDeliveryRepository`/`CampaignDeliveryRepository` — a
*Repository*, not a `*Service`, deliberately: it's pure Firestore data
access for one background worker, distinct from the app-facing
`I*Service` layer that HTTP controllers depend on.

**Inventory & Product Lifecycle** (`InventoryController`, `Services/Products/InventoryService.cs`,
`Services/Products/LifecycleService.cs`) sit inside the Product Management
area rather than getting their own top-level folder — both operate on the
same `products` Firestore collection `ProductRepository` already owns, so
they compose `IProductRepository` directly rather than introducing a
parallel repository. `InventoryController` is deliberately separate from
`ProductController`: it's a narrow, partial-write surface (stock/sizes/
low-stock threshold/auto-hide, and lifecycle-stage transitions) that must
never clobber an unrelated field an editor is mid-edit on in the main
product form — the same reasoning that already justified `PATCH
/products/{id}/stock` as its own endpoint. `Constants/LifecycleStage.cs`
holds the 10-stage vocabulary (Draft → ... → Archived); Firestore stores it
as a plain string field (`lifecycleStage`), not a native enum — consistent
with how `Category` is already a plain string keyed to a separate
collection rather than a closed C# enum.

## Dependency injection

Every service is registered behind its interface in one place:

```csharp
// Extensions/ServiceCollectionExtensions.cs
public static IServiceCollection AddApplicationServices(this IServiceCollection services)
{
    services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
    services.AddScoped<IHealthService, HealthService>();
    services.AddScoped<IAuthService, AuthService>();
    // ...
}
```

`Program.cs` calls this once (`builder.Services.AddApplicationServices()`)
alongside its sibling `AddApplicationOptions()`, `AddCorsPolicy()`,
`AddApiVersioningSupport()`, and `AddSwaggerDocumentation()` — each a
single-purpose extension method in the same file, so `Program.cs` reads as
a short list of steps rather than a wall of configuration.

**Adding a new service**: implement the interface, add one line to
`AddApplicationServices()`. Nothing else in `Program.cs` needs to change.

## Request pipeline (in order)

```csharp
app.UseGlobalExceptionHandling();   // catches everything downstream
app.UseRenderForwardedHeaders();    // trusts X-Forwarded-* from Render's edge proxy
app.UseSerilogRequestLogging();     // logs method, path, status, elapsed time
app.UseSwaggerInDevelopment();      // no-ops outside Development
app.UseHttpsRedirection();
app.UseCors(AppConstants.CorsPolicyName);
app.UseAuthentication();            // JWT Bearer — verifies the Firebase ID token, if present
app.UseAuthorization();             // "AdminOnly" policy on mutating Product/Homepage-CMS actions
app.MapControllers();
app.MapHealthChecks("/health");
```

Order matters here specifically because exception handling must wrap
*everything* downstream (including the middleware that logs requests, so a
failure in logging itself doesn't crash the pipeline unhandled), CORS must
run before anything that could short-circuit the response, and
`UseAuthentication()` must run before `UseAuthorization()` — it populates
`HttpContext.User` from a valid Bearer token if one was sent, even on
endpoints with no `[Authorize]` attribute at all (e.g. `ProductController`'s
`GET` actions, which behave differently for an authenticated admin vs an
anonymous caller without rejecting the anonymous one).

## Global exception handling

`Middleware/GlobalExceptionMiddleware.cs` wraps the entire pipeline in a
`try`/`catch`. Any unhandled exception becomes:

```json
{ "success": false, "message": "Unexpected error occurred.", "traceId": "0HNMS5HGV7O9E:00000001" }
```

— logged via Serilog with the full exception and the same `traceId`, so a
user-reported trace ID is directly greppable in logs. This was verified by
adding a temporary throwing endpoint, confirming both the response shape
and the log entry, then removing it — not just read as correct.

## Authentication <a name="authentication"></a>

`Middleware/TokenValidationMiddleware.cs` — the reserved pass-through
described in earlier drafts of this document — has been **removed**,
superseded by standard ASP.NET Core JWT Bearer authentication
(`AddFirebaseAuthentication()` in `ServiceCollectionExtensions.cs`):

- **Authority**: `https://securetoken.google.com/{projectId}` — Google's
  Secure Token Service, JWKS auto-discovered, so key rotation needs no
  manual code. `projectId` is resolved lazily from `IOptions<FirebaseOptions>`
  (deferred options configuration), staying in sync with the same binding
  every other Firebase consumer uses.
- **What's verified**: the exact Firebase ID token `web/`'s existing
  Google Sign-In flow already obtains — no new login system. Signature,
  issuer, audience, and expiry are checked; nothing else.
- **"AdminOnly" policy**: `AdminOnlyRequirement`/`AdminOnlyAuthorizationHandler`
  check the verified token's `email` claim against a single hardcoded
  address (`AppConstants.AdminEmail`) — the same trust boundary as
  `firestore.rules`'/`storage.rules`' `isAdminUser()` and `web/`'s
  `AdminAuthService`. Applied via `[Authorize(Policy = AppConstants.AdminOnlyPolicy)]`
  on every mutating Product/Homepage-CMS action.
- **Optional auth on GETs**: endpoints with no `[Authorize]` attribute at
  all (e.g. `GET /products`, `GET /products/{id}`, `GET /categories`)
  still get `HttpContext.User` populated if a valid Bearer token was sent,
  but aren't rejected if one wasn't — `ProductService` checks
  `User.IsAdmin()` internally to decide whether to include inactive/deleted
  records, rather than the framework rejecting the request outright.

See [System Architecture](system-architecture.md#whats-actually-implemented-in-api)
for which controllers this actually gates today.

## Configuration (Options pattern)

Five strongly typed classes, bound from `appsettings.*.json` and
overridable by environment variables:

- `FirebaseOptions` (`Firebase:*`) — `ServiceAccountPath` (local dev file path) and `ServiceAccountJson` (production, merged in from `FIREBASE_SERVICE_ACCOUNT_JSON` by `AddApplicationOptions`, since that variable doesn't follow the usual double-underscore naming), resolved into an actual credential by `FirebaseCredentialProvider` (an internal helper — see below) and consumed by `FirebaseService`
- `WhatsAppOptions` (`WhatsApp:*`) — Meta Cloud API credentials, consumed by `MetaWhatsAppProvider`/`WhatsAppService`
- `CampaignDeliveryOptions` (`CampaignDelivery:*`) — `BatchSize`/`PollingIntervalSeconds`, consumed by `CampaignDeliveryWorker`
- `JwtOptions` (`Jwt:*`) — not consumed by anything yet
- `CorsOptions` (`Cors:*`)

Full field list and environment variable names:
[Environment Variables](../setup/environment-variables.md).

## Background workers

`CampaignDeliveryWorker` (`Services/CampaignDelivery/`) is a
`BackgroundService`, registered via `AddCampaignDeliveryWorker()` →
`services.AddHostedService<CampaignDeliveryWorker>()`. Unlike every
controller, it isn't triggered by an HTTP request — ASP.NET Core starts it
with the app and keeps it running for the app's whole lifetime, polling
Firestore on a `PeriodicTimer`. See
[Campaign Module](../marketing/campaign-module.md#background-delivery-worker)
for what it actually does.

The one pattern worth knowing if you add a second background worker: a
`BackgroundService` is registered as a singleton, but most services
(`ICampaignDeliveryRepository`, `IWhatsAppProvider` included) are
Scoped/Transient — a singleton can't hold a direct reference to a scoped
service safely. `CampaignDeliveryWorker` resolves both from a fresh
`IServiceScopeFactory.CreateScope()` every poll tick instead of injecting
them into its constructor. Reuse this pattern rather than reinventing it.

## API versioning

Every controller carries `[ApiVersion("1.0")]` and a route template of
`api/v{version:apiVersion}/[controller]` (or an explicit `health` route for
`HealthController`, since "health" isn't a resource collection).
`RouteOptions.LowercaseUrls` isn't set explicitly — routes are already
lowercase by construction. Adding `v2` of an endpoint means adding a second
`[ApiVersion("2.0")]` action; Swagger picks up the new version
automatically via `IApiVersionDescriptionProvider` (see
`Configuration/ConfigureSwaggerOptions.cs`) — no manual doc registration.

## Verification

Every piece of this architecture has been exercised, not just written:

- `dotnet build` — 0 warnings, 0 errors.
- `GET /api/v1/health` returns the exact documented JSON shape.
- `GET /health` (ASP.NET Core Health Checks) returns `200 Healthy`.
- Swagger UI/JSON reachable in Development, and the `UseSwaggerInDevelopment`
  extension confirmed to no-op when `ASPNETCORE_ENVIRONMENT` isn't
  `Development`.
- CORS confirmed via an `Origin: http://localhost:4200` request (header
  present) vs. an arbitrary disallowed origin (header absent).
- A deliberately-thrown exception confirmed the middleware's response shape
  and Serilog's log output, then was removed.
- `CampaignDeliveryWorker` confirmed to start (`CampaignDeliveryWorker
  started. PollingIntervalSeconds: 5, BatchSize: 20` logged with the
  correct default config values), and to fail a poll cycle *gracefully*
  when no Firebase service account credential is available (neither
  `ServiceAccountJson` nor `ServiceAccountPath` resolves to a valid
  credential — this check never looks at `ASPNETCORE_ENVIRONMENT`) —
  logging an error and retrying on the next tick — without
  crashing the app or affecting `/health`/`/api/v1/health`, which kept
  responding normally throughout.

See [API Conventions](../api/api-conventions.md) for the contract this
architecture is meant to guarantee for any client.
