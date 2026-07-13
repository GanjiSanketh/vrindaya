# Troubleshooting

Common failure modes encountered while developing and deploying Vrindaya,
and how to actually diagnose them — not just generic advice.

## Angular build fails

```bash
cd web
npm run build
```

- **`npm run lint` fails with a config/plugin error unrelated to your
  code** (e.g. an `@angular-eslint` rule not found) — this is a known,
  pre-existing dependency-version issue in this repo's ESLint config, not
  something your change caused. Confirm with `git diff` on
  `eslint.config.js`/`package.json` before assuming you broke it.
- **Type errors after pulling new changes** — run `npm install` first;
  a model/interface change elsewhere often requires updated
  `node_modules` types, not just source changes.
- **`ng build` succeeds locally but fails in CI** — check Node version;
  CI pins Node 20 (`.github/workflows/ci.yml`). A newer/older local Node
  version can produce different results.
- **Build hangs or is unusually slow** — check for a lingering
  `ng serve`/previous build process; on Windows this can hold file locks
  that slow or corrupt incremental builds. Kill stray `node.exe`
  processes and retry.

## Firebase permission denied

Symptom: a Firestore call throws `FirebaseError: Missing or insufficient
permissions` (surfaced in this app as `"You do not have permission to
perform this action."` via the shared `mapFirestoreError` utility).

1. **Check you're actually signed in as the admin.** Most collections
   (`campaigns`, `campaignExecutions`, `campaignRecipients`, etc.) are
   fully admin-gated — `allow read, write: if isAdminUser()`. If you're
   not signed in, or signed in with a different Google account than
   `AdminAuthService.ADMIN_EMAIL`, every admin operation will be denied.
2. **Check the email matches exactly**, including case —
   `isAdminUser()` lowercases the token's email before comparing, but the
   literal in `firestore.rules`/`storage.rules` must still be the correct
   address.
3. **Check the rules were actually deployed** —
   `firebase deploy --only firestore:rules,storage:rules`. A stale rules
   deployment is a very common cause of "it works locally in the
   emulator but not against the real project" (though this repo has no
   emulator configured, so "locally" here still means the real project).
4. **`marketingSubscribers` specifically**: the public sign-up flow only
   has `create` and single-document `get` — never `update`. If a
   duplicate-detection code path is somehow attempting an update on an
   existing subscriber as a non-admin, this is expected to fail — see
   [marketing/marketing-module.md](marketing/marketing-module.md#duplicate-detection).

## Meta Authentication Error

Symptom: `POST /api/v1/whatsapp/test` (or a real campaign send) returns
`502` with `details` containing something like `"Invalid OAuth access
token"` (Meta error code `190`).

1. Confirm `WhatsApp:AccessToken` is actually set — check
   `GET /api/v1/whatsapp/health`; if `connectionStatus` is
   `"NotConfigured"`, the token (or Phone Number ID) is empty.
2. **Temporary tokens expire in ~24 hours.** If this worked yesterday and
   fails today with no config change, regenerate the token in Meta's App
   Dashboard.
3. Confirm there's no stray whitespace/newline in the token value if it
   was pasted from a `.env`-style file into an environment variable.
4. See [META_WHATSAPP_SETUP.md](META_WHATSAPP_SETUP.md#known-meta-error-codes)
   for the full error code reference.

## Business Account Locked

Symptom: Meta error code `131031`, or a message referencing account
restriction.

This means Meta itself has restricted your WhatsApp Business Account —
usually for a policy violation (spam reports, sending outside the
24-hour window with unapproved templates, etc.). This is **not fixable
by changing configuration or code** — check Meta Business Manager for
the specific notice and follow Meta's appeal process. See
[META_WHATSAPP_SETUP.md](META_WHATSAPP_SETUP.md#known-meta-error-codes).

## Webhook Verification Failed

Symptom: Meta's dashboard shows "The callback URL or verify token
couldn't be validated" when you click "Verify and Save".

1. Confirm the Callback URL is reachable from the public internet (not
   `localhost`) — Meta must be able to reach it directly.
2. Confirm `WhatsApp:VerifyToken` in your deployed `api/` configuration
   **exactly matches** the token you typed into Meta's dashboard —
   case-sensitive, no extra whitespace.
3. Test the handshake manually:
   ```bash
   curl "https://<your-api-host>/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<your-token>&hub.challenge=12345"
   ```
   A correct setup returns `12345` (plain text). A `403` means the token
   didn't match — check for typos on both sides.
4. Confirm the endpoint is actually deployed — `GET /api/v1/whatsapp/webhook`
   must resolve to `WhatsAppController.VerifyWebhook`, not a 404 from a
   misconfigured route or a Render service that hasn't picked up the
   latest deploy.

## Campaign Not Sending

Symptom: a campaign shows `READY_TO_SEND` or its execution shows
`IN_PROGRESS`, but recipients stay `QUEUED` indefinitely.

1. **Is `CampaignDeliveryWorker` actually running?** See
   [Worker Not Running](#worker-not-running) below — if the API process
   itself isn't up, nothing processes the queue.
2. **Check the Firebase service account credential** (`api/Firebase/serviceAccount.json`
   locally, `FIREBASE_SERVICE_ACCOUNT_JSON` in production) — if the worker
   can't connect to Firestore, it logs a retryable error every poll tick
   and never claims any execution. See the API's logs for
   `CampaignDeliveryWorker poll cycle failed unexpectedly`.
3. **Check the execution's status directly in Firestore** — if it's
   still `QUEUED` (never claimed), the worker hasn't ticked yet, or isn't
   running. If it's `IN_PROGRESS` but recipients aren't moving, check for
   `CampaignDeliveryWorker` batch logs — a `Meta rejected WhatsApp
   message` warning per recipient means Meta is rejecting sends (see
   [Meta Authentication Error](#meta-authentication-error) and
   [META_WHATSAPP_SETUP.md](META_WHATSAPP_SETUP.md#known-meta-error-codes) —
   most commonly the 24-hour window restriction, error `131047`).
4. **Check the campaign actually has active subscribers** —
   `campaignRecipients` is only created for `marketingSubscribers` with
   `status: 'ACTIVE'`. Zero recipients means the execution completes
   immediately with nothing to send.

## Worker Not Running

Symptom: `CampaignDeliveryWorker started...` never appears in the API's
startup logs, or appears once and then nothing happens on subsequent
ticks.

1. Confirm it's registered: `Program.cs` should call
   `builder.Services.AddCampaignDeliveryWorker()`. If this line is
   missing (e.g. from a bad merge), the worker never starts — this
   would be a code regression, not a config issue.
2. If it starts but every tick logs
   `CampaignDeliveryWorker poll cycle failed unexpectedly` with:
   - `InvalidOperationException: Firebase credentials have not been
     configured.` — neither `Firebase:ServiceAccountPath` nor
     `FIREBASE_SERVICE_ACCOUNT_JSON` resolved to a value at all. Expected
     on a fresh local clone before setup, or if someone explicitly
     overrides `Firebase:ServiceAccountPath` to empty — see
     [Firebase Setup](FIREBASE_SETUP.md).
   - `InvalidOperationException: Firebase service account file was not
     found. Expected it at '<path>'.` — `Firebase:ServiceAccountPath` is
     set (it defaults to `api/Firebase/serviceAccount.json`), but no file
     exists there and `FIREBASE_SERVICE_ACCOUNT_JSON` isn't set either.
     Most common case for a fresh local clone.
   - `InvalidOperationException: Invalid Firebase service account JSON.`
     — a value was found (file or `FIREBASE_SERVICE_ACCOUNT_JSON`) but its
     contents aren't valid service account key JSON.

   Note none of this depends on `ASPNETCORE_ENVIRONMENT` — which message
   you get is decided purely by which of `ServiceAccountJson`/
   `ServiceAccountPath` is populated and whether the file/JSON it points
   to is actually valid, not by which environment the app thinks it's
   running in. This is expected behavior with a fresh clone before setup
   — the API still starts and serves HTTP requests normally; only the
   worker's Firestore calls fail, and it retries every
   `CampaignDelivery:PollingIntervalSeconds`.
3. If credentials are valid but nothing happens, confirm there's
   actually a `QUEUED`/`IN_PROGRESS` execution in Firestore to find —
   the worker does nothing if there's no work.

## API Not Starting

```bash
cd api
dotnet run
```

- **Build fails with a NuGet version conflict** — check `global.json`
  pins the SDK version this project expects; a mismatched local SDK can
  cause package resolution issues.
- **`MSB3026`/`MSB3027` file-lock errors on Windows** (`Could not copy
  ... Vrindaya.Api.exe ... The process cannot access the file because it
  is being used by another process`) — a previous `dotnet run` process
  is still running and holding the binary open. Find and kill it:
  ```bash
  taskkill //F //IM Vrindaya.Api.exe
  ```
  or find the specific PID named in the error and
  `taskkill //F //PID <pid>`, then rebuild.
- **Port already in use** — `Properties/launchSettings.json` defaults to
  `http://localhost:5000`/`https://localhost:5001`; another process (or
  a previous unkilled instance) may already be bound to one of these.

## Render Deployment Issues

- **Build fails on Render but works locally** — confirm Root Directory
  is set to `api` (not the repo root) in the Render service settings;
  without this, Render can't find `Vrindaya.Api.csproj`.
- **Service starts but health check fails** — confirm Render's own
  Health Check Path is set to `/health` (the plain-text endpoint), not
  `/api/v1/health` (the JSON endpoint) — see
  [DEPLOYMENT.md](DEPLOYMENT.md#health-check-urls).
- **CORS errors in the browser console pointing at the Render URL** —
  confirm `Cors__AllowedOrigins__0`/`__1` on Render includes the exact
  Vercel production domain, protocol included (`https://`).
- **First request after idle is very slow** — expected on free/starter
  tiers, which spin down when idle. Not a bug.

## Vercel Deployment Issues

- **Deploy succeeds but the site 404s on every route except `/`** —
  confirm `web/vercel.json`'s SPA rewrite rule
  (`{ "source": "/(.*)", "destination": "/index.html" }`) is present and
  that Vercel's Root Directory is `web`, so it's actually picked up.
- **CSP blocks a resource in production only** — `web/vercel.json`'s
  Content-Security-Policy is scoped to exactly the domains this app
  currently needs (Google Sign-In, Firebase, Google Fonts). Adding any
  new external script/font/image host requires adding it to the relevant
  CSP directive in the same change — see
  [deployment/vercel-deployment.md](deployment/vercel-deployment.md).
- **Both Vercel's own Git integration and the GitHub Actions workflow
  deploy** — disable Vercel's automatic Git deploys for this project;
  CI (`.github/workflows/ci.yml`) is the intended source of truth. See
  [DEPLOYMENT.md](DEPLOYMENT.md#angular-deployment-vercel).
- **Deploy succeeds but shows old content** — confirm the Quality Gate
  job actually passed (a red SonarCloud gate blocks the deploy job
  entirely, per `needs: quality` in the workflow) — check the Actions
  tab, not just the Vercel dashboard.

## Still stuck?

Cross-check against:

- [ARCHITECTURE.md](ARCHITECTURE.md) — confirm you understand which
  component is actually responsible for the behavior you're debugging
- [API_REFERENCE.md](API_REFERENCE.md) — confirm the endpoint's actual
  documented behavior, not assumed behavior
- [SECURITY.md](SECURITY.md) — confirm you're not hitting an
  authentication/CORS wall that looks like a different kind of failure
