# Testing Checklist

There is exactly one test file in the repository (the default Angular
CLI boilerplate spec) and zero backend tests — see
[TECHNICAL_DEBT.md](TECHNICAL_DEBT.md). Until real automated coverage
exists, this is the manual QA checklist to run through before a release,
organized so it can double as the starting spec for actual automated
tests later. Check off what you verified; note what broke.

## Storefront

- [ ] **Browse** — homepage loads (hero, categories, new arrivals,
      trending, promotional banners, footer banner, Instagram section,
      customer love); category page (`/category/:id`) lists only Active
      products in that category; a Collection landing page
      (`/collection/:slug`) shows only its curated, ordered, Active
      products.
- [ ] **Archived products** are excluded from Featured/Trending/
      Collections/New-Arrivals homepage sections, but still reachable via
      direct category browse/search (this is intentional — see
      [phase-7-9-additions.md](architecture/phase-7-9-additions.md)).
- [ ] **Search** returns relevant results and respects pagination
      (`nextCursor`).
- [ ] **Product detail page** shows full gallery, sizes, description,
      related products (same category, excludes itself); out-of-stock/
      low-stock badges match the product's actual `Stock`/
      `LowStockThreshold`.
- [ ] **Wishlist** add/remove persists across a reload (`localStorage`).
- [ ] **Quick View** modal opens from a product card and matches the full
      detail page's data.
- [ ] **Flipkart handoff** — a product with `FlipkartProductUrl` set
      shows a working "Buy on Flipkart" link that opens the correct URL.
- [ ] **Brand pages** — About Us, Contact, Store Information, Social
      Links, FAQs, and each Policy page render the current
      `brandConfig/singleton` content; footer social/policy links respect
      the `showSocialLinks`/`showPolicyLinks` toggles.
- [ ] **VIP Club / Marketing subscribe** — invalid mobile number shows a
      validation error and keeps the submit button disabled; a valid
      submission shows the success state or a duplicate/error toast, with
      no uncaught console errors.
- [ ] **SEO** — `robots.txt` and `sitemap.xml` are reachable; a few
      representative pages (home, a category, a product, a Brand page)
      have the expected `<title>`/meta description/canonical tag via
      view-source.
- [ ] **PWA** — service worker installs, install prompt appears where
      expected, an update notification appears after a new deploy.

## Admin — Product Management

- [ ] Create/edit/delete a product; slug auto-generates from name unless
      manually edited; image gallery upload/reorder/remove works.
- [ ] Bulk actions (archive/restore) apply to the selected rows only.
- [ ] **Inventory**: editing stock/low-stock threshold/auto-hide via both
      the main product form and the dedicated inventory patch endpoint
      update the same underlying fields with no conflict.
- [ ] **Lifecycle**: every `LifecycleStage` transition (Draft through
      Archived) is selectable and persists; setting a product to Archived
      removes it from homepage-curated sections (see Storefront above)
      without deleting it.
- [ ] **Flipkart Ops**: single-product edit modal and the bulk
      URL-assignment tool both write to the same `FlipkartProductUrl`/
      `FlipkartProductId` fields correctly.

## Admin — Category & Collection

- [ ] Create/edit/delete/reorder a Category; toggling Active hides it
      from the public nav/browse immediately (cache invalidation).
- [ ] Same for Collections, plus: assigning products to a Collection and
      confirming the public landing page reflects the exact order.
- [ ] Confirm a change is visible on the next public GET within a few
      seconds — this exercises the new `IMemoryCache` layer added in the
      production-hardening pass; a stale response past ~60s with no admin
      edit since would indicate the invalidation call was missed.

## Admin — Homepage & Brand CMS

- [ ] Homepage Settings: Featured/Trending collection-slug override,
      New Arrivals ordering, Announcement, Instagram images (add/remove),
      Footer Banner, and SEO fields all save together in one submit.
- [ ] Brand Settings: every tab (About Us, Contact, Store Information,
      Social Links, FAQs, Policies, Footer) saves correctly; a new FAQ/
      Policy draft row (blank `id`) doesn't collide with another blank
      draft row when both are edited before saving.
- [ ] Validation: an invalid email/phone/URL in Brand Settings is
      rejected with a clear error instead of silently saving (new in this
      hardening pass — see [CHANGELOG.md](../CHANGELOG.md)).

## Admin — Marketing & Campaigns

- [ ] Marketing Dashboard shows live subscriber stats and CSV export
      works.
- [ ] Marketing Contacts CSV/XLSX bulk import rejects duplicates
      correctly.
- [ ] Campaign create/edit/schedule/cancel; template CRUD; a campaign
      send fans out into recipients and an Execution Progress page shows
      live status.

## Cross-cutting

- [ ] `POST /api/v1/whatsapp/test` returns `401` unauthenticated and
      `429` after exceeding its rate limit when authenticated (5 req/min).
- [ ] Exceeding the global rate limit (100 req/10s per IP) on any
      endpoint returns `429`, not a 500 or hang.
- [ ] No `console.*` output appears in a production browser build for
      the flows converted to `LoggerService` in this pass (admin auth,
      route guards, Marketing/Campaign services).
- [ ] Keyboard/screen-reader pass over the Category/Collection admin list
      pages and Homepage Settings — icon-only buttons should announce a
      label (added in this pass), not just an icon.
