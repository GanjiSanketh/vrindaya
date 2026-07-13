# Vrindaya

[![Angular Build](https://github.com/GanjiSanketh/vrindaya/actions/workflows/angular-build.yml/badge.svg)](https://github.com/GanjiSanketh/vrindaya/actions/workflows/angular-build.yml)
[![.NET Build](https://github.com/GanjiSanketh/vrindaya/actions/workflows/dotnet-build.yml/badge.svg)](https://github.com/GanjiSanketh/vrindaya/actions/workflows/dotnet-build.yml)
[![Quality Check](https://github.com/GanjiSanketh/vrindaya/actions/workflows/quality-check.yml/badge.svg)](https://github.com/GanjiSanketh/vrindaya/actions/workflows/quality-check.yml)
[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![.NET](https://img.shields.io/badge/.NET-9-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth%20%7C%20Storage-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![WhatsApp Cloud API](https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366?logo=whatsapp&logoColor=white)](docs/META_WHATSAPP_SETUP.md)
[![Version](https://img.shields.io/badge/version-v1.0.0--beta-blue)](VERSION.md)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

**Version:** v1.0.0-beta — see [VERSION.md](VERSION.md) and [CHANGELOG.md](CHANGELOG.md)

> This is proprietary, closed-source software — see [LICENSE](LICENSE).
> Reuse, redistribution, and commercial use are prohibited without
> written permission.

Vrindaya is a fashion e-commerce storefront with an integrated WhatsApp
marketing platform: subscriber capture, campaign composition (text, image,
video, PDF), a campaign execution/recipient tracking engine, and a .NET
background worker that sends real messages via Meta's WhatsApp Cloud API.

## Project Overview

The repo is a monorepo with two independently deployable applications
sharing one Firebase project:

- **`web/`** — Angular 21 storefront (product catalog, wishlist) and an
  admin portal (product management, marketing/campaign tools), talking to
  Firestore directly via the Firebase JS SDK.
- **`api/`** — ASP.NET Core 9 Web API. Started as an infrastructure-only
  foundation; now runs a real background worker
  (`CampaignDeliveryWorker`) that reads campaign data from Firestore and
  sends WhatsApp messages via Meta's Cloud API. Most HTTP controllers
  beyond `Health` and `WhatsApp` remain deliberately unimplemented
  scaffolding for future phases (see [Future Roadmap](#future-roadmap)).

Both apps read/write the same Firebase project (`vrindaya-ad7b0`) —
Firestore is the system's source of truth, not a database owned by either
app individually.

## Architecture

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
                                                       │
                                              ┌────────▼────────┐
                                              │ Meta WhatsApp   │
                                              │ Cloud API       │
                                              └─────────────────┘
```

`web/` writes campaigns, executions, and recipients to Firestore. `api/`'s
`CampaignDeliveryWorker` (a .NET `BackgroundService`, not an HTTP
endpoint) polls Firestore independently and calls Meta on `web/`'s behalf
— the two apps never call each other directly today.

Full architectural rationale: [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md),
[frontend-architecture.md](docs/architecture/frontend-architecture.md),
[backend-architecture.md](docs/architecture/backend-architecture.md).

## Folder Structure

```
Vrindaya/
├── web/                       Angular 21 application
│   ├── src/app/
│   │   ├── components/        Homepage-only presentational sections
│   │   ├── core/               App-wide services, models, constants
│   │   ├── shared/              Reusable components/directives/utils across features
│   │   ├── features/            Routed pages (storefront + admin + marketing)
│   │   └── data/                Static seed data (products.json)
│   └── src/environments/       environment.ts / environment.prod.ts
│
├── api/                       ASP.NET Core 9 Web API
│   ├── Controllers/           HTTP endpoints — thin, delegate to Services/
│   ├── Interfaces/            I*Service / I*Provider / I*Repository contracts
│   ├── Services/              Implementations (WhatsApp/, CampaignDelivery/ have real logic)
│   ├── Models/                Firestore document POCOs ([FirestoreData])
│   ├── DTOs/                  HTTP request/response shapes
│   ├── Configuration/         Strongly typed Options classes
│   ├── Middleware/             Global exception handling, reserved token validation
│   ├── Extensions/             DI composition root, pipeline wiring
│   ├── Constants/               Shared literals, status string constants
│   └── Validators/              Request validation attributes
│
├── firebase.json              Shared Firestore/Storage rules config
├── firestore.rules
├── storage.rules
└── docs/                      Full documentation set (see below)
```

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 21 (standalone components, Signals, SSR + hydration) |
| Frontend hosting | Vercel |
| Backend | ASP.NET Core 9 Web API |
| Backend hosting | Render |
| Database | Firebase Firestore |
| File storage | Firebase Storage |
| Auth (storefront/admin) | Firebase Authentication (Google Sign-In) |
| Messaging | Meta WhatsApp Cloud API |
| Backend Firestore client | Google.Cloud.Firestore (service-account credentials) |
| Logging | Serilog (structured, console sink) |
| API docs | Swashbuckle/Swagger (Development only) |

## Features

- **Storefront**: product catalog, category browsing, wishlist, PWA support.
- **Admin Portal**: Firebase Google Sign-In (single hardcoded admin email
  today), product CRUD.
- **Marketing**: subscriber capture (sticky ribbon + exit-intent modal),
  CSV/XLSX bulk import, direct-`getDoc()` duplicate detection.
- **Campaigns**: compose text/image/video/PDF campaigns with live preview,
  schedule or send immediately, template library.
- **Campaign Execution Engine**: one `campaignExecutions` record per send,
  live progress tracking (status, processed/successful/failed counts).
- **Campaign Recipient Engine**: one `campaignRecipients` record per
  subscriber per execution, with a filterable/searchable/paginated
  Execution Details page and per-recipient delivery timeline.
- **Background Delivery Worker**: a .NET `BackgroundService` that
  actually sends the queued messages via Meta's Cloud API — text, image,
  video, and document message types, with cancellation support and
  atomic stat updates.
- **WhatsApp Cloud API Integration**: real Graph API calls (not a mock),
  webhook verification handshake implemented (event processing is a
  documented future step).

Full detail per module: [docs/marketing/](docs/marketing/).

## Installation

### Prerequisites

- Node.js 20+ and npm
- .NET 9 SDK (`api/global.json` pins the exact version)
- A Firebase project (Firestore + Storage + Authentication enabled)
- A Meta developer app with WhatsApp Cloud API access (for real sending)

### Clone and install

```bash
git clone <this-repo-url>
cd vrindaya

cd web && npm install
cd ../api && dotnet restore
```

## Running Angular

```bash
cd web
npm start              # ng serve — http://localhost:4200
```

```bash
npm run build           # production build → web/dist/vrindaya
npm run test:ci          # vitest, non-watch, coverage on
npm run lint              # eslint src/ --max-warnings=0
```

`web/` talks directly to the real Firebase project in every environment,
including local dev — there is no local Firestore emulator configured.

## Running the API

```bash
cd api
dotnet restore
dotnet run               # http://localhost:5000, https://localhost:5001
```

- Swagger UI (Development only): `https://localhost:5001/swagger`
- Rich health endpoint: `GET https://localhost:5001/api/v1/health`
- Infra health check: `GET https://localhost:5001/health`

`CampaignDeliveryWorker` starts automatically with the app and polls
Firestore every 5 seconds by default (see
[Environment Variables](#environment-variables)). Without valid
`Firebase:*` credentials it logs a retryable error each tick but does not
crash the app or affect the HTTP endpoints.

## Firebase Setup

1. Create a Firebase project with **Firestore**, **Storage**, and
   **Authentication** (Google Sign-In provider) enabled.
2. Deploy the shared rules from the repo root:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
3. Populate `web/src/environments/environment.ts` /
   `environment.prod.ts` with the project's **public** web app config
   (`apiKey`, `authDomain`, etc. — safe to commit; Firebase's security
   model relies on Security Rules, not key secrecy).
4. For `api/`, generate a **service account key** (Project Settings →
   Service Accounts → Generate new private key) and set `Firebase:ProjectId`,
   `Firebase:ClientEmail`, `Firebase:PrivateKey` (see
   [Environment Variables](#environment-variables)) — this is what
   `CampaignDeliveryWorker` uses to connect to Firestore server-side.
5. Update `AdminAuthService.ADMIN_EMAIL` (`web/`) and the matching
   `isAdminUser()` literal in `firestore.rules`/`storage.rules` to your
   own admin account — these three must stay in sync manually (see
   [Firestore Schema](docs/database/firestore-schema.md)).

## Meta WhatsApp Setup

1. Create a Meta developer app with the **WhatsApp** product added, and a
   test (or production) phone number.
2. Collect: **Access Token**, **Phone Number ID**, **WhatsApp Business
   Account ID**.
3. Set `WhatsApp:AccessToken`, `WhatsApp:PhoneNumberId`,
   `WhatsApp:BusinessAccountId`, `WhatsApp:ApiVersion` (e.g. `v23.0`) in
   `api/` config (see [Environment Variables](#environment-variables)).
   **Never commit a real access token** — `api/appsettings.Development.json`
   is git-ignored specifically for this.
4. Choose a `WhatsApp:VerifyToken` (any string you pick) and register your
   webhook URL (`https://<your-api>/api/v1/whatsapp/webhook`) plus that
   token in Meta's App Dashboard — the GET verification handshake is
   already implemented.
5. **Before sending to real, non-test-window contacts**: submit message
   templates for approval in Meta Business Manager. Meta rejects free-form
   messages (any type) outside a 24-hour customer-initiated window — see
   [WhatsApp Integration Plan](docs/marketing/whatsapp-integration-plan.md)
   for the full accounting of what's implemented versus what this implies
   for real campaigns.

## Deployment Overview

| App | Platform | Notes |
| --- | --- | --- |
| `web/` | Vercel | Root Directory = `web`; deploys via `.github/workflows/ci.yml` after lint/test/SonarCloud pass |
| `api/` | Render | Root Directory = `api`; Build: `dotnet publish -c Release -o out`; Start: `dotnet out/Vrindaya.Api.dll` |

Full guides: [Vercel Deployment](docs/deployment/vercel-deployment.md),
[Render Deployment](docs/deployment/render-deployment.md).

## Environment Variables

`api/appsettings.json` ships with empty secret values; real values are
supplied via environment variables using ASP.NET Core's double-underscore
convention (these override the matching JSON section automatically).

| Section | Variables | Consumed by |
| --- | --- | --- |
| Firebase | `Firebase__ProjectId`, `Firebase__ClientEmail`, `Firebase__PrivateKey` | `FirebaseService` → `CampaignDeliveryWorker` |
| WhatsApp | `WhatsApp__AccessToken`, `WhatsApp__PhoneNumberId`, `WhatsApp__BusinessAccountId`, `WhatsApp__VerifyToken`, `WhatsApp__ApiVersion` | `MetaWhatsAppProvider`, `WhatsAppService` |
| CampaignDelivery | `CampaignDelivery__BatchSize` (default 20), `CampaignDelivery__PollingIntervalSeconds` (default 5) | `CampaignDeliveryWorker` |
| Cors | `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`, ... | `AddCorsPolicy()` |
| Jwt | `Jwt__Issuer`, `Jwt__Audience`, `Jwt__SecretKey`, `Jwt__ExpiryMinutes` | Not consumed yet — reserved for `TokenValidationMiddleware` |
| Logging | `Serilog__MinimumLevel__Default` | Serilog |

Angular's config (`web/src/environments/*.ts`) is compiled into the bundle
at build time, not read from `process.env` — see
[Environment Variables](docs/setup/environment-variables.md) for the full
list and the values that must stay in sync across both apps manually
(admin email, CORS origins, API base URL).

## Future Roadmap

Ordered by dependency in [docs/roadmap/roadmap.md](docs/roadmap/roadmap.md):

1. Meta template-approved sending (urgent — most real sends currently hit
   the 24-hour customer-window restriction).
2. Placeholder substitution (`{{name}}` etc. still sent literally).
3. Firebase Authentication in `api/` (`TokenValidationMiddleware` is a
   reserved pass-through today).
4. Resolve the `admin-users` / `AdminAuthService` split (multi-admin
   support is scaffolded but not wired in).
5. CI/CD for `api/` (currently deploys via Render's own Git watcher, no
   quality gate).
6. WhatsApp delivery/read webhook processing (currently log-only by
   design).
7. Campaign audience segmentation, subscriber opt-out flow.

## Documentation

This README covers the essentials. For architecture rationale, the full
Firestore schema, deployment guides, and every module's design decisions,
see [`/docs`](docs/README.md) — the source of truth for *why*, not just
*how*.

## Contributing & Repository Standards

- [CONTRIBUTING.md](docs/CONTRIBUTING.md) / [DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md) — branch strategy, commit conventions, coding standards, PR/review checklists
- [.github/pull_request_template.md](.github/pull_request_template.md) — auto-applied to every PR
- [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) — Bug Report, Feature Request, Deployment Issue, Documentation Issue, Performance Issue
- [.github/CODEOWNERS](.github/CODEOWNERS) — review assignment (update the placeholder before relying on this)
- [.github/SECURITY.md](.github/SECURITY.md) — vulnerability reporting policy; see also [docs/SECURITY.md](docs/SECURITY.md) for the full technical security posture
- [LICENSE](LICENSE) — proprietary, all rights reserved

### Automation

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `angular-build.yml` | Push/PR touching `web/` | Verify `web/` installs and builds |
| `dotnet-build.yml` | Push/PR touching `api/` | Verify `api/` restores, builds, and runs tests if any exist |
| `quality-check.yml` | Every push/PR | No TODO markers, no obvious hardcoded secrets, README/LICENSE present |
| `ci.yml` | Push/PR to `main` (web/ scope) | Lint, test, SonarCloud, then deploy `web/` to Vercel on `main` |
| `release.yml` | Manual only | Build both apps, create a **draft** GitHub Release with artifacts attached — never deploys |
