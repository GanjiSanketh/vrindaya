# Completed Features

A snapshot of what has actually been built, as of **2026-07-07**. This is
a state tracker, not a changelog — it describes what exists in the working
tree right now, grouped by milestone. For per-commit history use
`git log`; this file is for "what can the app do today," which git history
alone doesn't answer when a milestone spans many small commits.

> **Working-tree note**: at the time of writing, the monorepo split
> (`web/` + `api/`) and the entire Marketing/Campaign/WhatsApp module are
> present in the working tree but **not yet committed** — `git status`
> shows the old flat Angular structure as deleted and `web/`/`api/` as
> untracked. This document describes the working tree, since that's the
> actual current state of the application; it will need a pass once these
> changes are committed to confirm nothing drifted between now and then.

> **Since this was written (2026-07-07)**: four more feature phases shipped
> against `api/`, none reflected in the sections below yet (this addendum
> is a pointer, not a rewrite of the historical record above it):
> - **Collections** — a second homepage-curatable product grouping
>   alongside Category, with its own admin CRUD, public landing page
>   (`/collection/:slug`), and homepage Featured/Trending override slugs.
> - **Flipkart Operations Module** — manual Flipkart listing URL/status
>   tracking per product (no Flipkart API), its own admin dashboard and
>   bulk-URL-assignment tooling.
> - **Inventory & Product Lifecycle Management** — stock/low-stock-threshold/
>   auto-hide fields plus a 10-stage `LifecycleStage` replacing the earlier,
>   narrower Flipkart-only status; Archived products are auto-excluded from
>   homepage-curated lists.
> - **Brand CMS & SEO** — About Us/Contact/Store Information/Social Links/
>   FAQs/Policies as one admin-editable `brandConfig/singleton` document,
>   backing new public Brand pages, plus sitemap/robots.txt and
>   `SeoService`-driven metadata across every route.
>
> A production-hardening pass followed (security, dead-code removal,
> caching, validation, accessibility — see [CHANGELOG.md](../../CHANGELOG.md)
> and [TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md)), which is why `Jwt` no
> longer appears in `api/`'s Options-pattern list below and
> `TokenValidationMiddleware` no longer exists — real Firebase JWT Bearer
> auth replaced both.

## Storefront (original Angular app, committed history)

- Fashion landing page: hero, categories, new arrivals, trending products,
  customer love/testimonials sections. (An earlier iteration also had
  brand-story and community-showcase sections; both were superseded by
  later redesigns and the now-unused components were removed during the
  v1.0.0-beta cleanup — see [Changelog](../../CHANGELOG.md).)
- Product catalog backed by `web/src/app/data/products.json` +
  `ProductStoreService`, with a wishlist stored in `localStorage`.
- Mobile responsiveness pass across the whole site.
- Feature-based code architecture and an application security hardening
  pass (CSP, security headers, ESLint rules — see `vercel.json`).
- Exit-intent popup (an earlier, simpler version — since superseded by the
  Insider ribbon/modal experience below) with admin-configurable settings.
- SEO service (`SeoService`), `OptimizedImageComponent`, and PWA support
  (service worker, manifest, install prompt, update notification).
- Admin portal (`/vrindaya-admin-portal` → later `/admin`): Firebase Google
  Sign-In gated to one hardcoded email, product CRUD backed by
  `localStorage`, `RenderMode.Client` for the whole admin subtree.
- Admin role/sign-up screens (`admin-management`) — UI built, but **not
  wired into the actual auth decision** (see
  [Firestore Schema](../database/firestore-schema.md#admin-users)).

## Marketing Module (Vrindaya Insider)

- `marketingSubscribers` Firestore collection, keyed by mobile number, with
  a fully worked-out security-rules model (public whitelisted `create`,
  public single-doc `get`, admin-only `list`/`update`/`delete` — see
  [Firestore Schema](../database/firestore-schema.md)).
- Sticky ribbon + exit-intent modal subscriber capture, replacing an
  earlier static "VIP Club" homepage section — session/localStorage-based
  suppression logic (`InsiderExperienceService`).
- Direct-`getDoc()` duplicate detection (no queries) — see
  [Marketing Module](../marketing/marketing-module.md#duplicate-detection).
- Marketing Dashboard admin page — live subscriber count stats, table,
  CSV export.
- Marketing Contacts admin page — CSV/XLSX bulk import via `xlsx`
  (SheetJS), with explicit pre-write duplicate checks (batched `in`
  queries) since admins hold `update` and can't rely on the public-flow
  trick.

## Campaign Module (Phase 2)

- `campaigns`, `campaignTemplates`, `campaignQueue`, `testMessages`
  Firestore collections, all fully admin-gated.
- Five routed pages: list, create/edit form, read-only view, history,
  plus the settings/template/queue/dashboard pages listed below.
- Status lifecycle: `DRAFT → SCHEDULED/READY_TO_SEND`, `CANCELLED` from any
  non-`SENT` state — `SENT` not yet reachable (see
  [Campaign Module](../marketing/campaign-module.md#status-lifecycle)).
- Six self-seeding default templates + full template CRUD.
- "Send Now" fans a campaign out into `campaignQueue`, one document per
  subscriber. **Now superseded** by `campaignRecipients`/`CampaignDeliveryWorker`
  (see below) — `campaignQueue` still gets written on every send, but
  nothing processes it anymore; see [Roadmap](roadmap.md) for retiring it.

## WhatsApp Campaign Infrastructure (Phase 3)

- WhatsApp Settings admin page — Meta Business API credentials stored in
  `whatsappSettings/default` (now informational only — the live send path
  reads `api/`'s `WhatsApp:*` config, not this document).
- Campaign Form enhancements: Send Test (writes a `testMessages` intent
  document, still intent-only), Live WhatsApp Preview (client-side visual
  approximation, no network call).
- Campaign Queue and Delivery Dashboard admin pages — views over
  `campaignQueue`, now stale (see above).

## Meta WhatsApp Cloud API Integration

- `api/Services/WhatsApp/MetaWhatsAppProvider.cs` + `IWhatsAppProvider` —
  **real** calls to `https://graph.facebook.com`, via `IHttpClientFactory`,
  Bearer-authenticated from `WhatsAppOptions.AccessToken`. Verified against
  the real Graph API (a placeholder token produced a genuine
  `Invalid OAuth access token` response, parsed into a clean `502`).
- `POST /api/v1/whatsapp/test`, `GET /api/v1/whatsapp/health` — both real,
  validated (phone number format, message length/emptiness), logged
  (`RequestId`/phone number/duration/Meta response, never the access token).
- `GET`/`POST /api/v1/whatsapp/webhook` — Meta's verification handshake is
  fully implemented; incoming events are logged only, by explicit design
  (processing them is future work — see
  [WhatsApp Integration Plan](../marketing/whatsapp-integration-plan.md)).
- **Explicitly not built in this phase**: template-based sending (the
  `SendTemplateMessageAsync` method exists but nothing calls it),
  placeholder substitution, webhook processing.

## Campaign Execution Engine

- `campaignExecutions` Firestore collection — one document per "Send
  Campaign" click, tracking the send as a whole (status, recipient counts,
  started/completed timestamps), separate from per-recipient tracking.
- Execution Progress page (`/admin/campaigns/:id/execution`) — live
  `onSnapshot` view via the reusable `ExecutionProgressCardComponent`.
- "View Progress" action added to Campaign List for `READY_TO_SEND`/`SENT`
  campaigns — the only existing-UI touch this phase required.

## Campaign Recipient Engine

- `campaignRecipients` Firestore collection — one document per subscriber
  per *execution* (not just per campaign), with a snapshot of
  name/phone number plus richer per-attempt fields (`messageId`,
  `attempts`, `errorMessage`, full timeline timestamps) than
  `campaignQueue` ever had.
- Execution Details page (`/admin/campaigns/:id/execution/recipients`) —
  status filter pills, name/phone search (client-side over loaded pages),
  cursor-paginated `getDocs()` loading (not a live listener — deliberately,
  for campaigns with thousands of recipients), expandable per-row timeline.
- Execution stats (`processedRecipients`/`successfulRecipients`/
  `failedRecipients`) are genuinely derived from recipient statuses via
  `CampaignRecipientService.getStatusCounts()`, not hardcoded.

## Background Campaign Delivery Engine

- `api/Services/CampaignDelivery/CampaignDeliveryWorker.cs` — a .NET
  `BackgroundService`, registered once in `Program.cs`, running for the
  app's entire lifetime independent of any HTTP request. The first thing
  in `api/` to actually connect to Firestore (`IFirebaseService` now builds
  a real `FirestoreDb` client from `FirebaseOptions`' service-account
  fields, previously unused since Phase 1 of the monorepo work).
- Polls every `CampaignDelivery:PollingIntervalSeconds` (default 5s) for
  `QUEUED`/`IN_PROGRESS` executions, claims `QUEUED` ones
  (`status → IN_PROGRESS`, `startedAt` set), and processes up to
  `CampaignDelivery:BatchSize` (default 20) `QUEUED` recipients per
  execution per tick via the existing `IWhatsAppProvider` — no new WhatsApp
  code, full reuse.
- Cancellation support: a live status re-check before every batch *and*
  before every individual recipient — an execution set to `CANCELLED`
  stops immediately, even mid-batch. (Nothing in Angular sets this status
  yet; see [Roadmap](roadmap.md).)
- Atomic stat increments (Firestore `FieldValue.Increment`), automatic
  `COMPLETED`/`startedAt`/`completedAt` transitions, and full lifecycle
  logging (Started/Batch Started/Batch Completed/Completed/Failed).
- Verified: `dotnet build` — 0 warnings, 0 errors. App starts and serves
  `/health`/`/api/v1/health` normally with the worker running alongside;
  confirmed the worker logs its correct configured values and retries
  gracefully every tick when Firebase credentials are absent, without
  crashing the process. Full success-path verification (an execution
  actually completing) needs real Firebase Admin SDK credentials, which
  this environment doesn't have.
- **Explicitly not built in this phase** (per hard constraint): any change
  to WhatsApp webhook processing — the webhook remains log-only, exactly
  as before.

## Media Campaigns

- Campaign model extended with `mediaType` (`Text`/`Image`/`Video`/`PDF`/`Mixed`)
  — deliberately a new, separate field from `campaignType` (the channel),
  to avoid overloading an existing field's meaning. Also added:
  `videoUrl`, `documentUrl`, `thumbnailUrl`, `caption`, `footer`, `buttonText`.
- Campaign Form: media type picker gates which upload field(s) show;
  upload validation matches Meta's own Cloud API media limits (5MB image /
  16MB video / 100MB document, correct content types); each upload
  previews via the new reusable `MediaPreviewComponent` before saving.
- `MediaPreviewComponent` (`components/media-preview/`) — supports
  image/video/PDF, reused in the campaign form and the campaign view page.
- Campaign List shows a media type badge (icon + label) per campaign,
  distinct from the existing channel "Type" column.
- Analytics page (previously a static placeholder) now shows a real
  campaign-count-by-media-type breakdown, computed from `CampaignService`.
- `IWhatsAppProvider`/`MetaWhatsAppProvider` extended with
  `SendImageMessageAsync`/`SendVideoMessageAsync`/`SendDocumentMessageAsync`
  — official Meta Cloud API payloads (`link`+`caption`, `filename` for
  documents). `CampaignDeliveryWorker` picks the right one from the
  campaign's `mediaType`, falling back to text — no changes to how
  executions/recipients are created (per constraint), only to what the
  worker sends.
- Storage: new `campaign-videos/`, `campaign-documents/` paths (same
  public-read/admin-write shape as the existing `campaign-images/`);
  thumbnails reuse `campaign-images/` directly rather than getting a new
  path, since a thumbnail is still just an image ("do not duplicate
  uploads").
- Backward compatible: campaigns created before `mediaType` existed have
  no such field — the app infers `"Image"` if one was already attached,
  else `"Text"`, so old drafts still open with the correct fields visible.
- **Explicitly not built in this phase**: template/placeholder substitution
  (unchanged from before), and any Meta message type beyond
  text/image/video/document — `footer`/`buttonText`/`thumbnailUrl` remain
  display-only, since Meta's basic message types have no slot for them.

## Monorepo + .NET API foundation

- Repository restructured: Angular app moved to `web/`, new ASP.NET Core 9
  Web API added at `api/`, both under the same repo/Git history — no new
  repo or workspace created.
- `api/` folder structure: `Controllers/`, `Interfaces/`, `Services/`,
  `Models/`, `DTOs/`, `Configuration/`, `Middleware/`, `Extensions/`,
  `Helpers/`, `Validators/`, `Constants/`, `Common/`.
- Eight controllers scaffolded (constructor-injected against their
  `I*Service`), **all with zero implemented actions except
  `HealthController`**.
- Cross-cutting infrastructure, all verified by actually running the app
  (see [Backend Architecture](../architecture/backend-architecture.md#verification)):
  Serilog structured logging, API versioning (`Asp.Versioning.Mvc 8.1.0`,
  pinned for `net9.0` compatibility), Swagger (dev-only), CORS restricted
  to two named origins, Global Exception Middleware with a fixed JSON
  error shape, a reserved-but-pass-through `TokenValidationMiddleware`,
  and two health check endpoints (`/health`, `/api/v1/health`) at
  different stability tiers.
- Options-pattern configuration classes for `Firebase`, `WhatsApp`, `Jwt`,
  `Cors` — all bindable via environment variables, none consumed by
  business logic yet since none exists.
- **Explicitly not implemented**: any business logic, WhatsApp API calls,
  or Firebase Authentication in `api/` — this was a hard constraint on the
  scope of this milestone, not an oversight.

## Documentation

- This `/docs` directory itself — architecture, API conventions, Firestore
  schema, deployment guides, marketing/campaign/WhatsApp module docs,
  design system, roadmap, and setup guides.

## Known pre-existing gaps (not introduced by any of the above)

- `admin-users` collection has admin-management UI and a service, but no
  Firestore rules and no wiring into `AdminAuthService` — see
  [Firestore Schema](../database/firestore-schema.md#admin-users).
- The `--maroon` CSS variable is actually teal — a naming leftover from an
  earlier rebrand. See [Design System](../branding/design-system.md).
