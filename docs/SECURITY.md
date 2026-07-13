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
| `api/` (all endpoints) | **None enforced today** |

`api/`'s `TokenValidationMiddleware` is registered in the request
pipeline but its `InvokeAsync` is a pure pass-through — it inspects
nothing and rejects nothing:

```csharp
public async Task InvokeAsync(HttpContext context) => await _next(context);
```

Every endpoint in [API_REFERENCE.md](API_REFERENCE.md) — including
`POST /api/v1/whatsapp/test`, which sends a real message — is reachable
by anyone who can reach the host, with no credential. The two webhook
endpoints are additionally marked `[AllowAnonymous]` explicitly, so they
remain reachable once real authentication is added elsewhere (Meta's
webhook caller can't present a Firebase token).

**Before removing "beta"**: implement Firebase ID token verification
inside `TokenValidationMiddleware`, and require it on every route except
the two webhook endpoints and the health checks.

## Authorization

- **Angular admin portal**: a single hardcoded admin email
  (`AdminAuthService.ADMIN_EMAIL`), checked client-side, with a matching
  `isAdminUser()` check duplicated in `firestore.rules` and
  `storage.rules`. This is real, enforced authorization at the Firestore
  layer (rules run server-side regardless of what the client claims) —
  it is not merely a UI-level gate.
- A Firestore-backed `admin-users` collection and full admin-management
  UI exist for a **future** multi-admin/role model
  (`super_admin`/`admin`/`editor`), but the collection has no Firestore
  rules defined (falls through to deny-by-default) and is **not
  consulted** by the actual authorization decision. See
  [Firestore Schema](database/firestore-schema.md#admin-users).
- `api/` has no authorization model — see [Authentication](#authentication)
  above; there is nothing to authorize against yet.

## JWT

`Configuration/JwtOptions.cs` is fully implemented as an Options-pattern
class, bound from configuration (`Jwt:Issuer`, `Jwt:Audience`,
`Jwt:SecretKey`, `Jwt:ExpiryMinutes`), and registered in DI. **Nothing in
the codebase consumes it** — no controller issues a JWT, no middleware
validates one. It is reserved configuration for a future authentication
implementation, most likely to back `TokenValidationMiddleware` or a
custom API auth scheme. Do not assume JWT-based auth is active anywhere
in this API today.

## Secrets

| Secret | Where it lives | Committed? |
| --- | --- | --- |
| Meta WhatsApp access token | `WhatsApp:AccessToken` | Never — `appsettings.json` ships empty; real value via env var or git-ignored `appsettings.Development.json` |
| Firebase service account key | `FIREBASE_SERVICE_ACCOUNT_JSON` (production) / `api/Firebase/serviceAccount.json` (local, git-ignored) | Never — same pattern |
| Firebase **web** API key | `environment.ts`/`environment.prod.ts` | **Yes, intentionally** — Firebase's web config is public by design; its security model relies on Security Rules, not key secrecy |
| Admin email | `AdminAuthService.ADMIN_EMAIL`, `firestore.rules`, `storage.rules` | Yes — not a secret, just a literal that must stay in sync across three files |

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
cookie/session auth to protect). Adding a new allowed origin (e.g. a
Vercel preview URL) is a configuration change, not a code change.

`web/`'s Content-Security-Policy (`web/vercel.json`) independently
restricts what the *browser* will load/connect to — scoped to Google
Sign-In, Firebase, and Google Fonts domains. See
[deployment/vercel-deployment.md](deployment/vercel-deployment.md).

## Rate Limiting

**Not implemented.** Neither `api/` nor `web/`'s Firestore access has any
application-level rate limiting today. Meta's own Cloud API enforces its
own rate limits independently (visible as `130429` errors if hit — see
[META_WHATSAPP_SETUP.md](META_WHATSAPP_SETUP.md#known-meta-error-codes)),
but nothing in this codebase throttles requests to `POST /api/v1/whatsapp/test`
or any other endpoint. Combined with the lack of authentication (see
above), this means `POST /api/v1/whatsapp/test` could currently be
called repeatedly by anyone who can reach the host, burning Meta API
quota. **Recommended before removing "beta"**: add authentication first,
then rate limiting (ASP.NET Core's built-in `Microsoft.AspNetCore.RateLimiting`
middleware is a reasonable first step) on `POST /api/v1/whatsapp/test`
specifically.

## Logging

- **`api/`**: Serilog, structured, console sink. `UseSerilogRequestLogging()`
  logs method/path/status/elapsed time for every request.
  `MetaWhatsAppProvider` logs request ID (via ASP.NET Core's own
  automatic request-scope enrichment), phone number, duration, and Meta's
  response body — **the access token is never logged**, on any code
  path, success or failure.
- **`web/`**: `console.error`/`console.log` with feature prefixes
  (`[Marketing]`, `[Campaigns]`, `[GUARD]`, etc.) — a deliberate,
  consistent convention across the app, not ad-hoc debug output.
- **`GlobalExceptionMiddleware`** logs the full exception server-side but
  returns only `{ success, message: "Unexpected error occurred.", traceId }`
  to the client — stack traces never leave the server.

## Sensitive Data Handling

- Mobile numbers (`marketingSubscribers`, `campaignRecipients`) are
  stored in plaintext in Firestore — protected by Firestore Security
  Rules (admin-only bulk read), not encryption at rest beyond what
  Firestore provides by default.
- `whatsappSettings` stores the Meta access token **entered via the admin
  UI** in plaintext in a Firestore document, admin-gated but not
  encrypted at the field level. This document is informational only as
  of the WhatsApp Cloud API integration — the actual send path reads
  credentials from `api/`'s environment configuration, not this
  document — but the plaintext token still sits in Firestore. Treat this
  as a known limitation if the Firestore-stored value is ever a real,
  live token.
- No PII is logged beyond what's explicitly noted above (phone numbers in
  send-related log lines).

## Production Recommendations

Before removing the "beta" qualifier:

1. Implement Firebase ID token verification in `TokenValidationMiddleware`
   and require it on every non-webhook, non-health endpoint.
2. Add rate limiting to `POST /api/v1/whatsapp/test` at minimum.
3. Verify Meta's webhook signature (`X-Hub-Signature-256` header) once
   webhook event processing is implemented — currently unnecessary since
   events are only logged, but required before any processing logic
   trusts the payload.
4. Resolve the `admin-users`/`AdminAuthService` split — either wire real
   multi-admin support or remove the unused collection/UI so the
   codebase doesn't imply a capability that doesn't exist.
5. Add CI quality gates for `api/` (currently only `web/` has lint/test/
   SonarCloud gating its deploy) — see [DEPLOYMENT.md](DEPLOYMENT.md).

See also [Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap)
for the full, prioritized list.
