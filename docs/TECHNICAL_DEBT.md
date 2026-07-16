# Technical Debt Report

Captures what was found but deliberately **not** fixed during the
`v1.1.0-beta` production-hardening pass — either because fixing it live
carried real regression risk, required an action outside this
environment (rotating a credential, deploying infrastructure), or was
explicitly out of scope for a "no functionality changes" pass. Organized
by area; each item states what was found, why it wasn't touched, and what
fixing it would involve.

## Architecture

- **Three divergent Category-shaped types**: `Category` (frontend
  storefront model), `ApiCategory` (frontend API-mapping model), and
  `HomepageCategory` (a third, narrower shape used by homepage sections)
  all represent "a product category" with slightly different fields.
  Consolidating them into one shared type would touch every component
  that renders a category and carries real regression risk for a
  hardening pass explicitly scoped to "no functionality changes."
  **To fix**: pick one canonical shape, migrate consumers one at a time,
  verify each visually.
- **`CategoryService`/`CollectionService` near-identical CRUD skeleton**:
  both services now have the same shape (repository call → map to
  response → cache; mutate → invalidate cache) after Batch D added
  caching to both. A shared generic base class (`CuratedListService<TDoc,
  TResponse>`) could remove the duplication, but extracting it correctly
  — especially the per-slug landing-page caching `CollectionService` has
  that `CategoryService` doesn't — is a real refactor, not a mechanical
  one, so it was left as two concrete classes.
- **Admin identity duplicated across six places, not four**: the
  hardcoded admin email lives in `AppConstants.AdminEmail`,
  `AdminAuthService.ADMIN_EMAIL`, `firestore.rules`, `storage.rules`, and
  — newly confirmed during this pass — `web/src/environments/environment.ts`
  and `environment.prod.ts`'s `adminEmail` field. That last one is **dead
  config**: `AdminAuthService` never reads `environment.adminEmail`, it
  has its own separate hardcoded literal. Six places to keep in sync
  (two of them unused) is worse than the four originally documented in
  [SECURITY.md](SECURITY.md); resolving this means either wiring
  `AdminAuthService` to actually read from `environment.adminEmail` (and
  deleting its own literal) or deleting the dead environment field
  entirely — both are real changes to the auth-adjacent code path, out of
  scope for this pass.

## Security

- **Live credential rotation** (Meta access token, Firebase service
  account key) — requires action in the Meta Business dashboard and
  Firebase Console, not something executable from this environment. See
  [pre-deploy-checklist.md](deployment/pre-deploy-checklist.md).
- **Meta webhook signature verification** (`X-Hub-Signature-256`) is not
  implemented — currently fine since incoming webhook events are only
  logged, never acted on, but required before any real processing logic
  trusts the payload.
- **Rate limit thresholds are estimates, not measured**: the global
  (100 req/10s) and WhatsApp-specific (5 req/min) limiters added in Batch
  A were sized for expected usage, not tuned against real production
  traffic — revisit after the first deploy if legitimate traffic gets
  `429`'d.

## Caching

- **`CollectionService.GetLandingBySlugAsync`'s cache is public-path-only
  by design**: admin requests (`isAdmin: true`) always bypass the cache
  entirely, since a cached result keyed only by slug would otherwise let
  an admin's preview of an inactive/draft collection leak to the next
  public request for that slug, or let a stale public 404 mask a
  collection an admin just activated. This is a correctness-driven
  design choice, not a bug — noted here so a future contributor doesn't
  "simplify" it into a single shared cache path without re-deriving this
  reasoning.

## Logging

- **Two Marketing services still use raw `console.*`**:
  `whatsapp-settings.service.ts` and `test-message.service.ts` weren't
  converted to `LoggerService` in Batch E (which targeted the highest-
  volume/highest-risk call sites: `AdminAuthService`, both route guards,
  `MarketingService`, and all five `campaign*.service.ts` files) —
  fixing them is the same mechanical pattern already applied everywhere
  else, just not yet done.
- **`api/`'s Serilog output has no PII-scrubbing layer beyond the
  phone-number masking added in Batch A** — if a future log statement is
  added to a WhatsApp-adjacent code path, it needs to remember the
  `MaskPhoneNumber()` convention manually; there's no lint rule or
  analyzer enforcing it.

## Testing

- **Zero automated test coverage** beyond the default Angular CLI
  boilerplate spec (`app.spec.ts`) and zero `api/` tests. This is the
  single largest gap in the codebase. [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
  is written to double as the spec for real tests when this is
  prioritized — it was not in scope to write actual test code in this
  pass (a "no functionality changes" hardening pass, not a test-writing
  phase).
- **No CI deploy gate for `api/`**: `web/` has lint/test/SonarCloud
  gating its deploy (see [DEPLOYMENT.md](DEPLOYMENT.md)); `api/` has no
  equivalent — a `dotnet build` failure wouldn't block a deploy today.

## Data model

- **`whatsappSettings` Firestore document stores a plaintext Meta access
  token** entered via the admin UI. It's informational only — the real
  send path reads credentials from `api/`'s environment configuration,
  not this document — but the plaintext value still sits in Firestore,
  admin-gated but not field-level encrypted. Low risk today since it's
  unused by the actual send path, but worth resolving (remove the field
  entirely, or clearly mark it as non-functional in the UI) so it stops
  looking like a live credential.
- **`admin-users` collection + admin-management UI exist for a future
  multi-admin/role model** (`super_admin`/`admin`/`editor`) but the
  collection has no Firestore rules (falls through to deny-by-default)
  and isn't consulted by the actual authorization decision
  (`AdminOnlyPolicy` checks a single hardcoded email). The UI implies a
  capability that doesn't exist yet.

## Performance / scale

- **`ProductApiService`'s admin full-catalog client load**: the admin
  product list loads the entire catalog client-side rather than
  paginating server-side. Explicitly fine at today's catalog size; noted
  here as a ceiling, not a current problem — revisit if the catalog
  grows into the thousands.

## Infrastructure

- **Angular SSR Host-header rejection**: running the built SSR server
  locally on a non-default port causes Angular to reject every route
  ("Header 'host' with value '...' is not allowed") and fall back to
  client-side rendering. Confirmed to affect all routes uniformly (not a
  regression from any recent phase) but never verified against the
  actual Render-hosted configuration, where the port/host setup differs
  from local dev — see
  [pre-deploy-checklist.md](deployment/pre-deploy-checklist.md).
- **Firestore composite indexes are not deployed automatically** —
  `firebase deploy --only firestore:indexes` is a manual step, easy to
  forget after adding a new query shape (this is what caused
  `GET /categories`/`GET /collections` to 500 during Phase 9's manual
  smoke test).

## Explicitly out of scope for this pass (by design, not oversight)

Consolidating the 3 Category-shaped types; refactoring
`CategoryService`/`CollectionService` into a shared generic base;
touching `firestore.rules`/`storage.rules`'s hardcoded admin email or
`environment.ts`'s dead `adminEmail` field; rotating live credentials;
writing actual automated tests; fixing the SSR host-header behavior
without first confirming it's real in the deployed environment. Each of
these is either a genuine functionality-risk refactor (against this
pass's "no functionality changes" constraint) or requires an action this
environment can't perform (console access, real deploy verification).
