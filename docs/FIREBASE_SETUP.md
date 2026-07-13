# Firebase Setup

Vrindaya uses one Firebase project as the shared data layer for both
`web/` and `api/`. This document covers setting one up from scratch and
configuring both applications to use it.

## Firebase Project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   (the live project is `vrindaya-ad7b0`; use your own project ID for a
   fresh setup).
2. Enable these products, all in the same project:
   - **Authentication** (Google Sign-In provider)
   - **Firestore Database** (Native mode)
   - **Storage**
3. Register a **Web app** in Project Settings → General → Your apps.
   This gives you the public web config (`apiKey`, `authDomain`, etc.)
   used by `web/`.
4. Generate a **service account key** (Project Settings → Service
   Accounts → Generate new private key). This gives `api/` the JSON key
   file `FirebaseService` uses to connect to Firestore server-side —
   locally as a file, in production as an environment variable (see
   [Environment Variables](#environment-variables) below).

## Authentication

- **Provider**: Google Sign-In only. No email/password, no other OAuth
  providers are configured.
- **Who is an admin**: a single hardcoded email,
  `AdminAuthService.ADMIN_EMAIL` in `web/`. This same literal is
  duplicated (by necessity — Firestore Rules can't reference application
  code) in `firestore.rules`' and `storage.rules`' `isAdminUser()`
  helper functions.
- **These three places must be kept in sync manually** whenever the
  admin account changes:
  1. `web/src/app/features/admin/services/admin-auth.service.ts` (`ADMIN_EMAIL`)
  2. `firestore.rules` (`isAdminUser()`)
  3. `storage.rules` (`isAdminUser()`)
- There is a Firestore-backed `admin-users` collection and a full admin
  management UI for a **future** multi-admin model — it is not consulted
  by the actual authorization check today. See
  [Firestore Schema](database/firestore-schema.md#admin-users).
- `api/` does not verify Firebase ID tokens yet —
  `TokenValidationMiddleware` is a reserved pass-through. See
  [SECURITY.md](SECURITY.md).

## Firestore

`web/` reads and writes Firestore directly via the Firebase JS SDK
(dynamic `import()`, no AngularFire). `api/`'s `CampaignDeliveryWorker`
connects via the official `Google.Cloud.Firestore` .NET client, using the
service-account credential described above — this is a **separate SDK
from a separate runtime**, both pointed at the same project.

### Deploying rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

This reads `firebase.json` at the repo root, which points at
`firestore.rules` and `storage.rules` (also at the repo root — shared
infrastructure, not owned by `web/` or `api/` individually).

### Rules — the pattern

Every collection except `marketingSubscribers` follows one identical
shape:

```javascript
match /campaigns/{campaignId} {
  allow read, write: if isAdminUser();
}
```

`marketingSubscribers` is the one exception, since it has a public
sign-up surface:

```javascript
match /marketingSubscribers/{mobileNumber} {
  allow create: if /* whitelisted field validation, see below */;
  allow get: if true;                          // single-doc read, public
  allow list, update, delete: if isAdminUser(); // bulk read + all writes, admin-only
}
```

The `create` rule validates the mobile number format, required fields,
`consent == true`, `status == 'ACTIVE'`, and that `createdAt`/`updatedAt`
equal `request.time` (proving they came from `serverTimestamp()`, not a
forged client value) — see the full rule in `firestore.rules` for the
exact field whitelist.

`admin-users` has **no rules defined** — it falls through to the
catch-all `match /{document=**} { allow read, write: if false; }`, so the
Admin Management UI cannot actually read/write it against these
production rules today. This is a known, pre-existing gap (see
[Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap)), not new
breakage.

### Indexes

**No `firestore.indexes.json` is committed to this repo.** Composite
indexes are created reactively: two queries in this app require one —

- `campaignExecutions` — `where('campaignId', '==', ...) orderBy('createdAt', 'desc')`
- `campaignRecipients` — `where('executionId', '==', ...) [where('status', '==', ...)] orderBy('queuedAt', 'asc')`

The first time either query runs against a fresh Firestore project
without the matching index, Firestore throws `failed-precondition` with
a direct console link to create it — click it, wait for the index to
build (a few minutes), retry. There is nothing to pre-configure; this is
expected, one-time setup friction on a new project, not an error.

## Storage

Three paths, one shape — public read (Meta must fetch the media by URL),
admin-only write, capped at exactly Meta's own Cloud API media limits:

| Path | Size cap | Content type |
| --- | --- | --- |
| `campaign-images/` | 5MB | `image/*` |
| `campaign-videos/` | 16MB | `video/*` |
| `campaign-documents/` | 100MB | `application/pdf` exactly |

Campaign thumbnails reuse `campaign-images/` — a thumbnail is still just
an image, so it doesn't get its own path/rule.

Everything else is denied by the catch-all
`match /{allPaths=**} { allow read, write: if false; }`.

## Firestore Collections

See [database/firestore-schema.md](database/firestore-schema.md) for the
complete, field-level schema of every collection. Summary:

| Collection | Purpose |
| --- | --- |
| `marketingSubscribers` | WhatsApp opt-in subscribers, keyed by mobile number |
| `campaigns` | Composed campaigns (message/media/audience/schedule) |
| `campaignTemplates` | Reusable message templates (6 self-seeding defaults + custom) |
| `whatsappSettings` | Singleton document with (informational) Meta credentials entered via the admin UI |
| `campaignQueue` | Legacy per-recipient fan-out from an earlier phase — no longer processed by anything |
| `testMessages` | "Send Test" intent records |
| `campaignExecutions` | One record per "Send Campaign" click — tracks the send as a whole |
| `campaignRecipients` | One record per subscriber per execution — tracks individual delivery |
| `admin-users` | Multi-admin directory — UI exists, not wired into the actual auth check |

## Environment Variables

### `web/` (compiled into the bundle, not read from `process.env`)

`web/src/environments/environment.ts` (dev) and `environment.prod.ts`
(prod) each define:

```ts
export const environment = {
  production: false,
  adminEmail: 'your-admin@example.com',
  apiBaseUrl: 'https://localhost:5001/api/v1',
  firebase: {
    apiKey: '...',            // public by design — safe to commit
    authDomain: '...',
    projectId: '...',
    storageBucket: '...',
    messagingSenderId: '...',
    appId: '...',
    measurementId: '...',
  },
};
```

Firebase's web `apiKey` is **not a secret** — Firebase's security model
relies on Security Rules, not key secrecy. It is safe to commit and does
appear in the repo today.

### `api/`

`FirebaseService` reads everything through the standard Options pattern —
`IOptions<FirebaseOptions>` — not `ASPNETCORE_ENVIRONMENT`, and not a
direct environment variable read. There's no `Firebase:ProjectId`/
`ClientEmail`/`PrivateKey` to set anymore:

| `FirebaseOptions` property | Source | Purpose |
| --- | --- | --- |
| `ServiceAccountJson` | `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable, merged in by `AddApplicationOptions` (see below) | Production — the service account key's full JSON contents |
| `ServiceAccountPath` | `Firebase:ServiceAccountPath` in `appsettings.json` (defaults to `Firebase/serviceAccount.json`, relative to `api/`'s content root) | Local development — a file on disk |

`ServiceAccountJson` takes priority whenever it's set; `ServiceAccountPath`
is only used as a fallback. This is why local dev works with nothing but
the file in place (no environment variable set, so it falls through to
the path), while Render works with nothing but the environment variable
set (present, so it's used directly — no file needed in the container).
Nothing about this decision checks `ASPNETCORE_ENVIRONMENT` — it's purely
"is `ServiceAccountJson` populated or not."

**Why `FIREBASE_SERVICE_ACCOUNT_JSON` needs a small merge step**: ASP.NET
Core's environment-variables configuration provider only nests a variable
under a section when it uses the `Section__Key` double-underscore
convention (e.g. `Firebase__ServiceAccountPath` → `Firebase:ServiceAccountPath`).
`FIREBASE_SERVICE_ACCOUNT_JSON` doesn't follow that shape, so it can't
bind into `FirebaseOptions.ServiceAccountJson` automatically from
`configuration.GetSection("Firebase")` alone.
`ServiceCollectionExtensions.AddApplicationOptions` handles this with the
smallest possible amount of extra code: inside the `Configure<FirebaseOptions>`
delegate, after binding the "Firebase" section normally, it reads
`configuration["FIREBASE_SERVICE_ACCOUNT_JSON"]` (the configuration
indexer — backed by the environment-variables provider ASP.NET Core
registers by default, never a direct `Environment.GetEnvironmentVariable()`
call) and assigns it onto the options object if present. `FirebaseService`
itself only ever depends on `IOptions<FirebaseOptions>`, exactly like
every other service in this app — and delegates the actual credential
resolution to `FirebaseCredentialProvider`, an internal helper that keeps
`FirebaseService` focused purely on building the `FirestoreDb` client.

Both sources build the same `ServiceAccountCredential` that
`FirebaseCredentialProvider.GetCredential()` returns; the project ID is
read directly from the credential, not from separate config.
`api/Firebase/serviceAccount.json` is **git-ignored specifically because
it holds a real credential** — never commit it.

## Local Development

```bash
cd web && npm install && npm start   # http://localhost:4200
```

`web/` talks to the **real** Firebase project in every environment,
including local dev — there is no Firestore emulator configured in this
repo. Writes made while developing locally land in the real database.

```bash
cd api && dotnet restore && dotnet run
```

Without a service account key file at `api/Firebase/serviceAccount.json`,
`CampaignDeliveryWorker` logs a retryable
`InvalidOperationException: Firebase service account file was not found.`
error every poll tick but the API still starts and serves
`/health`/`/api/v1/health` normally — see
[TROUBLESHOOTING.md](TROUBLESHOOTING.md#worker-not-running).

## Production

- Deploy rules with `firebase deploy --only firestore:rules,storage:rules`
  from the repo root whenever `firestore.rules`/`storage.rules` change.
- Set `FIREBASE_SERVICE_ACCOUNT_JSON` as a real environment variable on
  Render — the service account key file's full JSON contents, pasted in
  directly (never a file path, and never in a committed `appsettings.json`).
- Keep the admin email in sync across `web/`'s `AdminAuthService`,
  `firestore.rules`, and `storage.rules` — see
  [Authentication](#authentication) above.

Related: [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md).
