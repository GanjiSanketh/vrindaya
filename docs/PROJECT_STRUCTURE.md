# Project Structure

A complete, annotated file tree of the Vrindaya monorepo as it exists
today. Empty/reserved folders are called out explicitly rather than
omitted, so this document doesn't imply more exists than actually does.

## Top Level

```
Vrindaya/
├── web/                Angular 21 application — deployed to Vercel
├── api/                 ASP.NET Core 9 Web API — deployed to Render
├── docs/                 Documentation (architecture, setup, this file, etc.)
├── firebase.json          Points Firebase CLI at the two rules files below
├── firestore.rules        Firestore Security Rules (shared infrastructure)
├── storage.rules           Cloud Storage Security Rules (shared infrastructure)
├── README.md                Project overview, setup, quick reference
├── CHANGELOG.md              Version history
└── VERSION.md                 Current version and status
```

`firebase.json`/`firestore.rules`/`storage.rules` sit at the repo root,
outside both apps, because they're infrastructure neither app owns
exclusively — see [ARCHITECTURE.md](ARCHITECTURE.md#monorepo-structure).

## `web/` — Angular 21 Application

```
web/
├── src/
│   ├── app/
│   │   ├── app.ts / app.html / app.routes.ts / app.config.ts   Root shell + route table
│   │   ├── app.routes.server.ts                                  SSR render-mode overrides (admin/** forced client-only)
│   │   │
│   │   ├── layout/               Storefront shell — header, footer, root layout
│   │   │
│   │   ├── components/            Homepage-only presentational sections
│   │   │   ├── categories/          "Shop by category" grid
│   │   │   ├── customer-love/        Testimonials section
│   │   │   ├── hero/                  Homepage hero banner
│   │   │   ├── new-arrivals/           New-arrivals showcase
│   │   │   ├── popup/                   Legacy popup component
│   │   │   └── trending-products/        Trending products showcase
│   │   │
│   │   ├── core/                  App-wide, singleton-scoped building blocks
│   │   │   ├── constants/            app.constants.ts, routes.constants.ts
│   │   │   ├── models/                product.model.ts, popup.model.ts
│   │   │   ├── services/               ProductService, ProductStoreService, WishlistService,
│   │   │   │                            SeoService, SearchService, PopupService, ExitIntentService,
│   │   │   │                            LightboxService, QuickViewService, RecentlyViewedService,
│   │   │   │                            LoggerService, GlobalErrorHandlerService
│   │   │   ├── guards/                 Reserved — currently empty; admin-specific guards live
│   │   │   │                            in features/admin/guards/ instead
│   │   │   └── interceptors/            Reserved — currently empty; no HTTP interceptor is
│   │   │                                 registered yet
│   │   │
│   │   ├── shared/                Reusable across ≥2 features (never imports from features/)
│   │   │   ├── components/           ProductCard, Toast, Skeleton, OptimizedImage,
│   │   │   │                          ImageLightbox, ExitIntentPopup, InstallPrompt,
│   │   │   │                          LoadingScreen, ProductQuickView, RecentlyViewed,
│   │   │   │                          UpdateNotification
│   │   │   ├── directives/            ScrollRevealDirective
│   │   │   ├── services/               ToastService
│   │   │   ├── utils/                   firestore-error.util.ts, date-format.util.ts —
│   │   │   │                            shared helpers extracted from the marketing
│   │   │   │                            services during the v1.0.0-beta cleanup
│   │   │   └── pipes/                    Reserved — currently empty
│   │   │
│   │   ├── features/               Routed pages, one subfolder per route area
│   │   │   ├── home/                  Home page (composes components/ sections)
│   │   │   ├── products/               Category/product listing (category/:id)
│   │   │   ├── new-arrivals/            /new-arrivals page
│   │   │   ├── trending/                 /trending page
│   │   │   ├── wishlist/                  /wishlist page
│   │   │   ├── search/                     Search overlay
│   │   │   ├── not-found/, offline/          Error/offline pages
│   │   │   ├── categories/                  CATEGORIES_ROUTES — reserved, empty routes
│   │   │   │                                 array; category browsing is currently served
│   │   │   │                                 by products/ instead (see its own doc comment)
│   │   │   ├── customer-love/                 CUSTOMER_LOVE_ROUTES — same pattern, reserved
│   │   │   │                                   for a future standalone reviews page
│   │   │   ├── about/                          Empty directory — reserved, no files yet
│   │   │   │
│   │   │   ├── admin/                    Admin portal (mounted at /admin)
│   │   │   │   ├── layout/                  AdminLayoutComponent (sidebar + topbar)
│   │   │   │   ├── guards/                    adminAuthGuard, roleGuard
│   │   │   │   ├── services/                   AdminAuthService (the real auth check),
│   │   │   │   │                                 AdminProductService, AdminUsersService
│   │   │   │   │                                 (multi-admin model — not wired into auth)
│   │   │   │   ├── models/                       admin-user.model.ts
│   │   │   │   ├── pages/                          Dashboard, Login, Product List/Form,
│   │   │   │   │                                     Popup Config, Exit-Intent Config,
│   │   │   │   │                                     Analytics, Admin Management
│   │   │   │   └── admin.routes.ts                   Every /admin/** route, including all
│   │   │   │                                          marketing/campaign pages below
│   │   │   │
│   │   │   └── marketing/                 The WhatsApp marketing platform
│   │   │       ├── models/                    Campaign, CampaignExecution, CampaignRecipient,
│   │   │       │                                CampaignQueueItem, CampaignTemplate,
│   │   │       │                                MarketingSubscriber, WhatsAppSettings,
│   │   │       │                                TestMessage, BulkImport shapes
│   │   │       ├── services/                    CampaignService, CampaignExecutionService,
│   │   │       │                                  CampaignRecipientService, CampaignQueueService,
│   │   │       │                                  CampaignTemplateService, MarketingService,
│   │   │       │                                  WhatsAppSettingsService, TestMessageService,
│   │   │       │                                  BulkImportService, InsiderExperienceService
│   │   │       └── components/                   CampaignForm, CampaignList, CampaignView,
│   │   │                                            CampaignHistory, ExecutionProgress(+Card),
│   │   │                                            ExecutionDetails, CampaignQueueList,
│   │   │                                            DeliveryDashboard, TemplateList/Form,
│   │   │                                            WhatsAppSettings, WhatsAppPreview,
│   │   │                                            MediaPreview, MarketingDashboard,
│   │   │                                            MarketingContacts, BulkImport,
│   │   │                                            InsiderRibbon, InsiderModal
│   │   │
│   │   └── data/                    products.json — static product seed data
│   │
│   └── environments/               environment.ts (dev) / environment.prod.ts — Firebase
│                                      web config (public by design) + adminEmail + apiBaseUrl
│
├── angular.json, package.json, tsconfig*.json, vitest.config.ts
├── vercel.json                     Security headers + SPA rewrite rules
└── eslint.config.js
```

### Key services, briefly

| Service | Why it matters |
| --- | --- |
| `AdminAuthService` | The **real** authorization decision for `/admin/**` — a single hardcoded admin email, not the `admin-users` collection |
| `CampaignService` | CRUD for campaigns; also owns all campaign media uploads (`uploadCampaignImage/Video/Document/Thumbnail`) |
| `CampaignExecutionService` | Creates/reads `campaignExecutions`; `updateExecutionStats()` is the write path the delivery worker's Angular-side counterpart uses at creation time |
| `CampaignRecipientService` | Creates `campaignRecipients` snapshots at send time; paginated (not live-listened) reads for the Execution Details page |
| `InsiderExperienceService` | Session/localStorage-driven suppression logic for the sticky ribbon and exit-intent modal |
| `SeoService` | Per-page `<title>`/meta tags/JSON-LD, called from each page's `ngOnInit` |

## `api/` — ASP.NET Core 9 Web API

```
api/
├── Controllers/            HTTP endpoints — thin, delegate to a Service
│   ├── HealthController.cs      GET /api/v1/health — implemented
│   ├── WhatsAppController.cs     health/test/webhook — implemented
│   ├── ProductController.cs        Scaffolded, zero actions
│   ├── MarketingController.cs       Scaffolded, zero actions
│   ├── CampaignController.cs         Scaffolded, zero actions
│   ├── AnalyticsController.cs         Scaffolded, zero actions
│   ├── OrdersController.cs             Scaffolded, zero actions
│   └── AuthController.cs                Scaffolded, zero actions
│
├── Interfaces/             Contracts — what Controllers/DI depend on
│   ├── I*Service.cs              One per controller above
│   ├── IWhatsAppProvider.cs        Meta-agnostic send contract (text/image/video/document)
│   ├── IFirebaseService.cs          Firestore client accessor
│   └── ICampaignDeliveryRepository.cs  Pure Firestore data access for the worker
│
├── Services/               Implementations
│   ├── *Service.cs                One per empty interface above (also empty)
│   ├── FirebaseService.cs           Builds the shared FirestoreDb client (service account)
│   ├── WhatsApp/
│   │   ├── MetaWhatsAppProvider.cs    The only class that talks to Meta's Graph API
│   │   └── MetaApiContracts.cs          Internal Meta wire-format models (not DTOs)
│   └── CampaignDelivery/
│       ├── CampaignDeliveryWorker.cs     BackgroundService — the real send loop
│       └── CampaignDeliveryRepository.cs  Firestore reads/writes for the worker
│
├── Models/                 Firestore document POCOs ([FirestoreData]) — a different
│                              boundary from DTOs/: these map Firestore documents the
│                              worker reads, not HTTP payloads
│   ├── CampaignDocument.cs
│   ├── CampaignExecutionDocument.cs
│   └── CampaignRecipientDocument.cs
│
├── DTOs/                   HTTP request/response shapes
│   ├── HealthStatusDto.cs
│   └── WhatsApp/               SendMessageRequest/Response, WhatsAppHealthDto,
│                                  MetaErrorResponse, WebhookVerificationResult, WhatsAppSendResult
│
├── Configuration/          Strongly typed Options classes (Options pattern)
│   ├── FirebaseOptions.cs, WhatsAppOptions.cs, JwtOptions.cs, CorsOptions.cs,
│   │   CampaignDeliveryOptions.cs
│   └── ConfigureSwaggerOptions.cs
│
├── Middleware/
│   ├── GlobalExceptionMiddleware.cs    Catches everything; consistent JSON error envelope
│   └── TokenValidationMiddleware.cs      Reserved pass-through — no token checked yet
│
├── Extensions/
│   ├── ServiceCollectionExtensions.cs    The DI composition root
│   └── ApplicationBuilderExtensions.cs    Pipeline wiring helpers
│
├── Constants/
│   ├── AppConstants.cs                  App name, CORS policy name, Meta Graph API root
│   ├── CampaignExecutionStatus.cs         Mirrors the Angular CampaignExecution status literals
│   ├── CampaignRecipientStatus.cs          Mirrors the Angular CampaignRecipient status literals
│   └── CampaignMediaType.cs                 Mirrors the Angular CampaignMediaType literals
│
├── Validators/
│   └── WhatsAppPhoneNumberAttribute.cs   10–15 digit phone number format validation
│
├── Common/
│   └── ApiErrorResponse.cs                The one error shape GlobalExceptionMiddleware returns
│
├── Helpers/
│   └── IDateTimeProvider.cs / DateTimeProvider.cs   Testable UtcNow wrapper
│
├── Properties/launchSettings.json
├── appsettings.json                    Production defaults — all secrets empty
├── appsettings.Development.json         Local dev only — git-ignored (may contain real secrets)
├── Program.cs                             Composition root entry point
├── global.json                             Pins the .NET SDK version
└── Vrindaya.Api.csproj
```

### Why `Models/` and `DTOs/` are both present

This is the one .NET convention worth calling out explicitly: `Models/`
holds Firestore document shapes (`[FirestoreData]`, consumed only by the
background worker), while `DTOs/` holds HTTP request/response shapes
(consumed only by controllers). A class never serves both purposes —
if a new feature needs to both read a Firestore document and expose it
over HTTP, it gets two classes, one per boundary, not one shared class.

## `docs/` — Documentation

```
docs/
├── README.md                     Documentation index
├── ARCHITECTURE.md                 This document's sibling — system design
├── PROJECT_STRUCTURE.md              This file
├── API_REFERENCE.md                   Every real HTTP endpoint, request/response/errors
├── FIREBASE_SETUP.md                   Firebase project setup end to end
├── META_WHATSAPP_SETUP.md               Meta Cloud API setup end to end
├── DEPLOYMENT.md                          Vercel + Render deployment procedures
├── SECURITY.md                             Auth, secrets, CORS, logging posture
├── TROUBLESHOOTING.md                       Common failure modes and fixes
├── CONTRIBUTING.md                           Branching, commits, coding standards
├── RELEASE_NOTES_v1.0.0-beta.md                This release's scope and known limitations
│
├── architecture/                 Deeper-dive architecture docs (frontend/backend/system)
├── api/                            api-conventions.md — versioning, response shape rules
├── database/                        firestore-schema.md — full field-level schema
├── deployment/                       vercel-deployment.md, docker.md, render.md
├── marketing/                         marketing-module.md, campaign-module.md,
│                                        whatsapp-integration-plan.md
├── branding/                           design-system.md — palette/typography tokens
├── roadmap/                              roadmap.md, completed-features.md
└── setup/                                 local-development.md, environment-variables.md
```

The 10 files directly under `docs/` (this file included) are the
top-level, audience-facing reference set for this release. The nested
subfolders hold the longer-running, more granular design documentation
built up across earlier development phases — the top-level docs
cross-reference them rather than duplicate their content.
