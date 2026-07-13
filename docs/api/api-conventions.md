# API Conventions

This is the contract every endpoint in `api/` should follow. It exists so
that the first real feature endpoint (whichever one lands first) doesn't
have to invent these decisions — they're already made.

## Base URL and versioning

```
Development:  http://localhost:5000/api/v1/...  or  https://localhost:5001/api/v1/...
Production:    https://<render-service>.onrender.com/api/v1/...
```

Every route is versioned by URL segment (`/api/v1/`, not a header or query
string). Controllers declare their version explicitly:

```csharp
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class ProductController : ControllerBase { }
```

When a breaking change is needed, add `[ApiVersion("2.0")]` to the new
action rather than mutating v1's behavior — existing clients on v1 must
keep working. Swagger discovers new versions automatically (see
[Backend Architecture](../architecture/backend-architecture.md#api-versioning)).

## Route naming

Route segments come from the controller's own name via the `[controller]`
token — e.g. `ProductController` → `/api/v1/product`, `OrdersController` →
`/api/v1/orders`. `HealthController` is the one deliberate exception,
routed explicitly to `/api/v1/health` (a status check, not a resource
collection, so it doesn't pluralize like one).

## Response shapes

**Success**: return the DTO directly, no wrapper envelope.

```json
GET /api/v1/health
{
  "status": "Healthy",
  "application": "Vrindaya API",
  "version": "1.0.0",
  "environment": "Development",
  "serverTime": "2026-01-01T00:00:00.000Z"
}
```

There is deliberately no generic `ApiResponse<T>` success wrapper yet —
adding one before a second endpoint exists to validate its shape would be
guessing. If/when multiple endpoints need a consistent success envelope,
design it against their actual shapes, not speculatively.

**Error** (from `GlobalExceptionMiddleware`, any unhandled exception):

```json
{
  "success": false,
  "message": "Unexpected error occurred.",
  "traceId": "0HNMS5HGV7O9E:00000001"
}
```

`traceId` matches ASP.NET Core's `HttpContext.TraceIdentifier`, which is
also what appears in Serilog's log entry for the same request — use it to
correlate a client-reported error with server logs.

## Controller/service pattern

A controller's only job is to translate HTTP into a service call and the
service's result into an HTTP response. Business logic, error handling
beyond "let it propagate to the global handler," and any external I/O
belong in the service:

```csharp
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;
    public HealthController(IHealthService healthService) => _healthService = healthService;

    [HttpGet]
    public ActionResult<HealthStatusDto> Get() => Ok(_healthService.GetHealthStatus());
}
```

Every controller in `api/` is already scaffolded this way — constructor
injecting its `I*Service`, ready for its first `[HttpGet]`/`[HttpPost]`
action. See [Completed Features](../roadmap/completed-features.md) for
which ones currently have zero actions (all except `Health`).

## CORS

Only two origins can call this API, configured (not hardcoded) in
`appsettings.json` under `Cors:AllowedOrigins`:

- `http://localhost:4200` (Angular dev server)
- `https://vrindaya.vercel.app` (production)

Adding a new allowed origin — e.g. a staging Vercel preview URL — is an
`appsettings.json`/environment-variable change, not a code change.

## Swagger

Enabled only when `ASPNETCORE_ENVIRONMENT=Development`
(`Extensions/ApplicationBuilderExtensions.cs`,
`UseSwaggerInDevelopment`). It is never reachable in a Render production
deployment. Local URL: `https://localhost:5001/swagger`.

## Health checks — two, on purpose, at different paths

| Path | Purpose |
| --- | --- |
| `GET /api/v1/health` | Rich, versioned, JSON contract for API consumers (Angular, monitoring dashboards) — see shape above. |
| `GET /health` | ASP.NET Core's built-in Health Checks middleware, unversioned, plain-text `Healthy`/`Unhealthy`. Intended for Render's own health-check probe configuration, which expects a simple, stable path. |

Don't collapse these into one — Render's infrastructure-level probe and an
API consumer's rich status check are different audiences with different
stability expectations.

## Authentication (not yet enforced)

No endpoint currently requires a token. `TokenValidationMiddleware` is
registered but is a pass-through (see
[Backend Architecture](../architecture/backend-architecture.md#token-validation-reserved-not-implemented)).
When it's implemented, expect it to validate a Firebase ID token the same
way `web/`'s `AdminAuthService` already obtains one — a client won't need
to change how it authenticates, only start sending the token in an
`Authorization: Bearer <token>` header.

## Logging

Every request is logged by Serilog's `UseSerilogRequestLogging()`
middleware (method, path, status code, elapsed time), plus explicit
`_logger.LogError(...)` calls for anything the global exception handler
catches. See [Environment Variables](../setup/environment-variables.md) for
how to change the minimum log level per environment.
