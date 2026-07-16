# Pre-Deploy Checklist

A short, easy-to-forget checklist to run through before the **first**
production deploy of `v1.1.0-beta` (Collections, Flipkart Operations,
Inventory & Lifecycle, Brand CMS/SEO, and the production-hardening pass).
See [DEPLOYMENT.md](../DEPLOYMENT.md) and
[deployment/render-deployment.md](render-deployment.md)/
[deployment/vercel-deployment.md](vercel-deployment.md) for the full
per-platform setup — this is only the items that are easy to miss.

- [ ] **Deploy Firestore composite indexes.** `firestore.indexes.json` now
      exhaustively covers every query shape `products`/`categories`/
      `collections`/`heroBanners` repositories can produce — without
      deploying it, any of those endpoints can 500 with `failed-precondition`.
      Run:
      ```bash
      firebase deploy --only firestore:indexes --project vrindaya-ad7b0
      ```
      See [firebase-indexes.md](firebase-indexes.md) for the full guide,
      what's covered, and how to keep it current as new queries are added.
- [ ] **Rotate the Meta WhatsApp access token.** Whatever value is in
      local `appsettings.Development.json`/the Render env var today has
      been handled during development — issue a fresh long-lived token
      from the Meta Business dashboard before go-live, and set it via
      Render's environment variables (`WhatsApp__AccessToken`), never
      `appsettings.json`.
- [ ] **Rotate the Firebase service account key.** Same reasoning as the
      Meta token — generate a new key from the Firebase Console
      (Project Settings → Service Accounts) and set it as
      `FIREBASE_SERVICE_ACCOUNT_JSON` in Render, rather than reusing the
      key that's been on a developer's machine.
- [ ] **Verify `Cors:AllowedOrigins` matches the real prod domain.**
      Currently `http://localhost:4200` and `https://vrindaya.vercel.app`
      — update if the production domain differs or a new Vercel preview
      URL needs access.
- [ ] **Confirm rate-limit thresholds fit real traffic.** The global
      limiter (100 req/10s per IP) and the WhatsApp-specific policy
      (5 req/min per IP) were sized for expected admin/storefront usage,
      not measured against production traffic — revisit
      `AddRateLimitingSupport()` in
      `api/Extensions/ServiceCollectionExtensions.cs` if legitimate usage
      starts hitting `429`s.
- [ ] **Confirm the WhatsApp test endpoint requires auth.** `POST
      /api/v1/whatsapp/test` should return `401` unauthenticated — this
      was the Batch A security fix; a regression here means the
      `[Authorize]` attribute was somehow removed.
- [ ] **Verify `robots.txt`/`sitemap.xml` are still reachable** after
      deploy — unaffected by this release's changes, included here only
      as a basic regression check since SEO infrastructure is new enough
      to be worth double-checking.
- [ ] **Sanity-check the Angular SSR Host-header behavior** against the
      actual Render-hosted config (see
      [TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md)) — it was only observed
      running the built server locally on a non-default port, and hasn't
      been confirmed as an issue (or non-issue) in the real hosted
      environment.
