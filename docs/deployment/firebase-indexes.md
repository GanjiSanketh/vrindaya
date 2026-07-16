# Firebase Firestore Index Deployment Guide

`firestore.indexes.json` (repo root) declares every composite index the API's
Firestore queries need. It is version-controlled, reviewed like any other
code change, and deployed the same way every time — there should never be a
need to manually click a "create index" link from a Firestore error message
or the Firebase Console.

## Why this file exists

Firestore auto-indexes every field individually, but rejects any query that
combines an equality/array filter with a sort (or a second field) on a
different field **unless a matching composite index already exists** —
it fails with:

```
Grpc.Core.RpcException: Status(StatusCode="FailedPrecondition",
Detail="The query requires an index. You can create it here: ...")
```

Every composite index this API's repositories can ever need is enumerated in
`firestore.indexes.json` (see [phase-7-9-additions.md](../architecture/phase-7-9-additions.md)
and the backend architecture doc for which repository owns which query). It
is generated from a full scan of every `Query`/`WhereEqualTo`/`OrderBy`/
`WhereArrayContainsAny` call across the solution, not just the combinations
that happened to be exercised in testing — see the index table below.

## One-time setup (per environment)

```bash
npm install -g firebase-tools   # if not already installed
firebase login
firebase use vrindaya-ad7b0     # or your own project id
```

## Deploying indexes

```bash
firebase deploy --only firestore:indexes --project vrindaya-ad7b0
```

This is **idempotent** — re-running it after adding new indexes only builds
the new ones; existing indexes are left untouched (Firebase diffs against
what's already deployed). It is safe to run this on every deploy, including
CI/CD.

Index builds run asynchronously server-side and can take anywhere from a few
seconds to several minutes depending on how much existing data is in the
collection (empty/near-empty collections, as in early development, build
almost instantly). Check build status:

```bash
firebase firestore:indexes --project vrindaya-ad7b0
```

or the [Firebase Console → Firestore → Indexes tab](https://console.firebase.google.com/project/vrindaya-ad7b0/firestore/indexes)
(read-only verification — you should never need to *create* one manually
here if `firestore.indexes.json` is kept current).

## Recommended: wire into CI/CD

Add an index deploy step to whatever pipeline deploys `api/` (Render build
hook, GitHub Actions, etc.) so a new composite-index requirement introduced
by a future query change is deployed automatically alongside the code that
needs it, rather than depending on someone remembering to run the command
by hand:

```yaml
# example GitHub Actions step
- name: Deploy Firestore indexes
  run: |
    npm install -g firebase-tools
    firebase deploy --only firestore:indexes --project vrindaya-ad7b0 --token "$FIREBASE_TOKEN"
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

(`firebase login:ci` generates a long-lived CI token — store it as a
repository secret, never commit it.)

## What's covered

| Collection | Query shape | Used by |
| --- | --- | --- |
| `products` | `active` (+ optional `category`/`featured`/`newArrival`/`bestSeller`) × sort on `displayOrder`/`createdAt`/`price`/`name` — every combination `ProductQuery` can express | `ProductController.GetProducts` (public listing, category browse, homepage sections), admin product list |
| `products` | `active` + `searchKeywords` array-contains-any + `displayOrder` | `ProductController.SearchProducts` |
| `categories` | `active` + `displayOrder` | `CategoryController.GetActive`, homepage nav |
| `collections` | `active` + `displayOrder` | `CollectionController.GetActive`, homepage sections |
| `heroBanners` | `active` + `displayOrder` | `HeroBannerService.GetActiveBannerAsync` |

Not in this file because they need **no composite index** (verified by
reading every repository — see the accompanying code-review notes):

- Any single-field equality, single-field range, or pure `OrderBy` with no
  other filter — covered by Firestore's automatic single-field indexes
  (e.g. `CategoryRepository.GetAllAsync`, `HeroBannerRepository.GetAllAsync`,
  `ProductRepository.CountBySlugAsync`/`CountBySkuAsync`).
- Multiple pure-equality (`==`/`WhereIn`) filters with **no** sort/range on a
  different field — Firestore serves these natively without a composite
  index (`CampaignDeliveryRepository.GetActiveExecutionsAsync`,
  `GetQueuedRecipientsAsync`).
- Direct document reads by ID (`GetByIdAsync`, `GetByIdsAsync` via
  `GetAllSnapshotsAsync`, singleton config docs) — never a `Query`, so
  indexing doesn't apply.

## When you add a new query

1. Check whether it's a pure single-field filter/sort or pure-equality
   combination — if so, no index needed (see above).
2. Otherwise, run it once against a real Firestore instance; if it's
   missing an index, Firestore's own error message names the exact
   `collectionGroup`/`fields` it needs — add that entry to
   `firestore.indexes.json` (don't just click the console link and forget
   to commit the equivalent JSON).
3. Re-run `firebase deploy --only firestore:indexes` before merging.
