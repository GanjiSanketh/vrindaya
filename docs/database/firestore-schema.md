# Firestore Schema

Project: `vrindaya-ad7b0`. Rules live at the repo root
(`firestore.rules`, `storage.rules`) — not inside `web/` — because they're
shared infrastructure, not Angular-specific config.

## What's *not* in Firestore

Product catalog and wishlist data are **not** in Firestore — they live in
`localStorage`, seeded from `web/src/app/data/products.json`
(`ProductStoreService`). This is a deliberate simplicity choice for a
catalog that doesn't need multi-device sync yet. If products move to
Firestore later, this document needs a new section and `firestore.rules`
needs rules for a `products` collection that doesn't exist today.

## Collection: `marketingSubscribers`

**Document ID: the subscriber's 10-digit mobile number** (not an
auto-generated ID) — chosen specifically so duplicate detection is a direct
`getDoc()`/write-classification check, never a query. See
[Marketing Module](../marketing/marketing-module.md#duplicate-detection)
for why this matters.

| Field | Type | Notes |
| --- | --- | --- |
| `mobileNumber` | string | Same value as the document ID, duplicated as a field so it's queryable/exportable. |
| `firstName` | string (optional) | Omitted entirely if not provided — never stored as an empty string. |
| `source` | string | Free-form: `"Homepage VIP Club"`, `"Sticky Ribbon"`, `"Exit Intent Modal"`, `"Offline Store"`, `"Flipkart"`, `"Instagram"`, `"WhatsApp"`, `"Manual Import"`, etc. |
| `status` | `"ACTIVE"` | Only value currently written — no deactivation flow exists yet. |
| `consent` | boolean | Always `true` on write (Firestore rules reject anything else). |
| `createdAt` | Timestamp | `serverTimestamp()`. |
| `updatedAt` | Timestamp | `serverTimestamp()`. |
| `importedBy` | string (admin only) | Present only on bulk-imported records — the importing admin's email. |
| `importedAt` | Timestamp (admin only) | Present only on bulk-imported records. |

**Security rules** (the most nuanced ruleset in the project — read this
before touching it):

- `allow create` — public, but only with a **whitelisted, validated
  shape**: mobile number must match `^[6-9][0-9]{9}$`, `consent == true`,
  `status == 'ACTIVE'`, timestamps must equal `request.time` (proving they
  came from `serverTimestamp()`, not a forged client date), and the
  document's keys must exactly match one of two whitelists — the public
  shape, or (if `isAdminUser()`) the wider bulk-import shape with
  `importedBy`/`importedAt` added.
- `allow get: if true` — **public**, single-document only. This exists
  because the sign-up flow needs to detect "this number already joined"
  without a Firestore query (queries require `list`, which is admin-only).
  The trade-off: anyone who already knows or guesses a specific mobile
  number can read that one subscriber's full record. Bulk `list` — browsing
  the whole customer database — stays admin-only, so the trade-off doesn't
  expose the customer list as a whole.
- `allow list, update, delete: if isAdminUser()` — the admin dashboard's
  table, and all mutations beyond the public `create`.
- **There is no public `update` rule.** This is deliberate: it's what makes
  duplicate detection work for the public sign-up flow at all. See
  [Marketing Module](../marketing/marketing-module.md#duplicate-detection)
  — writing to an existing document gets reclassified by Firestore as an
  `update` (regardless of the client calling `setDoc`), which the rules
  deny for non-admins, and that denial *is* the duplicate signal. Adding a
  public `update` rule later would silently break this.
- **Bulk import cannot rely on the same trick.** Admins already hold
  `update`, so a blind write to an existing subscriber would succeed as an
  overwrite instead of being rejected. `BulkImportService` is responsible
  for explicitly checking existence (via a batched `in` query) before
  writing — the rules do not protect against this for admin callers.

## Collection: `campaigns`

**Document ID: auto-generated** (unlike subscribers — campaigns have no
natural business key). Fully admin-gated; no public surface at all.

| Field | Type | Notes |
| --- | --- | --- |
| `campaignName` | string | |
| `campaignType` | `"WhatsApp"` \| `"SMS"` \| `"Email"` | The **channel**. Only `"WhatsApp"` is actually sendable today — the others are schema/UI-ready, disabled in the picker (`ACTIVE_CAMPAIGN_TYPES`). Not to be confused with `mediaType` below — two separate concepts that happen to sit next to each other in the form. |
| `mediaType` | `"Text"` \| `"Image"` \| `"Video"` \| `"PDF"` \| `"Mixed"` | The **media kind** (see [Campaign Module](../marketing/campaign-module.md#media-campaigns)) — controls which upload field(s) the form shows and which Meta message type `CampaignDeliveryWorker` sends. Campaigns created before this field existed have no value stored; the app infers `"Image"` if `imageUrl` is already set, else `"Text"`. |
| `status` | `"DRAFT"` \| `"SCHEDULED"` \| `"READY_TO_SEND"` \| `"SENT"` \| `"CANCELLED"` | See [Campaign Module](../marketing/campaign-module.md#status-lifecycle) for the full state machine — `SENT` is not reachable by anything in the app yet. |
| `message` | string | The text body for `"Text"` campaigns. May contain `{{name}}`, `{{mobile}}`, `{{product}}`, `{{link}}`, `{{date}}` placeholders — substitution is not implemented yet (see [WhatsApp Integration Plan](../marketing/whatsapp-integration-plan.md)). |
| `imageUrl` | string (optional) | Firebase Storage download URL, `campaign-images/` path. Sent as the WhatsApp image message when `mediaType` is `"Image"` (or `"Mixed"` with no video/document). |
| `videoUrl` | string (optional) | Firebase Storage download URL, `campaign-videos/` path (5MB→16MB limit tier — matches Meta's own video cap). |
| `documentUrl` | string (optional) | Firebase Storage download URL, `campaign-documents/` path. PDF only, up to 100MB (Meta's document cap). |
| `thumbnailUrl` | string (optional) | Display-only poster image (e.g. for a video) — stored in `campaign-images/` too, since it's still just an image. **Never sent to Meta** by `CampaignDeliveryWorker`. |
| `caption` | string (optional) | Accompanies image/video/document messages (Meta's own "caption" field) — used instead of `message` when `mediaType != "Text"`. |
| `footer`, `buttonText` | string (optional) | Display-only, rendered in the Live Preview bubble and the campaign view page. Not part of any Meta message type this app currently sends — same caveat `buttonUrl` already had before this phase. |
| `buttonUrl` | string (optional) | |
| `audience` | `"ALL_ACTIVE_SUBSCRIBERS"` | Only value that exists — no segmentation yet. |
| `subscriberCount` | number | Snapshotted via `getCountFromServer()` at create/update time — not live; reflects audience size *when last saved*, not at send time. |
| `createdBy` | string | Admin email. |
| `createdAt`, `updatedAt` | Timestamp | |
| `scheduledAt` | Timestamp \| null | Set only when the "Schedule for later" toggle is used. |

**Rules**: `allow read, write: if isAdminUser()` — no public branch exists
for this collection at all.

## Collection: `campaignTemplates`

Self-seeds six defaults (**Welcome, New Collection, Festival, GOAT Sale,
Price Drop, Wishlist Reminder**) the first time the collection is queried
and found empty — see `CampaignTemplateService.getTemplates()`. There is no
separate seed script to run.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | |
| `message` | string | |
| `imageUrl` | string (optional) | |
| `buttonUrl` | string (optional) | |
| `isDefault` | boolean | `true` for the six self-seeded templates; `false` for anything an admin creates via Template Management. |
| `createdAt` | Timestamp | |

**Rules**: `allow read, write: if isAdminUser()`.

## Collection: `whatsappSettings`

**Singleton** — always exactly one document, `whatsappSettings/default`.
Holds WhatsApp Business API credentials, entered manually via the admin
Settings page. **No Meta Cloud API call is ever made with these values
yet** — see [WhatsApp Integration Plan](../marketing/whatsapp-integration-plan.md).

| Field | Type | Notes |
| --- | --- | --- |
| `businessName` | string | |
| `whatsappNumber` | string | |
| `phoneNumberId` | string | Meta Cloud API Phone Number ID. |
| `wabaId` | string | WhatsApp Business Account ID. |
| `accessToken` | string | Stored in plain text in Firestore, admin-only rules. Masked in the UI (password-style input with a reveal toggle) but **not encrypted at rest** — acceptable only because the collection is fully admin-gated; revisit if this ever needs a stricter threat model. |
| `updatedBy` | string | |
| `updatedAt` | Timestamp | |

**Rules**: `allow read, write: if isAdminUser()`.

## Collection: `campaignQueue`

**Document ID: auto-generated**, one document **per recipient per
campaign**. Created by `CampaignQueueService.enqueueForCampaign()` when an
admin clicks "Send Campaign" — this is the entire "send pipeline" that
exists today. Nothing dequeues or processes these records yet.

| Field | Type | Notes |
| --- | --- | --- |
| `campaignId` | string | |
| `campaignName` | string | Denormalized so the queue UI doesn't need a join. |
| `mobileNumber` | string | |
| `firstName` | string (optional) | |
| `status` | `"PENDING"` \| `"PROCESSING"` \| `"SENT"` \| `"DELIVERED"` \| `"READ"` \| `"FAILED"` | Deliberately mirrors WhatsApp Business API's own message-status webhook values, so a future webhook handler maps onto this field with no schema change. Only `"PENDING"` is ever written by the app today. |
| `message`, `imageUrl`, `buttonUrl` | | Copied from the campaign at enqueue time (a snapshot, not a live reference — editing the campaign afterward does not change already-queued items). |
| `failureReason` | string (optional) | Never populated yet — reserved for the future send worker. |
| `createdAt`, `updatedAt` | Timestamp | |

**Rules**: `allow read, write: if isAdminUser()`.

## Collection: `campaignExecutions`

**Document ID: auto-generated**, one document per "Send Campaign" click —
created by `CampaignExecutionService.createExecution()` right after
`CampaignQueueService.enqueueForCampaign()` fans the campaign out into
`campaignQueue`. Tracks the *execution* (the send operation as a whole),
distinct from `campaignQueue` (one document per recipient).

| Field | Type | Notes |
| --- | --- | --- |
| `campaignId` | string | |
| `campaignName` | string | Denormalized from the campaign at creation time — same pattern as `campaignQueue.campaignName`. |
| `status` | `"QUEUED"` \| `"IN_PROGRESS"` \| `"COMPLETED"` \| `"FAILED"` \| `"CANCELLED"` | Written by the Angular app (`"QUEUED"` at creation) **and** by `api/`'s `CampaignDeliveryWorker` (`"IN_PROGRESS"` when it claims a `QUEUED` execution, `"COMPLETED"`/`"FAILED"` as it finishes) — see [Campaign Module](../marketing/campaign-module.md#execution-engine). `"CANCELLED"` is honored by the worker (it stops mid-batch) but nothing currently *sets* it — no admin UI exists yet to cancel an in-flight execution; see [Roadmap](../roadmap/roadmap.md). |
| `totalRecipients`, `processedRecipients`, `successfulRecipients`, `failedRecipients` | number | Initially written by `CampaignExecutionService.updateExecutionStats()` right after recipient snapshots are created (all `0` except `totalRecipients`). From then on, `processedRecipients`/`successfulRecipients`/`failedRecipients` are incremented atomically (Firestore `FieldValue.Increment`) by `CampaignDeliveryWorker` after each batch it sends. |
| `startedAt` | Timestamp \| null | `null` at creation — set by `CampaignDeliveryWorker` the moment it claims the execution (`QUEUED` → `IN_PROGRESS`). |
| `completedAt` | Timestamp \| null | `null` at creation — set by `CampaignDeliveryWorker` once no `QUEUED` recipients remain for this execution. |
| `createdBy` | string | Admin email. |
| `createdAt`, `updatedAt` | Timestamp | |

**Rules**: `allow read, write: if isAdminUser()` — no public branch, same as
`campaigns`/`campaignQueue`.

**Lookup pattern**: the Execution Progress page is routed by `campaignId`
(`campaigns/:id/execution`), not `executionId` — it resolves the latest
execution via a `where('campaignId', '==', ...) orderBy('createdAt', 'desc') limit(1)`
query, then live-watches that one document by its resolved ID. This query
needs a composite index (`campaignId` + `createdAt`); Firestore will throw
`failed-precondition` with a direct console link to create it the first
time this runs against a fresh project.

## Collection: `campaignRecipients` <a name="collection-campaignrecipients"></a>

**Document ID: auto-generated**, one document **per subscriber per
execution** — created by `CampaignRecipientService.createRecipientsForExecution()`,
called right after `CampaignExecutionService.createExecution()`. This is
deliberately a *different* collection from `campaignQueue`, not a
replacement — `campaignQueue` is scoped to the campaign, `campaignRecipients`
is scoped to the specific *execution* (`executionId`) and carries the
richer per-recipient fields (`messageId`, `attempts`, timeline timestamps)
the Execution Details page needs. Both are created on every "Send
Campaign" click today; `api/`'s `CampaignDeliveryWorker` (a `BackgroundService`)
is the thing that actually drives `campaignRecipients` from `QUEUED` through
`SENDING` to `SENT`/`FAILED` — it never touches `campaignQueue`, which
remains exactly as unprocessed as before (see
[Campaign Module](../marketing/campaign-module.md#background-delivery-worker)).

| Field | Type | Notes |
| --- | --- | --- |
| `executionId` | string | |
| `campaignId` | string | |
| `subscriberId` | string | The `marketingSubscribers` document ID (the mobile number) this recipient was snapshotted from. |
| `name` | string (optional) | Snapshotted from the subscriber's `firstName` at creation time — omitted if the subscriber has none, same convention as `marketingSubscribers.firstName`. |
| `phoneNumber` | string | Snapshotted from `marketingSubscribers.mobileNumber`. |
| `status` | `"QUEUED"` \| `"SENDING"` \| `"SENT"` \| `"DELIVERED"` \| `"READ"` \| `"FAILED"` | `"QUEUED"` at creation (Angular). `api/`'s `CampaignDeliveryWorker` sets `"SENDING"` right before calling Meta, then `"SENT"`/`"FAILED"` based on the result. `"DELIVERED"`/`"READ"` are **not yet reachable** — those are the WhatsApp webhook's job once webhook processing is implemented (see [WhatsApp Integration Plan](../marketing/whatsapp-integration-plan.md)); `CampaignDeliveryWorker` deliberately never sets them. |
| `messageId` | string (optional) | Meta's WhatsApp message ID — set by `CampaignDeliveryWorker` on a successful send. |
| `errorMessage` | string (optional) | Set by `CampaignDeliveryWorker` on failure — either Meta's own rejection reason or an exception message. |
| `attempts` | number | `0` at creation — incremented by `CampaignDeliveryWorker` by 1 on every send attempt (success or failure). There's currently no retry loop — a `"FAILED"` recipient stays `"FAILED"`; `attempts` will only exceed `1` once a future retry mechanism exists. |
| `queuedAt` | Timestamp | `serverTimestamp()` at creation. |
| `sentAt`, `failedAt` | Timestamp \| null | `null` at creation — set by `CampaignDeliveryWorker` when it sends/fails this recipient. |
| `deliveredAt`, `readAt` | Timestamp \| null | `null` at creation. Not yet reachable by anything — reserved for the WhatsApp webhook. |
| `updatedAt` | Timestamp | |

**Why a snapshot, not a live reference**: `name`/`phoneNumber` are copied
from the subscriber at creation time, exactly like `campaignQueue` already
does — if the subscriber later changes their name or is deleted, this
campaign's historical recipient record is unaffected. This matters more
here than in `campaignQueue`, since the Execution Details page is meant to
be an accurate historical record of what a specific send actually did.

**Rules**: `allow read, write: if isAdminUser()` — no public branch, same
as every other campaign-engine collection.

**Aggregate stats query**: `CampaignRecipientService.getStatusCounts()`
runs one `getCountFromServer()` per status value (`where('executionId', '==', ...) where('status', '==', ...)`)
rather than downloading every recipient — necessary once a campaign has
thousands of recipients. This is a compound equality query; if your
Firestore project rejects it with `failed-precondition`, follow the
console link in the error to create the composite index.

**Paginated list query**: the Execution Details page fetches recipients
via `where('executionId', '==', ...) [where('status', '==', ...)] orderBy('queuedAt', 'asc') limit(25)`,
paging forward with `startAfter()` — a one-time `getDocs()` per page, not a
live `onSnapshot()` listener, since a live listener over an unbounded,
potentially-thousands-of-documents collection would download and re-render
the entire result set on every write. This also needs a composite index
per status filter used; Firestore will prompt for it the first time each
filter combination runs.

## Collection: `testMessages`

One document per "Send Test" click on the campaign form. Records intent
only — **`status` is always `"QUEUED"`**; nothing is ever actually sent.

| Field | Type | Notes |
| --- | --- | --- |
| `campaignId` | string (optional) | Present if sent from an existing campaign's edit page. |
| `mobileNumber` | string | |
| `message`, `imageUrl`, `buttonUrl` | | |
| `status` | `"QUEUED"` \| `"SENT"` \| `"FAILED"` | Only `"QUEUED"` is reachable currently. |
| `createdBy` | string | |
| `createdAt` | Timestamp | |

**Rules**: `allow read, write: if isAdminUser()`.

## Collection: `admin-users` <a name="admin-users"></a>

**Exists, but is not the current authorization mechanism** — read this
carefully before assuming otherwise. `AdminUsersService`/
`AdminManagementComponent` provide full CRUD for a multi-admin role
directory (`super_admin` / `admin` / `editor`), keyed by lowercase email.
But `AdminAuthService` — the thing that actually decides who can access
`/admin/**` — checks a single **hardcoded** email constant
(`ADMIN_EMAIL = 'gsanketh7121@gmail.com'`) against the signed-in Google
account, and never queries this collection. `firestore.rules`' own
`isAdminUser()` helper does the same hardcoded check, explicitly noting it
must be kept in sync with the constant in code.

This collection's rules are **not defined in the current `firestore.rules`**
— any read/write to `admin-users` falls through to the deny-by-default
catch-all (`match /{document=**} { allow read, write: if false; }`), so the
Admin Management page is presently non-functional against production
Firestore rules. This is a known, pre-existing gap, not something
introduced by the marketing/campaign work — see
[Roadmap](../roadmap/roadmap.md) for whether/when this gets resolved.

## Firebase Storage: campaign media <a name="firebase-storage-campaign-media"></a>

Three paths, one shape: public read (Meta must be able to fetch the link
without auth once a campaign sends), admin-only write, capped at exactly
Meta's own Cloud API media limits for that type — so a file that passes
these rules is guaranteed not to be rejected by Meta on size grounds alone.

| Path | Size cap | Content type | Notes |
| --- | --- | --- | --- |
| `campaign-images/` | 5MB | `image/*` | Also used for `thumbnailUrl` — a thumbnail is still just an image, so it reuses this same path/rule rather than getting its own. |
| `campaign-videos/` | 16MB | `video/*` | Added for [Media Campaigns](../marketing/campaign-module.md#media-campaigns). |
| `campaign-documents/` | 100MB | `application/pdf` exactly (not `application/*`) | PDF only — this app's one supported document media type. |

Everything else in Storage is denied by the catch-all
`match /{allPaths=**} { allow read, write: if false; }`.

## Keeping this document accurate

If you add, rename, or change the rules for a collection, update this file
in the same change. A schema doc that's drifted from `firestore.rules` is
worse than no doc — it actively misleads the next person who reads it
instead of the rules file itself.
