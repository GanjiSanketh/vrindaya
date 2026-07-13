# Deploying `api/` to Render (Docker)

## Current state: Docker-based, dashboard-configured, not CI-driven

`api/Dockerfile` exists specifically so Render can build and run this
service as a container — see [Docker](docker.md) for the image itself.
There is still **no `deploy`-to-Render job in `.github/workflows/ci.yml`**
and no `render.yaml` in the repo; Render deploys today happen the way
Render deploys by default: it watches the connected GitHub branch and
rebuilds on push. This is a gap worth closing once the API does something
that justifies gating a deploy behind CI — see [Roadmap](../roadmap/roadmap.md).

## Creating the Render service (one-time)

Render → New → **Web Service** → connect the `vrindaya` GitHub repo.

| Setting | Value |
| --- | --- |
| **Root Directory** | `api` — critical, since the repo root has no `Dockerfile`; without this Render looks in the wrong place |
| **Runtime** | **Docker** — Render auto-detects `api/Dockerfile` once Root Directory is set to `api`; no runtime dropdown selection needed |
| **Build Command** | *(leave blank)* — the Dockerfile's own multi-stage build replaces this entirely |
| **Start Command** | *(leave blank)* — the Dockerfile's `ENTRYPOINT` (`dotnet Vrindaya.Api.dll`) replaces this entirely |
| **Instance Type** | Starter is sufficient — this is a stateless API with no in-process caching that would benefit from a larger instance yet |

Do **not** set a Build Command or Start Command — doing so overrides
parts of the Docker flow Render would otherwise handle automatically from
the Dockerfile, and isn't needed for this setup at all.

Render sets `PORT` and injects it into the container; the Dockerfile
already sets `ASPNETCORE_URLS=http://+:8080` and `EXPOSE 8080`, and Render
maps its own routing to whichever port the container listens on — no
extra `PORT`-related configuration is needed on either side.

## Required environment variables

Set these in Render's dashboard (Service → Environment). `appsettings.json`
intentionally ships with empty/placeholder values for every secret — see
[Environment Variables](../setup/environment-variables.md) for the
complete reference list.

```
ASPNETCORE_ENVIRONMENT=Production
Cors__AllowedOrigins__0=https://vrindaya.vercel.app
FIREBASE_SERVICE_ACCOUNT_JSON=<paste the entire service account key JSON file's contents as one value>
WhatsApp__AccessToken=<meta-access-token>
WhatsApp__PhoneNumberId=<meta-phone-number-id>
WhatsApp__BusinessAccountId=<meta-waba-id>
WhatsApp__VerifyToken=<your-chosen-verify-token>
Jwt__SecretKey=<a-real-secret-if-jwt-is-ever-consumed>
```

| Variable | Required? | Notes |
| --- | --- | --- |
| `ASPNETCORE_ENVIRONMENT` | Yes (defaults to `Production` if unset — the Dockerfile bakes that in as a fail-safe, but set it explicitly for clarity) | Anything other than `Development` makes `FirebaseCredentialProvider` expect `FIREBASE_SERVICE_ACCOUNT_JSON` rather than a local file, and disables Swagger |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes | The service account key file's **full JSON contents**, pasted as one value (Render's editor accepts multi-line values). Doesn't follow the `Section__Key` double-underscore convention — see the note below |
| `Cors__AllowedOrigins__0` | Yes, if it differs from the committed default | Already `https://vrindaya.vercel.app` in `appsettings.json` — only needed here if the production frontend URL changes |
| `WhatsApp__AccessToken` | Yes | Meta permanent/system-user access token. **Never commit a real value.** |
| `WhatsApp__PhoneNumberId` | Yes | Meta's sending number ID |
| `WhatsApp__BusinessAccountId` | Yes | WABA ID — not yet consumed by any request path, reserved for future WABA-level operations |
| `WhatsApp__VerifyToken` | Yes | Compared against Meta's `hub.verify_token` on the webhook GET handshake |
| `Jwt__SecretKey` | No — not consumed by anything yet | Reserved for when `TokenValidationMiddleware` is implemented; set a real value ahead of that if you want it ready |

**Why `FIREBASE_SERVICE_ACCOUNT_JSON` looks different from the rest**: it
doesn't follow the usual `Firebase__Key` double-underscore convention —
there's no corresponding `appsettings.json` key for it.
`ServiceCollectionExtensions.AddApplicationOptions` merges it into
`FirebaseOptions.ServiceAccountJson` through the standard configuration
pipeline (read via the configuration indexer — never a direct
`Environment.GetEnvironmentVariable()` call in application code), and it
takes priority over the local file path whenever it's set. See
[Firebase Setup](../FIREBASE_SETUP.md) for the full explanation.

**`FIREBASE_SERVICE_ACCOUNT_JSON` and `WhatsApp:*` are both required for
this app to actually do anything**, not placeholders: `CampaignDeliveryWorker`
(a `BackgroundService` that starts with the app — see
[Campaign Module](../marketing/campaign-module.md#background-delivery-worker))
connects to Firestore using the service account credential and sends real
WhatsApp messages via Meta using `WhatsApp:*`. Without a valid
`FIREBASE_SERVICE_ACCOUNT_JSON`, the worker logs a
`CampaignDeliveryWorker poll cycle failed unexpectedly` error every
`PollingIntervalSeconds` (with an `InvalidOperationException` explaining
exactly what's missing or invalid) — the app still starts and serves HTTP
requests fine, but no campaign will ever actually send.

## Health check

Configure Render's own health check path (Service → Settings → Health
Check Path) to:

```
/health
```

This is deliberately the **plain-text** ASP.NET Core Health Checks
endpoint, not `/api/v1/health` — see
[API Conventions](../api/api-conventions.md#health-checks--two-on-purpose-at-different-paths)
for why the two are kept separate. It requires no authentication and
always responds once the app has started, regardless of whether Firebase
or WhatsApp credentials are configured correctly.

## CORS must include the exact frontend URL

`Cors:AllowedOrigins` in `appsettings.json`/environment variables must
list the **Vercel production URL** (`https://vrindaya.vercel.app`) and,
for local development against a deployed API, `http://localhost:4200` —
not the Render URL itself. CORS is about who's allowed to *call* this
API, and the caller is the Angular app, not Render. If a Vercel preview
deployment needs to call the API during testing, its preview URL must be
added here too (temporarily, or via a wildcard pattern if Render preview
testing becomes routine).

## Forwarded headers behind Render's proxy

Render terminates TLS at its edge and forwards plain HTTP to the
container. `Program.cs` calls `app.UseRenderForwardedHeaders()` (before
`UseHttpsRedirection()`) so the app trusts `X-Forwarded-For`/`X-Forwarded-Proto`
from that proxy hop — without it, `UseHttpsRedirection()` would see every
request as plain HTTP (since that's what actually reaches the container)
and could interfere with requests that already arrived securely at
Render's edge. See [Docker](docker.md#forwarded-headers) for the
implementation detail.

## Verifying a deploy

```bash
curl https://<your-service>.onrender.com/health
# → Healthy

curl https://<your-service>.onrender.com/api/v1/health
# → { "status": "Healthy", "application": "Vrindaya API", ... }
```

If either fails, check Render's build logs first — a missing Root
Directory setting is the most common cause of a failed Docker build never
even starting. See [Docker → Troubleshooting](docker.md#troubleshooting)
for image-level build/runtime failures.

## Cold starts

Render's free/starter tiers spin down idle services. The first request
after idle can take several seconds while the instance restarts — this is
infrastructure behavior, not an application bug. If/when `web/` starts
calling `api/` for user-facing requests, this is worth revisiting (either
a paid always-on instance, or a scheduled keep-alive ping) so a real user
doesn't hit a multi-second stall on the first admin action of the day.
