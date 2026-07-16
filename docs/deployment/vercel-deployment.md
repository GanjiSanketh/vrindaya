# Deploying `web/` to Vercel

## Project settings (one-time, in the Vercel dashboard)

Since the monorepo split, `web/` is no longer the repo root, so Vercel's
project settings must point *into* the subdirectory:

| Setting | Value |
| --- | --- |
| **Root Directory** | `web` |
| **Framework Preset** | Angular |
| **Build Command** | `npm run build` (Angular's own build, SSR + prerender) |
| **Output Directory** | left as Angular's default (`dist/vrindaya/browser`) — do not override unless `angular.json`'s `outputPath` changes |
| **Install Command** | default (`npm install`) |

If the Vercel project was created *before* the monorepo split (pointed at
the repo root), it must have its Root Directory updated to `web` once —
otherwise it will try to build a repo root that no longer contains
`angular.json`.

## Where the actual deploy comes from

Production deploys are **not** triggered by Vercel's own Git integration —
they run from `.github/workflows/ci.yml`'s `deploy` job:

1. `quality` job runs first (lint, tests, SonarCloud) — `deploy` only runs
   if `quality` passes and the push was to `main`.
2. `npm run build` runs in CI (not on Vercel's infrastructure).
3. `vercel deploy --prebuilt --prod` uploads the already-built `dist/`
   output — Vercel doesn't rebuild it.

This means: if Vercel's dashboard shows a project connected to this GitHub
repo with automatic deploys still *enabled*, that's redundant with CI and
should be disabled to avoid double-deploys — CI is the source of truth for
when and how production deploys happen.

**Required GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
| --- | --- |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `web/.vercel/project.json` after running `vercel link` locally once |
| `VERCEL_PROJECT_ID` | same file |
| `SONAR_TOKEN` | SonarCloud → My Account → Security → Generate Token (required by the `quality` job, which gates `deploy`) |

## Security headers (`web/vercel.json`)

Lives at `web/vercel.json` (not repo root — it travels with the app whose
Root Directory it configures). Applies to every route (`/(.*)`):

- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera/microphone/geolocation/payment
- A `Content-Security-Policy` scoped to exactly what the app needs:
  Google Sign-In (`apis.google.com`, `accounts.google.com`), Firebase
  (`*.firebaseio.com`, `*.googleapis.com`, `identitytoolkit.googleapis.com`,
  `securetoken.googleapis.com`), Google Fonts, Cloudinary-hosted images
  (`res.cloudinary.com`), and `frame-src` for the Firebase Auth popup
  (`vrindaya-ad7b0.firebaseapp.com`)
- `/assets/(.*)` gets `Cache-Control: public, max-age=31536000, immutable`
  — safe because Angular fingerprints asset filenames on every build

**The same CSP string exists in THREE places, not one** — `web/vercel.json`
(the real HTTP header, enforced on every deployed request), and two
`<meta http-equiv="Content-Security-Policy">` tags: `web/src/index.html`
(dev — used by `ng serve` and the `development` build config, where
`vercel.json` never applies) and `web/src/index.prod.html` (prod — swapped
in as the build's `index.html` by `angular.json`'s `production`
configuration; still present in the deployed HTML alongside the
`vercel.json` header as defense-in-depth for non-Vercel hosting). Browsers
enforce **all** active CSPs simultaneously (the effective policy is the
intersection, not "the header wins") — so missing even one of the three
still blocks the resource in whichever context that file governs.

**If you add a new external service** (an analytics script, a new font
host, a payment widget, a new image CDN), the CSP will silently block it
while working fine wherever a different one of the three files happens to
already allow it. Add the new origin to the relevant `-src` directive in
**all three files** (`web/vercel.json`, `web/src/index.html`,
`web/src/index.prod.html`) in the same PR — don't discover this only after
a production report of "X doesn't work," or a browser DevTools
`(blocked:csp)` network status.

Also note: `rewrites` sends every path to `/index.html` — this is what
lets Angular's client-side router handle deep links like `/admin/campaigns`
on a hard refresh. If Vercel-level SSR/prerendering output changes (i.e.
Angular starts serving each route as its own prerendered HTML file),
revisit whether this catch-all rewrite is still correct.

## Environment values baked in at build time

Angular doesn't read `process.env` at runtime — `environment.prod.ts` is
compiled into the bundle. There's no Vercel "environment variable" to set
for `apiBaseUrl`, `firebase.*`, or `adminEmail`; changing any of them means
editing `web/src/environments/environment.prod.ts` and redeploying. See
[Environment Variables](../setup/environment-variables.md) for the full
list and why `apiBaseUrl` currently points at a `YOUR_RENDER_URL`
placeholder (the API isn't called from `web/` yet).

## Verifying a deploy

1. Check the `deploy` job's logs in the Actions tab for the printed
   deployment URL.
2. Open the URL, confirm the homepage renders and `/admin` redirects to
   `/admin/login` when signed out.
3. Check response headers (e.g. via browser DevTools → Network → the
   document request) for the CSP header — if it's missing, `vercel.json`
   didn't get picked up (usually a Root Directory misconfiguration).
