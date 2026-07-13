# Marketing Module

Everything in `web/src/app/features/marketing/` — subscriber capture,
bulk import, the admin dashboard, and the "Vrindaya Insider" storefront
experience. Campaigns and WhatsApp settings live in the same feature
folder but are documented separately: [Campaign Module](campaign-module.md),
[WhatsApp Integration Plan](whatsapp-integration-plan.md).

## Subscriber capture: the "Vrindaya Insider" experience

There is no static "VIP Club" homepage section — subscriber capture is two
dismissible, session-aware surfaces layered over the whole storefront by
`LayoutComponent`, driven by `InsiderExperienceService`:

- **Sticky ribbon** (`insider-ribbon.component.ts`) — appears once per
  session after the visitor scrolls past 45% of a page's height
  (`RIBBON_SCROLL_THRESHOLD`). Lazy-loaded via `@defer (on idle)` so it
  never delays first paint.
- **Exit-intent modal** (`insider-modal.component.ts`) — desktop: fires
  when the cursor leaves toward the top of the viewport
  (`clientY <= 10px`). Mobile (no `mouseleave` equivalent): fires at 70%
  scroll depth *or* 45 seconds on page, whichever comes first. Lazy-loaded
  via `@defer (when insider.modalOpen())`.

**Suppression rules** (all enforced by `InsiderExperienceService`, not by
each component):

| Signal | Storage | Scope |
| --- | --- | --- |
| Ribbon dismissed | `sessionStorage: vrindaya_insider_ribbon_closed` | This tab session only — reappears next visit |
| Exit modal already shown | `sessionStorage: vrindaya_exit_popup_shown` | This tab session only |
| Already joined | `localStorage: vrindaya_exit_popup_joined` | Permanent on this browser — both surfaces stop appearing forever once someone subscribes, across all future sessions |

Both surfaces submit through the same `MarketingService.subscribe()` —
there's one subscription code path regardless of which UI triggered it.

## Duplicate detection <a name="duplicate-detection"></a>

This is the one piece of `MarketingService` worth understanding in detail,
because it looks unusual until you see why:

```ts
const ref = doc(db, 'marketingSubscribers', mobileNumber);   // mobile number IS the doc ID
const snapshot = await getDoc(ref);
if (snapshot.exists()) return 'duplicate';                    // no write attempted
await setDoc(ref, payload);                                    // create only, never update
```

No `query()`/`where()`/`getDocs()` is ever used for duplicate detection —
it's a direct `getDoc()` on a document ID equal to the mobile number.
This is only possible because `marketingSubscribers` documents are keyed
by mobile number rather than an auto-generated ID (see
[Firestore Schema](../database/firestore-schema.md#collection-marketingsubscribers)).

The Firestore rules reinforce this by design: there is **no public
`update` rule** on this collection. If `getDoc()` ever returned a false
negative (e.g. a race condition) and the code proceeded to `setDoc()` an
existing document, Firestore classifies that write as an `update`, not a
`create` — and the rules deny it for non-admin callers. The permission
error becomes a second line of defense against duplicate writes, not just
an access-control mechanism. **Do not add a public `update` rule to this
collection** without re-deriving this guarantee from scratch.

## Error handling

`MarketingService.mapFirestoreError()` translates raw Firestore error
codes into user-facing copy — `permission-denied` → "You do not have
permission...", `unavailable` → "Firestore is currently unavailable...",
offline detection via `navigator.onLine`, etc. Any new Firestore call
added to this service should route its catch block through this same
mapper rather than surfacing a raw Firestore error message to a user.

## Admin: Marketing Dashboard

`marketing-dashboard.component.ts`, route `/admin/marketing`. Subscribes
to `MarketingService.getSubscribers()`, a **live** `onSnapshot()` listener
(not a one-time fetch) — the dashboard updates in real time if a
subscriber joins while an admin has it open. Shows four computed stat
cards (`totalCount`, `todayCount`, `weekCount`, `monthCount` — all derived
signals over the same subscriber list, not separate queries) plus the
subscriber table and a client-side CSV export (builds the CSV string in
memory, no server round-trip).

## Admin: Marketing Contacts + Bulk Import

`marketing-contacts.component.ts` / `bulk-import.component.ts`, route
`/admin/marketing-contacts`. Lets an admin upload a CSV or XLSX file
(parsed client-side via the `xlsx` package) and import many subscribers at
once, tagging each with `importedBy`/`importedAt` (the admin-only fields
in the Firestore schema).

**Important asymmetry with the public flow**: `BulkImportService` cannot
reuse the "getDoc → deny on update" trick, because an authenticated admin
already holds the `update` permission — a blind `setDoc()` to an existing
subscriber would silently succeed as an overwrite instead of being
rejected. The bulk import path is responsible for explicitly checking
existence (batched `in` queries against the mobile numbers in the file)
*before* writing, and reporting per-row results (imported / skipped as
duplicate / failed) back to the admin.

> `xlsx` (SheetJS) has a known unpatched npm-registry security advisory
> (prototype pollution / ReDoS in older parsing paths). It's scoped to an
> admin-only upload feature, not public input, which limits exposure — but
> if this ever needs hardening, evaluate pinning to a patched fork or
> switching to a maintained alternative before adding any public-facing
> file upload.

## What this module deliberately does not do yet

- No subscriber segmentation (tags, tiers, opt-in categories) —
  `audience` is always `ALL_ACTIVE_SUBSCRIBERS`.
- No unsubscribe/opt-out flow — `status` is always written as `ACTIVE`.
- No email capture — mobile number is the only identity.

See [Roadmap](../roadmap/roadmap.md) for whether/when these are planned.
