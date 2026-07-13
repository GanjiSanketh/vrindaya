# Deploying `api/` to Render

## Current state: dashboard-configured, not CI-driven

Unlike `web/` (see [Vercel Deployment](vercel-deployment.md)), there is
**no `deploy`-to-Render job in `.github/workflows/ci.yml`** and no
`render.yaml` in the repo. Render deploys today happen the way Render
deploys by default: it watches the connected GitHub branch and rebuilds on
push. This is a gap worth closing once the API does something real — see
[Roadmap](../roadmap/roadmap.md) — but it's consistent with `api/` being
infrastructure-only today (see
[System Architecture](../architecture/system-architecture.md#what-infrastructure-only-means-for-api)):
there's nothing user-facing to gate behind a quality check yet.

## Creating the Render service (one-time)

Render → New → **Web Service** → connect the `vrindaya` GitHub repo.

| Setting | Value |
| --- | --- |
| **Root Directory** | `api` — critical, since the repo root has no `.csproj`; without this Render's runtime auto-detection fails |
| **Runtime** | Native .NET (Render auto-detects `Vrindaya.Api.csproj`; no Dockerfile exists or is needed) |
| **Build Command** | `dotnet publish -c Release -o out` |
| **Start Command** | `dotnet out/Vrindaya.Api.dll` |
| **Instance Type** | Starter is sufficient — this is a stateless API with no in-process caching that would benefit from a larger instance yet |

Render sets `PORT` itself; ASP.NET Core's default Kestrel configuration
binds to it automatically via the `ASPNETCORE_URLS` convention Render
injects — no code change needed for this.

## Required environment variables

Set these in Render's dashboard (Service → Environment). `appsettings.json`
intentionally ships with empty values for all secrets — see
[Environment Variables](../setup/environment-variables.md) for the
complete list and the exact double-underscore naming ASP.NET Core expects,
e.g.:

```
ASPNETCORE_ENVIRONMENT=Production
Cors__AllowedOrigins__0=https://vrindaya.vercel.app
FIREBASE_SERVICE_ACCOUNT_JSON=<paste the entire service account key JSON file's contents as one value>
WhatsApp__AccessToken=<...>
WhatsApp__PhoneNumberId=<...>
WhatsApp__BusinessAccountId=<...>
WhatsApp__VerifyToken=<...>
Jwt__SecretKey=<...>
```

`FIREBASE_SERVICE_ACCOUNT_JSON` doesn't follow the usual `Firebase__Key`
double-underscore convention — there's no corresponding `appsettings.json`
key. `ServiceCollectionExtensions.AddApplicationOptions` merges it into
`FirebaseOptions.ServiceAccountJson` through the standard configuration
pipeline (read via the configuration indexer — never a direct
`Environment.GetEnvironmentVariable()` call in application code), and it
takes priority over the local file path whenever it's set. Paste the
downloaded service
account key file's raw JSON contents as the value (Render's environment
variable editor accepts multi-line values).

**`FIREBASE_SERVICE_ACCOUNT_JSON` and `WhatsApp:*` are both required for
this app to actually do anything**, not placeholders: `CampaignDeliveryWorker`
(a `BackgroundService` that starts with the app — see
[Campaign Module](../marketing/campaign-module.md#background-delivery-worker))
connects to Firestore using the service account credential and sends real
WhatsApp messages via Meta using `WhatsApp:*`. Without a valid
`FIREBASE_SERVICE_ACCOUNT_JSON`, the worker will log a
`CampaignDeliveryWorker poll cycle failed unexpectedly` error every
`PollingIntervalSeconds` (with an `InvalidOperationException` saying the
variable is missing or the JSON is invalid) — the app still starts and
serves HTTP requests fine, but no campaign will ever actually send.
`Jwt:*` remains genuinely unused, reserved until `TokenValidationMiddleware`
is implemented — see [Roadmap](../roadmap/roadmap.md).

## Health check

Configure Render's own health check path (Service → Settings → Health
Check Path) to:

```
/health
```

This is deliberately the **plain-text** ASP.NET Core Health Checks
endpoint, not `/api/v1/health` — see
[API Conventions](../api/api-conventions.md#health-checks--two-on-purpose-at-different-paths)
for why the two are kept separate. Render's infra-level probe wants a
stable, minimal-contract path; pointing it at the versioned JSON endpoint
would couple infrastructure monitoring to an API contract that's expected
to evolve.

## CORS must include the exact Render URL's counterpart

`Cors:AllowedOrigins` in `appsettings.json`/environment variables must list
the **Vercel production URL** (`https://vrindaya.vercel.app`), not the
Render URL itself — CORS is about who's allowed to *call* this API, and
the caller is the Angular app on Vercel. If a Vercel preview deployment
needs to call the API during testing, its preview URL must be added here
too (temporarily, or via a wildcard pattern if Render preview testing
becomes routine).

## Verifying a deploy

```bash
curl https://<your-service>.onrender.com/health
# → Healthy

curl https://<your-service>.onrender.com/api/v1/health
# → { "status": "Healthy", "application": "Vrindaya API", ... }
```

If either fails, check Render's build logs first — a missing Root
Directory setting or an unpinned package version mismatch (see
[Backend Architecture](../architecture/backend-architecture.md)'s note on
`Asp.Versioning.Mvc` needing to stay pinned to a version that supports
`net9.0`) are the most likely causes.

## Cold starts

Render's free/starter tiers spin down idle services. The first request
after idle can take several seconds while the instance restarts — this is
infrastructure behavior, not an application bug. If/when `web/` starts
calling `api/` for user-facing requests, this is worth revisiting (either
a paid always-on instance, or a scheduled keep-alive ping) so a real user
doesn't hit a multi-second stall on the first admin action of the day.
