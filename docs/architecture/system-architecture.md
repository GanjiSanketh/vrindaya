# System Architecture

## Overview

Vrindaya is a monorepo containing two independently deployable applications
that share one Firebase project:

```
                         ┌─────────────────────────┐
                         │   Firebase (shared)     │
                         │  Auth · Firestore ·     │
                         │  Storage                │
                         └───────────┬─────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                                 │
          ┌─────────▼─────────┐             ┌─────────▼─────────┐
          │  web/ (Angular 21) │             │  api/ (.NET 9)     │
          │  Deployed: Vercel   │             │  Deployed: Render  │
          └─────────────────────┘             └─────────────────────┘
```

**Today**, `web/` talks to Firebase directly (Firestore reads/writes,
Firebase Authentication for the admin portal) and `api/` is an
infrastructure-only foundation that `web/` does not yet call. This is a
deliberate, staged migration — see [Roadmap](../roadmap/roadmap.md) — not an
oversight.

## Why a monorepo

Both applications ship from one repository so that:

- A single PR can touch a Firestore schema change, the rules that guard it,
  and the API surface that will eventually front it — reviewed together,
  not across three repos.
- CI (`.github/workflows/ci.yml`) runs against one commit SHA for both apps,
  so there's never a "which API version does this frontend commit expect"
  question.
- Firebase config (`firestore.rules`, `storage.rules`, `firebase.json`) sits
  at the repository root, outside both app folders, because it isn't owned
  by either one — it's shared infrastructure both `web/` and `api/`
  ultimately depend on.

## Why two deployment targets

| App | Platform | Why |
| --- | --- | --- |
| `web/` | Vercel | Angular SSR + static prerendering is a first-class Vercel workload; the app was already deployed there before the monorepo split, and stayed put. |
| `api/` | Render | ASP.NET Core needs a long-running process (not a serverless function per request), which Render supports directly as a native .NET web service. |

The two are deployed independently. A change to `api/` does not require a
`web/` deploy, and vice versa — enforced by GitHub Actions running from each
app's own subdirectory (see [Render Deployment](../deployment/render-deployment.md)
and [Vercel Deployment](../deployment/vercel-deployment.md)).

## Why Firebase stays the source of truth (for now)

The Angular app was built Firebase-first: Firestore for all data
(subscribers, campaigns, templates, queue items), Firebase Authentication
for the admin portal (Google Sign-In, currently gated to a single hardcoded
admin email — see [Firestore Schema](../database/firestore-schema.md) for
why). The .NET API was introduced later as a **foundation for future
server-side logic** — WhatsApp Cloud API calls, scheduled jobs, anything
that shouldn't run in a browser — not as a replacement for Firebase.

The API already has `FirebaseOptions` and a reserved
`TokenValidationMiddleware` slot (see
[Backend Architecture](backend-architecture.md)) so that when it does need
to verify a Firebase ID token from an Angular request, that's a matter of
filling in existing infrastructure, not building new plumbing.

## Request flow (current state)

**Storefront / admin portal (`web/`):**
```
Browser → Angular (SSR + hydration, or pure CSR for /admin/**)
        → Firebase SDK (dynamic imports) → Firestore / Firebase Auth
```

**API (`api/`), reachable but not yet called by `web/`:**
```
Browser / any client → api.<render-domain>/api/v1/{controller}
                      → GlobalExceptionMiddleware → TokenValidationMiddleware (pass-through)
                      → Controller → I*Service → (no implementation yet)
```

## Cross-cutting concerns and where they live

| Concern | Owner |
| --- | --- |
| Authentication (today) | Firebase Auth, checked client-side in `web/` via `AdminAuthService` |
| Authentication (planned) | `api/`'s `TokenValidationMiddleware` + `IFirebaseService`, verifying the same Firebase ID tokens `web/` already obtains |
| Data validation | Firestore Security Rules (`firestore.rules`) for anything Firestore-writable directly from the browser; will move to the API's `Validators/` once endpoints exist |
| CORS | `api/appsettings.json` (`Cors:AllowedOrigins`), restricted to the Vercel domain and local dev — see [API Conventions](../api/api-conventions.md) |
| Logging | Serilog in `api/` (structured, environment-configurable); `console.error`/`console.log` with feature prefixes (`[Marketing]`, `[Campaigns]`, `[Insider]`) in `web/` |
| Secrets | Never committed — `appsettings.json` ships with empty values, real values via environment variables; Angular's Firebase config is a public client key by design (Firebase's security model relies on rules, not key secrecy) |

## What "infrastructure-only" means for `api/`

The API was deliberately built to a specific stopping point: every
controller, service interface, and cross-cutting concern (logging,
exceptions, versioning, CORS, health checks) is wired and *provably works*
(see [Backend Architecture](backend-architecture.md#verification)), but
**no controller other than `Health` has an implemented action**, and
**no business logic, WhatsApp API call, or Firebase Authentication check
has been written**. This is intentional — the next feature to land in
`api/` should only need to fill in an existing `I*Service` and add actions
to its already-injected controller, not touch `Program.cs` or the DI
composition root.
