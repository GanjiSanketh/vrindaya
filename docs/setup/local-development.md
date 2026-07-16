# Local Development Guide

There is no root-level `package.json` or build tool tying `web/` and
`api/` together — they're two independent applications that happen to
share a repo and a Firebase project. Run them independently; there's no
single "start everything" command. `web/` does call `api/` today (Product/
Category/Collection/Homepage/Brand/Inventory/Flipkart Ops/WhatsApp all go
through `environment.ts`'s `apiBaseUrl`) — see
[System Architecture](../architecture/system-architecture.md) — but the
Marketing/Campaigns feature still talks to Firestore directly from the
browser, so `api/` isn't a hard dependency for every workflow.

## Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20.x | Matches `.github/workflows/ci.yml`'s `setup-node` version — use the same major version locally to avoid "works in CI, not locally" surprises |
| npm | bundled with Node 20 | `web/`'s package manager (there's a committed `package-lock.json`, so don't switch to yarn/pnpm locally) |
| .NET SDK | `9.0.314` (or any version `global.json`'s `rollForward: latestFeature` accepts within .NET 9) | Pinned in `api/global.json` |
| Firebase CLI (optional) | latest | Only needed if you're deploying `firestore.rules`/`storage.rules`, not for day-to-day app development |

## Running `web/`

```bash
cd web
npm install
npm start              # ng serve — http://localhost:4200, live reload
```

Other scripts worth knowing (`web/package.json`):

```bash
npm run build           # production build → web/dist/vrindaya
npm run watch            # dev-config build in watch mode (no dev server)
npm test                 # ng test (Karma/Jasmine unit tests, if present)
npm run test:ci          # vitest, non-watch, coverage always on (vitest.config.ts)
npm run lint             # eslint src/ --max-warnings=0 — CI fails on any warning, not just errors
```

`web/` talks directly to the `vrindaya-ad7b0` Firebase project in **every**
environment, including local dev — `environment.ts`'s `firebase` config
points at the real project, there is no local Firestore emulator wired up.
Writes you make while developing locally (a test subscriber, a test
campaign) land in the real database. If you need to experiment without
polluting real data, use the Firebase Console to delete test documents
afterward, or ask about setting up the Firebase Local Emulator Suite if
this becomes a recurring problem (not currently configured anywhere in
this repo).

## Running `api/`

```bash
cd api
dotnet restore
dotnet run               # http://localhost:5000, https://localhost:5001
```

`launchSettings.json` opens Swagger UI automatically
(`https://localhost:5001/swagger`) since `launchUrl: "swagger"` is set on
both profiles, and both profiles force
`ASPNETCORE_ENVIRONMENT=Development` — Swagger is disabled otherwise (see
[API Conventions](../api/api-conventions.md#swagger)).

Quick smoke test once it's running:

```bash
curl http://localhost:5000/health              # → Healthy
curl http://localhost:5000/api/v1/health        # → JSON health payload
```

`appsettings.Development.json` sets Serilog's minimum level to `Debug`
(vs. `Information` in production) — expect noisier console output locally
by design.

## Running both together

Run both in separate terminals for any storefront/admin work that touches
Products, Categories, Collections, Homepage config, Brand CMS, Inventory,
Flipkart Ops, or WhatsApp — `web/` calls `api/` for all of these via
`environment.ts`'s `apiBaseUrl` (`https://localhost:5001/api/v1`), which
already points at the `api/` dev HTTPS profile. You can run `web/` alone
only if you're working exclusively on the Marketing/Campaigns feature,
which still talks to Firestore directly from the browser.

**Windows-specific note**: this repo has repeatedly hit file-locking issues
from lingering `node.exe`/`dotnet.exe` processes holding watchers open
after a previous `ng serve`/`dotnet run` session (visible as "Permission
denied" on file moves or `MSB3026`/file-lock warnings on rebuild). If a
build or file operation fails this way, close/kill the offending process
(`taskkill //F //IM node.exe` or `taskkill //F //IM dotnet.exe`) before
retrying rather than assuming the code change itself is broken.

## Firebase rules (only when changing `firestore.rules`/`storage.rules`)

```bash
firebase deploy --only firestore:rules,storage:rules
```

Requires the Firebase CLI authenticated against the `vrindaya-ad7b0`
project (`firebase use vrindaya-ad7b0` if you have access to multiple
projects). `firebase.json` at the repo root already points at both rules
files — no per-deploy path arguments needed.

## Where to look when something doesn't work

- Angular build/runtime errors → check `web/`'s browser console first;
  most Firestore-related failures surface as `console.error('[Marketing]', err)`
  or similar feature-prefixed logs (see
  [Frontend Architecture](../architecture/frontend-architecture.md)).
- A Firestore write silently fails or throws `permission-denied` → check
  the relevant rule in `firestore.rules` against
  [Firestore Schema](../database/firestore-schema.md) before assuming the
  client code is wrong.
- API build errors mentioning a NuGet package version → check whether a
  package needs pinning for `net9.0` compatibility (this has happened
  before with `Asp.Versioning.Mvc`, which defaults to a version that only
  targets `net10.0`).
