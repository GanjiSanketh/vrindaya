# Security

This document describes the platform's **actual current** security
posture — what's implemented, what's deliberately deferred, and what to
do before removing the "beta" qualifier. It is written to be read
honestly, including the gaps.

## Authentication

| Surface | Mechanism |
| --- | --- |
| Angular admin portal | Firebase Authentication, Google Sign-In only |
| Angular storefront | None — public |
| `api/` (admin/mutating endpoints) | Firebase ID token, verified as a JWT Bearer token |
| `api/` (public read endpoints) | None — public by design |
| `api/` webhook endpoints (`GET`/`POST /whatsapp/webhook`) | None (`[AllowAnonymous]`) — Meta calls these directly and can't present a Firebase token |

`AddFirebaseAuthentication()` (`api/Extensions/ServiceCollectionExtensions.cs`)
registers the standard JWT Bearer handler, with its authority and
audience derived from `FirebaseOptions.ProjectId`
(`https://securetoken.google.com/{projectId}`), so any token minted by
this project's Firebase Authentication instance validates. Issuer,
audience, and lifetime are all checked. Every controller action that
mutates data or exposes admin-only data (products, categories,
collections, homepage config, brand config, inventory, the WhatsApp test
send, etc.) carries `[Authorize(Policy = AppConstants.AdminOnlyPolicy)]`.
Public read endpoints (e.g. `GET /products`, `GET /categories`) have no
`[Authorize]` attribute, but `UseAuthentication()` still runs on every
request, so `HttpContext.User` is populated whenever a valid token was
sent even on these anonymous routes — nothing today depends on that, but
it's available if a future endpoint needs "different data if you're an
authenticated admin."

## Authorization

- **`AdminOnlyPolicy`** (`api/Authorization/AdminOnlyRequirement.cs` +
  `AdminOnlyAuthorizationHandler.cs`) requires the verified token's
  `email` claim to case-insensitively match `AppConstants.AdminEmail` —
  a single hardcoded admin address, not a role/claim stored in Firestore.
  The same check is duplicated as `ClaimsPrincipalExtensions.IsAdmin()`
  for reuse and independently re-implemented in `firestore.rules` and
  `storage.rules` (`isAdminUser()`), so Firestore/Storage access is
  enforced server-side by Firestore's own rules engine regardless of
  what the API or client claims — not merely a UI-level gate.
- The Angular admin portal (`AdminAuthService.ADMIN_EMAIL`) performs the
  same check client-side for UI gating; the real enforcement is the
  three places above (API policy + two rules files), not the Angular
  guard.
- A Firestore-backed `admin-users` collection and full admin-management
  UI exist for a **future** multi-admin/role model
  (`super_admin`/`admin`/`editor`), but the collection has no Firestore
  rules defined (falls through to deny-by-default) and is **not
  consulted** by the actual authorization decision. See
  [Firestore Schema](database/firestore-schema.md#admin-users).

**Known consequence of the single-hardcoded-email design**: the admin
email is duplicated across four files (`AppConstants.AdminEmail`,
`AdminAuthService.ADMIN_EMAIL`, `firestore.rules`, `storage.rules`).
Changing the admin account requires updating all four in lockstep — see
[TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

## Secrets

| Secret | Where it lives | Committed? |
| --- | --- | --- |
| Meta WhatsApp access token | `WhatsApp:AccessToken` | Never — `appsettings.json` ships empty; real value via env var or git-ignored `appsettings.Development.json` |
| Firebase service account key | `FIREBASE_SERVICE_ACCOUNT_JSON` (production) / `api/Firebase/serviceAccount.json` (local, git-ignored) | Never — same pattern |
| Firebase **web** API key | `environment.ts`/`environment.prod.ts` | **Yes, intentionally** — Firebase's web config is public by design; its security model relies on Security Rules, not key secrecy |
| Admin email | `AppConstants.AdminEmail`, `AdminAuthService.ADMIN_EMAIL`, `firestore.rules`, `storage.rules` | Yes — not a secret, just a literal that must stay in sync across four files |

`api/appsettings.Development.json` is git-ignored specifically because it
is the expected location for a developer's real local Meta credentials
during development — this was fixed during the v1.0.0-beta release prep
(see [RELEASE_NOTES_v1.0.0-beta.md](RELEASE_NOTES_v1.0.0-beta.md)): the
file previously existed untracked but un-ignored, meaning a routine
`git add -A` would have committed a real access token into git history.
The Firebase service account key follows the same never-commit rule but
lives at its own git-ignored path, `api/Firebase/serviceAccount.json` —
see [Firebase Setup](FIREBASE_SETUP.md).

**Never** put a real secret in `appsettings.json` (tracked) — only in
environment variables (Render dashboard) or the git-ignored
`appsettings.Development.json` (local only).

## Environment Variables

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md#environment-variables),
[META_WHATSAPP_SETUP.md](META_WHATSAPP_SETUP.md#environment-variables),
and [setup/environment-variables.md](setup/environment-variables.md) for
the complete list. ASP.NET Core's double-underscore convention
(`Section__Key`) overrides the matching `appsettings.json` value
automatically in any environment.

## CORS

`api/` restricts cross-origin requests to exactly two origins, configured
(not hardcoded) in `Cors:AllowedOrigins`:

```json
"Cors": {
  "AllowedOrigins": ["http://localhost:4200", "https://vrindaya.vercel.app"]
}
```

Registered via `AddCorsPolicy()`, applied with `AllowAnyHeader()`/
`AllowAnyMethod()` (no credential-mode restriction, since there's no
cookie/session auth to protect — the Firebase ID token is sent as an
`Authorization: Bearer` header, not a cookie). Adding a new allowed
origin (e.g. a Vercel preview URL) is a configuration change, not a code
change.

`web/`'s Content-Security-Policy independently restricts what the
*browser* will load/connect to — scoped to Google Sign-In, Firebase,
Google Fonts, and Cloudinary (image delivery) domains. Defined in three
places that must be kept in sync (`web/vercel.json`'s HTTP header plus two
`<meta http-equiv>` tags, `web/src/index.html` and
`web/src/index.prod.html`) — see
[deployment/vercel-deployment.md](deployment/vercel-deployment.md).

## Rate Limiting

Implemented via ASP.NET Core's built-in `Microsoft.AspNetCore.RateLimiting`
middleware (`AddRateLimitingSupport()` in
`api/Extensions/ServiceCollectionExtensions.cs`, wired up in
`Program.cs` via `app.UseRateLimiter()`):

- **Global limiter** — a fixed-window limiter partitioned by client IP,
  100 requests per 10 seconds, applied to every endpoint by default.
  Generous enough not to affect any real usage pattern seen so far;
  exists purely as a baseline abuse guard.
- **`"whatsapp-send"` named policy** — a stricter fixed-window limiter,
  5 requests per minute per client IP, applied specifically to
  `POST /api/v1/whatsapp/test` via `[EnableRateLimiting("whatsapp-send")]`.
  This endpoint triggers a real, billable Meta Cloud API send, so it gets
  a materially tighter limit than the global default.

Requests over either limit receive `429 Too Many Requests`
(`RejectionStatusCode` is explicitly configured). Meta's own Cloud API
enforces its own independent rate limits on top of this (visible as
`130429` errors if hit — see
[META_WHATSAPP_SETUP.md](META_WHATSAPP_SETUP.md#known-meta-error-codes)).

## Logging

- **`api/`**: Serilog, structured, console sink. `UseSerilogRequestLogging()`
  logs method/path/status/elapsed time for every request.
  `MetaWhatsAppProvider` masks phone numbers before logging (last 4
  digits only, e.g. `***4321`) and no longer logs Meta's raw response
  body — only the parsed error message on rejection. `WhatsAppService`
  logs incoming webhook events by shape (entry count, payload length),
  not the raw payload, since Meta's webhook bodies embed customer phone
  numbers and message content. **The access token is never logged**, on
  any code path, success or failure.
- **`web/`**: `console.error`/`console.log` with feature prefixes
  (`[Marketing]`, `[Campaigns]`, `[GUARD]`, etc.) — a deliberate,
  consistent convention across the app. A dedicated `LoggerService`
  (`web/src/app/core/services/logger.service.ts`) gates output behind
  `isDevMode()` so nothing verbose reaches a production browser console;
  it's wired into the highest-traffic call sites (auth state changes,
  route guards, marketing/campaign services) and is the intended home
  for any new logging going forward — see
  [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for the remaining call sites
  not yet converted.
- **`GlobalExceptionMiddleware`** logs the full exception server-side but
  returns only `{ success, message: "Unexpected error occurred.", traceId }`
  to the client — stack traces never leave the server.

## Sensitive Data Handling

- Mobile numbers (`marketingSubscribers`, `campaignRecipients`) are
  stored in plaintext in Firestore — protected by Firestore Security
  Rules (admin-only bulk read), not encryption at rest beyond what
  Firestore provides by default.
- `whatsappSettings` stores a Meta access token **entered via the admin
  UI** in plaintext in a Firestore document, admin-gated but not
  encrypted at the field level. This document is informational only —
  the actual send path reads credentials from `api/`'s environment
  configuration, not this document — but the plaintext token still sits
  in Firestore. Treat this as a known limitation if the Firestore-stored
  value is ever a real, live token; see
  [pre-deploy-checklist.md](deployment/pre-deploy-checklist.md).
- Phone numbers are masked in application logs (see
  [Logging](#logging) above); they are never logged in full.

## Production Recommendations

Before removing the "beta" qualifier:

1. Verify Meta's webhook signature (`X-Hub-Signature-256` header) once
   webhook event processing is implemented — currently unnecessary since
   events are only logged, but required before any processing logic
   trusts the payload.
2. Resolve the `admin-users`/`AdminAuthService` split — either wire real
   multi-admin support or remove the unused collection/UI so the
   codebase doesn't imply a capability that doesn't exist.
3. Rotate the Meta access token and Firebase service account key before
   the first real production deploy, since both have been handled during
   local development — see
   [pre-deploy-checklist.md](deployment/pre-deploy-checklist.md).
4. Add CI quality gates for `api/` (currently only `web/` has lint/test/
   SonarCloud gating its deploy) — see [DEPLOYMENT.md](DEPLOYMENT.md).

See also [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) and
[Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap) for the
full, prioritized list.
