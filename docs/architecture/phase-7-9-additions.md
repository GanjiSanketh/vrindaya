# Architecture Addendum: Phases 7-9

[Backend Architecture](backend-architecture.md), [Frontend Architecture](frontend-architecture.md),
and [System Architecture](system-architecture.md) already describe the
platform's overall shape. This addendum covers only what Phases 7-9
(Flipkart Operations, Inventory & Lifecycle, Brand CMS & SEO) added,
rather than re-describing the whole system.

## Flipkart Operations Module

Manual Flipkart listing management — deliberately **no Flipkart API
integration** (Flipkart has no public seller API suitable for this).
Fields (`FlipkartProductUrl`, `FlipkartProductId`, and the marketplace
side of `LifecycleStage`) live directly on `ProductDocument`/`ProductRequestBase`
rather than a separate collection, since a Flipkart listing is inherently
a property of one product, not an independent entity. `PATCH
/products/{id}/flipkart-ops` is a narrow, dedicated write endpoint for
just these fields — the same "don't clobber an unrelated field an editor
is mid-edit on" reasoning that already justified `PATCH /products/{id}/stock`.
The admin dashboard and bulk-URL-assignment modal are pure UI over this
existing product data; no new backend module was needed beyond the DTOs/
endpoint.

## Inventory & Product Lifecycle Management

- **Stock fields** (`Stock`, `LowStockThreshold`, `ReservedStock`,
  `AutoHideWhenOutOfStock`, `StockUpdatedAt`) live on `ProductDocument`,
  same reasoning as Flipkart fields above — inventory is a property of a
  product. `InventoryController`/`Services/Products/InventoryService.cs`
  compose `IProductRepository` directly rather than introducing a
  parallel repository, since both operate on the same `products`
  collection `ProductRepository` already owns.
- **`LifecycleStage`** (`Constants/LifecycleStage.cs`) is a 10-value
  closed vocabulary (Draft → Photography Pending → ... → Archived),
  stored as a plain Firestore string field (`lifecycleStage`) — consistent
  with how `Category` is already a plain string rather than a native C#
  enum, and validated server-side via .NET 8's built-in `[AllowedValues(...)]`
  rather than a custom `ValidationAttribute`. It fully **replaced**
  Phase 7's narrower 6-value `ListingStatus` (both the C# property and the
  Firestore field were renamed), a deliberate decision confirmed with the
  project owner rather than kept as a second, overlapping status field.
- **Derived, not stored**: `IsOutOfStock`/`IsLowStock` are computed in
  `ProductService.ToSummary`/`ToDetail` from `Stock`/`LowStockThreshold`
  at read time, never persisted — avoids the class of bug where a stored
  derived field drifts out of sync with the fields it's derived from.
- **Automation boundary**: `ProductService.GetSummariesByIdsAsync` is the
  single choke point for every homepage-curated product list (Featured,
  Trending, Collections, New-Arrivals-override) — Archived-lifecycle
  products are excluded exactly here, not via a broader change to
  category/search listings, so browsing a category still shows an
  Archived product (it still exists, it's just off the curated homepage
  surfaces) while the curated sections don't.

## Brand CMS Module

Follows the exact singleton-document pattern `HomepageConfigService`
established: one Firestore document (`brandConfig/singleton`) holding
every CMS section (About Us, Contact, Store Information, Social Links,
FAQs, Policies, Footer toggles), fronted by one Repository/Service/
Controller trio (`Services/Brand/BrandConfigRepository.cs`/
`BrandConfigService.cs`, `Controllers/BrandConfigController.cs`), edited
as one form rather than per-section endpoints — there's no independent
lifecycle for "just the FAQs" that would justify splitting it further.
`GetAsync` is public and `IMemoryCache`-backed (60s TTL, fixed key
`AppConstants.BrandConfigCacheKey`), invalidated on every `PUT`; this is
the cache pattern Batch D of the production-hardening pass extended to
`CategoryService`/`CollectionService`, which had the same "public,
global, mutated rarely" read profile but no caching yet.

FAQ/Policy list items are targeted by array **index**, not `id`, in the
admin form's update/remove handlers — a new draft Policy row starts with
a blank `id` (the real slug is generated server-side on save), so keying
by `id` would make multiple blank-slug draft rows collide and update
together.

## SEO & Performance Infrastructure

- `SeoService` (`web/src/app/core/services/seo.service.ts`) pre-dates
  this phase and needed no changes — every new Brand page calls its
  existing `setPage()` (title/description/canonical/OpenGraph/Twitter
  Card/JSON-LD) the same way every other route already does.
- Angular SSR (`app.routes.server.ts`): new dynamic routes
  (`collection/:slug`, `policies/:slug`) are `RenderMode.Server`, not
  `RenderMode.Prerender` — their content comes from admin-editable CMS
  data that can't be enumerated at build time, the same reasoning
  `category/:id` would need if categories ever stopped being a fixed,
  hardcoded list.
- Response compression (gzip + Brotli, `AddResponseCompressionSupport()`
  in `Extensions/ServiceCollectionExtensions.cs`) was added as a named DI
  extension method rather than inlined in `Program.cs` — the established
  pattern this phase's rate limiting (`AddRateLimitingSupport()`) and all
  future cross-cutting middleware/services should keep following.

## Known follow-up from this addendum's phases

- The Angular SSR Host-header rejection observed when running the built
  server locally on a non-default port affects all routes uniformly (not
  a regression introduced by these phases) and hasn't been verified
  against the actual Render-hosted configuration — see
  [TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md).
- Firestore composite indexes for the new Category/Collection queries
  need `firebase deploy --only firestore:indexes` before first production
  use — see [pre-deploy-checklist.md](../deployment/pre-deploy-checklist.md).
