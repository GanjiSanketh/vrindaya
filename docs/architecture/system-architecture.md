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

**Today**, this is a genuinely mixed picture, by area:

- **Product Management & Homepage CMS** — fully API-mediated. Angular
  never writes to Firestore or uploads to Storage for products, categories,
  hero banners, promotional banners, or homepage config; every write and
  every image upload goes through `api/`'s controllers. The public
  storefront's product **reads** are the one exception on the write side
  of this boundary — `ProductRepository.listenActive` still reads Firestore
  directly for the homepage/category/search-adjacent live listeners; admin
  reads and every mutation go through the API. See
  [API Reference](../API_REFERENCE.md) and
  [Firestore Schema](../database/firestore-schema.md).
- **Marketing (subscribers, campaigns, WhatsApp delivery)** — still
  Firebase-first: `web/` reads/writes Firestore directly for all of it;
  `api/`'s `CampaignDeliveryWorker` is the one piece of server-side logic
  in this area (a background poller, not a request-driven endpoint).
- **Admin authentication** — Firebase Auth (Google Sign-In) in `web/`,
  as before, but the *same* Firebase ID token is now verified server-side
  too (JWT Bearer, `api/`'s `AddFirebaseAuthentication()`) for every
  Product/Homepage-CMS mutation — see
  [Backend Architecture](backend-architecture.md).

This asymmetry is intentional, not drift: Product Management and the
Homepage CMS were built API-first from the start (see
[Firestore Schema](../database/firestore-schema.md)); Marketing hasn't
been migrated yet and remains a candidate for the same treatment later.

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
| `api/` | Render (Docker) | ASP.NET Core needs a long-running process (not a serverless function per request), which Render runs as a container built from `api/Dockerfile`. |

The two are deployed independently. A change to `api/` does not require a
`web/` deploy, and vice versa — enforced by GitHub Actions running from each
app's own subdirectory (see [Render Deployment](../deployment/render.md)
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

**Product Management & Homepage CMS (`web/` → `api/` → Firestore/Storage):**
```
Browser → Angular → api.<render-domain>/api/v1/{products|hero-banners|
                     promotional-banners|categories|homepage-config|
                     homepage|homepage-assets}
        → GlobalExceptionMiddleware → UseAuthentication (JWT Bearer,
          verifies the Firebase ID token Angular already has) →
          UseAuthorization ("AdminOnly" policy on mutations)
        → Controller → I*Service → Firestore / Firebase Storage
```
The homepage itself makes exactly one call — `GET /api/v1/homepage` —
which the API aggregates server-side and caches (`IMemoryCache`, 60s TTL).

**Marketing (subscribers, campaigns, WhatsApp), admin auth (`web/`):**
```
Browser → Angular (SSR + hydration, or pure CSR for /admin/**)
        → Firebase SDK (dynamic imports) → Firestore / Firebase Auth
```

**WhatsApp send/webhook (`api/`), called by `web/`'s admin WhatsApp settings page:**
```
Browser → api.<render-domain>/api/v1/whatsapp/*
        → GlobalExceptionMiddleware → Controller → IWhatsAppService → Meta Cloud API
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

## What's actually implemented in `api/`

Every cross-cutting concern (logging, exceptions, versioning, CORS, health
checks) is wired and *provably works* (see
[Backend Architecture](backend-architecture.md#verification)). On top of
that foundation, two feature areas now have full business logic:

- **Product Management** — `ProductController` (CRUD, search, bulk
  status/restore, image upload) plus its collaborators
  (`ProductValidationService`, `InventoryService`, `ProductStorageService`,
  `ImageCompressionService`).
- **Homepage CMS** — `HeroBannerController`, `PromotionalBannerController`,
  `CategoryController`, `HomepageConfigController`, `HomepageController`
  (the `GET /homepage` aggregator), `HomepageAssetsController`, backed by
  `HomepageStorageService` and `HomepageCacheService`.

Firebase ID token verification (JWT Bearer) is real and enforced on every
mutating action in both areas — see
[Backend Architecture](backend-architecture.md#authentication). `Health`
and `WhatsApp` (send + webhook) were the original implemented areas and
remain unauthenticated, unchanged. `Marketing`, `Campaign`, `Analytics`,
`Orders`, `Auth` controllers are still scaffolding-only (registered,
zero actions) — see
[Controllers with no implemented endpoints](../API_REFERENCE.md#controllers-with-no-implemented-endpoints-scaffolding-only).
Adding a feature to either implemented area, or filling in a scaffolded
one, follows the same pattern either way: fill in an `I*Service`, add
actions to its controller — `Program.cs` and the DI composition root
shouldn't need to change.
