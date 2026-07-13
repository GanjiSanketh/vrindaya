# Changelog

All notable changes to the Vrindaya platform are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
Given this is the first tagged release of a long-running working tree,
`v1.0.0-beta` documents everything shipped up to this point rather than a
single sprint's diff — see [docs/roadmap/completed-features.md](docs/roadmap/completed-features.md)
for the equally-detailed living version of this history.

## [v1.0.0-beta] — 2026-07-13

### Angular Storefront

- Fashion landing page: hero, categories, new arrivals, trending
  products, customer love/testimonials.
- Product catalog (`localStorage`-backed via `ProductStoreService`),
  wishlist, PWA support (service worker, install prompt, update
  notification), SEO service, optimized image loading.

### Admin Portal

- Firebase Google Sign-In (single hardcoded admin email), route guards
  with a resolve-timeout safety net, role-gated routes for a future
  multi-admin model.
- Product CRUD, popup/exit-intent configuration, analytics dashboard.

### Firebase

- Firestore Security Rules and Storage Rules covering every collection
  and media path used by the platform, with a consistent
  admin-gated-unless-explicitly-public pattern.
- Firebase Authentication (Google Sign-In) for the admin portal.

### Marketing Module

- `marketingSubscribers` collection (public whitelisted create, admin-only
  list/update/delete), keyed by mobile number for direct-`getDoc()`
  duplicate detection with no queries.
- Sticky ribbon + exit-intent modal subscriber capture.
- Marketing Dashboard (live stats, CSV export) and Marketing Contacts
  (CSV/XLSX bulk import with pre-write duplicate checks).

### Campaigns

- Campaign compose/schedule/send workflow with a live WhatsApp-bubble
  preview, template library (six self-seeding defaults + custom CRUD),
  campaign history.
- Status lifecycle: `DRAFT → SCHEDULED/READY_TO_SEND → CANCELLED`.

### Campaign Execution Engine

- `campaignExecutions` collection — one record per "Send Campaign" click,
  tracking status and recipient counts as a whole, separate from
  per-recipient detail.
- Execution Progress page with a reusable progress-card component.

### Campaign Recipient Engine

- `campaignRecipients` collection — one record per subscriber per
  *execution*, with per-attempt tracking (`messageId`, `attempts`,
  `errorMessage`, full delivery timeline).
- Execution Details page: status filters, name/phone search, cursor-based
  pagination (deliberately not a live listener, for campaigns with
  thousands of recipients), expandable per-row timeline.

### Media Campaigns

- Campaign model extended with `mediaType` (Text/Image/Video/PDF/Mixed) —
  a field distinct from the channel `campaignType`, to avoid overloading
  an existing field's meaning.
- Media upload with type/size validation matching Meta's own Cloud API
  limits (5MB image / 16MB video / 100MB document), previewed before
  saving via a reusable `MediaPreviewComponent` (image/video/PDF).
- Campaign List media-type badges; Analytics campaign-by-media-type
  breakdown.

### WhatsApp Cloud API Integration

- Real Meta Graph API calls (not a mock) for text, image, video, and
  document messages, via `IWhatsAppProvider`/`MetaWhatsAppProvider`.
- Webhook subscription verification handshake implemented; incoming
  delivery/read events are logged only (processing them is a documented
  future step, deliberately out of scope so far).
- Validation, structured logging (request id, phone number, duration,
  Meta's response — never the access token), and clean error responses
  distinguishing validation errors / Meta rejections / unexpected
  failures.

### Background Campaign Delivery Engine

- `CampaignDeliveryWorker` — a .NET `BackgroundService` that polls
  Firestore every 5 seconds (configurable), claims queued executions,
  and drives recipients through the correct Meta message type based on
  the campaign's `mediaType` — with cancellation support (checked before
  every batch and every individual recipient) and atomic stat updates.
- `FirebaseService` — the first real Firestore connection from `api/`,
  built from service-account credentials.

### .NET API

- ASP.NET Core 9, folder-per-layer architecture, Options pattern
  configuration, Serilog structured logging, global exception
  middleware, API versioning, Swagger (Development only), CORS locked to
  two named origins, two health check endpoints at different stability
  tiers.
- Most feature controllers (`Product`, `Marketing`, `Campaign`,
  `Analytics`, `Orders`, `Auth`) remain deliberately unimplemented
  scaffolding, reserved for future phases.

### Production Readiness (this release)

- **Security**: `api/appsettings.Development.json` (contains local Meta
  test credentials) added to `.gitignore` — it was previously untracked
  but not excluded, meaning a routine `git add -A` before this release
  would have committed a real access token into git history.
- **Cleanup**: removed 8 orphaned homepage-section components
  (`why-vrindaya`, `product-grid`, `hero-banner`, `vrindaya-look`,
  `new-arrivals-banner`, `trust-bar`, `brand-story`, `community-showcase`)
  and their now-unused data files, superseded by earlier redesigns and
  confirmed unreferenced by the current homepage/route table; removed
  unused barrel re-export files (`shared/shared.module.ts`,
  `core/models/index.ts`, `core/constants/index.ts`, `core/services/index.ts`)
  and their one now-dead export (`sortProducts`).
- **Deduplication**: consolidated 6 near-identical `mapFirestoreError`
  copies (one per marketing service) and 7 near-identical
  date-formatting methods into two shared utilities
  (`shared/utils/firestore-error.util.ts`, `shared/utils/date-format.util.ts`);
  consolidated a duplicated `MEDIA_TYPE_ICONS` constant into
  `campaign.model.ts` as a single source of truth.
- **Documentation**: comprehensive README rewrite (the previous version
  still described the API as having "no business logic implemented" and
  listed stale WhatsApp config field names); fixed a stale
  `completed-features.md` claim describing two now-removed components as
  live.
