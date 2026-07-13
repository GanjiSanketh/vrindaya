# Environment Variables

Two completely different configuration mechanisms, because `web/` and
`api/` are different platforms with different runtime models. Don't
expect one list to cover both.

## `web/` — compiled in at build time, not read from the environment

Angular has no server-side runtime reading `process.env` — everything in
`web/src/environments/*.ts` is inlined into the JavaScript bundle at build
time via Angular's file-replacement mechanism (`angular.json`). There is
no `.env` file and no Vercel "Environment Variables" dashboard setting
that affects these values.

| Key | `environment.ts` (dev) | `environment.prod.ts` (prod) | Notes |
| --- | --- | --- | --- |
| `production` | `false` | `true` | Angular's own build-mode flag |
| `adminEmail` | `'gsanketh7121@gmail.com'` | same | Must exactly match `isAdminUser()`'s hardcoded check in `firestore.rules` — see [Firestore Schema](../database/firestore-schema.md) |
| `apiBaseUrl` | `'https://localhost:5001/api/v1'` | `'https://YOUR_RENDER_URL/api/v1'` | **Placeholder** — not consumed by any service yet. Replace `YOUR_RENDER_URL` once the Render service exists (see [Render Deployment](../deployment/render.md)) |
| `firebase.apiKey` | Firebase Web API key | same | Public by design — Firebase's security model relies on Security Rules, not key secrecy. Safe to commit. |
| `firebase.authDomain` | `vrindaya-ad7b0.firebaseapp.com` | same | |
| `firebase.projectId` | `vrindaya-ad7b0` | same | |
| `firebase.storageBucket` | `vrindaya-ad7b0.firebasestorage.app` | same | |
| `firebase.messagingSenderId` | `29792785794` | same | |
| `firebase.appId` | `1:29792785794:web:...` | same | |
| `firebase.measurementId` | `G-M8S4GSDTCS` | same | Google Analytics |

**Changing any of these means editing the file and rebuilding/redeploying**
— there's no runtime override mechanism. If `web/` starts genuinely
calling `api/`, expect `apiBaseUrl`'s placeholder to be one of the first
things that breaks silently if forgotten.

## `api/` — Options pattern, environment-variable overridable

`appsettings.json` defines the shape and ships with **empty values for
every secret** — real values are supplied as actual OS/platform
environment variables, using ASP.NET Core's built-in double-underscore
(`__`) convention for nested JSON keys. This override happens
automatically in any environment; no extra code is needed to support it.

| JSON path | Environment variable | Bound to | Consumed by |
| --- | --- | --- | --- |
| `Cors:AllowedOrigins` | `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`, ... | `CorsOptions` | `AddCorsPolicy()` — see [API Conventions](../api/api-conventions.md#cors) |
| `Firebase:ServiceAccountPath` | `Firebase__ServiceAccountPath` | `FirebaseOptions` | Local dev — file path (relative to `api/`'s content root), defaults to `Firebase/serviceAccount.json` in `appsettings.json`. Ignored whenever `ServiceAccountJson` is set. |
| `Firebase:ServiceAccountJson` | `FIREBASE_SERVICE_ACCOUNT_JSON` (note: **not** `Firebase__ServiceAccountJson` — see below) | `FirebaseOptions` | Production — the service account key's full JSON contents. Takes priority over `ServiceAccountPath` whenever set. **Never commit a real value.** |
| `WhatsApp:AccessToken` | `WhatsApp__AccessToken` | `WhatsAppOptions` | `MetaWhatsAppProvider` — Bearer token on every Graph API call. **Never commit a real value.** |
| `WhatsApp:PhoneNumberId` | `WhatsApp__PhoneNumberId` | `WhatsAppOptions` | `MetaWhatsAppProvider` — the sending number, and `WhatsAppService.GetHealthStatus()` |
| `WhatsApp:BusinessAccountId` | `WhatsApp__BusinessAccountId` | `WhatsAppOptions` | Not consumed by any request path yet — reserved for future WABA-level operations (e.g. template management via the Graph API) |
| `WhatsApp:VerifyToken` | `WhatsApp__VerifyToken` | `WhatsAppOptions` | `WhatsAppService.VerifyWebhookSubscription()` — compared against Meta's `hub.verify_token` on the webhook GET handshake |
| `WhatsApp:ApiVersion` | `WhatsApp__ApiVersion` | `WhatsAppOptions` | `MetaWhatsAppProvider` — the Graph API version segment (e.g. `v23.0`) in every request URL |
| `CampaignDelivery:BatchSize` | `CampaignDelivery__BatchSize` | `CampaignDeliveryOptions` | `CampaignDeliveryWorker` — recipients processed per execution per poll tick. Defaults to `20`. |
| `CampaignDelivery:PollingIntervalSeconds` | `CampaignDelivery__PollingIntervalSeconds` | `CampaignDeliveryOptions` | `CampaignDeliveryWorker` — how often it polls Firestore. Defaults to `5`. |
| `Jwt:Issuer` | `Jwt__Issuer` | `JwtOptions` | Not consumed yet |
| `Jwt:Audience` | `Jwt__Audience` | `JwtOptions` | Not consumed yet |
| `Jwt:SecretKey` | `Jwt__SecretKey` | `JwtOptions` | Not consumed yet. **Never commit a real value.** |
| `Jwt:ExpiryMinutes` | `Jwt__ExpiryMinutes` | `JwtOptions` | Defaults to `60` |
| `Serilog:MinimumLevel:Default` | `Serilog__MinimumLevel__Default` | Serilog config (not a custom Options class — Serilog reads its own section directly) | Controls verbosity; `Information` in `appsettings.json`, `Debug` in `appsettings.Development.json` |
| `ASPNETCORE_ENVIRONMENT` | (itself, no JSON equivalent) | ASP.NET Core's built-in hosting env | Gates Swagger (dev-only) and selects which `appsettings.*.json` overlay loads |

**`FIREBASE_SERVICE_ACCOUNT_JSON` is the one variable in this table that
doesn't follow the double-underscore convention** — Render sets it as a
flat name, not `Firebase__ServiceAccountJson`. `ServiceCollectionExtensions.AddApplicationOptions`
reads it via the configuration indexer (`configuration["FIREBASE_SERVICE_ACCOUNT_JSON"]`)
and assigns it onto `FirebaseOptions.ServiceAccountJson` directly inside
the `Configure<FirebaseOptions>` delegate — still entirely through
`IConfiguration`, never a direct `Environment.GetEnvironmentVariable()`
call in application code. From `FirebaseOptions`' perspective it's
indistinguishable from any other
bound value.

**Firebase credentials and `WhatsApp:*` are both genuinely live now** —
`CampaignDeliveryWorker` builds a real `FirestoreDb` client from
`FirebaseOptions` and calls the real Meta Graph API via `WhatsApp:*`. Only
`Jwt:*` remains fully unconsumed, reserved for when `TokenValidationMiddleware` is
implemented (see [Roadmap](../roadmap/roadmap.md)).

## What must stay in sync manually

These are values that exist in *two* places with no single source of
truth — a change to one without the other silently breaks something:

| Value | Where it lives | Must match |
| --- | --- | --- |
| Admin email | `web/`'s `environment.ts`/`environment.prod.ts` (`adminEmail`) | `firestore.rules`' `isAdminUser()` hardcoded email, and `AdminAuthService.ADMIN_EMAIL` in `web/` code |
| CORS allowed origins | `api/appsettings.json` (`Cors:AllowedOrigins`) | The actual deployed Vercel URL(s) `web/` is served from |
| API base URL | `web/`'s `environment.prod.ts` (`apiBaseUrl`) | The actual deployed Render URL |
