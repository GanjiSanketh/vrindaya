# Campaign Module

The campaign system lets an admin compose a message, target the
subscriber list, and (today) push it into a send *queue* — it does not yet
dispatch anything over a real channel. See
[WhatsApp Integration Plan](whatsapp-integration-plan.md) for exactly
where that boundary sits.

## Routed pages

All under `/admin/campaigns` (see
[Frontend Architecture](../architecture/frontend-architecture.md) for the
route table):

| Route | Component | Purpose |
| --- | --- | --- |
| `campaigns` | `CampaignListComponent` | All campaigns, filterable by status |
| `campaigns/new` | `CampaignFormComponent` | Create — includes Send Test, Live WhatsApp Preview |
| `campaigns/:id/edit` | `CampaignFormComponent` (same component, edit mode) | Edit a `DRAFT`/`SCHEDULED` campaign |
| `campaigns/:id` | `CampaignViewComponent` | Read-only detail view |
| `campaigns/history` | `CampaignHistoryComponent` | Past campaigns (non-`DRAFT` statuses) |

Related, separately routed pages that campaigns depend on:
`whatsapp-settings`, `campaign-templates` (+ `new`/`:id/edit`),
`campaign-queue`, `delivery-dashboard`.

## Status lifecycle <a name="status-lifecycle"></a>

```
DRAFT ──edit──> DRAFT
  │
  ├──"Schedule for later"──> SCHEDULED
  │
  └──"Send Now"──> READY_TO_SEND ──(future: WhatsApp API confirms dispatch)──> SENT

any non-SENT status ──"Cancel"──> CANCELLED
```

`CAMPAIGN_STATUSES` (`models/campaign.model.ts`) defines all five values.
**`SENT` is unreachable by anything in the app today** — nothing calls a
real send API to justify setting it. `READY_TO_SEND` is the actual
terminal state "Send Now" produces in this phase; the name distinguishes
"an admin committed to sending this" from "this was actually delivered,"
which matters once a real integration exists and these become genuinely
different moments in time.

## Campaign types

`CAMPAIGN_TYPES = ['WhatsApp', 'SMS', 'Email']`, but
`ACTIVE_CAMPAIGN_TYPES = ['WhatsApp']` — the campaign form's type picker
disables SMS and Email. The schema and UI were built to support all three
from day one (so adding SMS/Email later is a matter of implementing a send
path, not a data-model migration), but only WhatsApp is enabled because
it's the only one with any integration plan behind it.

## Media Campaigns <a name="media-campaigns"></a>

`mediaType` (`CAMPAIGN_MEDIA_TYPES = ['Text', 'Image', 'Video', 'PDF', 'Mixed']`)
is a **separate concept from `campaignType`** above — `campaignType` is the
channel (WhatsApp/SMS/Email), `mediaType` is what the message contains.
Don't conflate them; they were named similarly by coincidence of the
ticket that introduced `mediaType`, not because they're related fields.

Selecting a media type in the Campaign Form shows the matching upload
field(s) (`Image` → image upload, `Video` → video + optional thumbnail,
`PDF` → document upload, `Mixed` → all three, each still optional) and a
`caption` field that replaces `message` as the text shown alongside the
media (Text campaigns keep using `message` as before — nothing changed
there). Uploads reuse the exact storage strategy `imageUrl` already used
(Firebase Storage, public read, admin-only write) — see
[Firestore Schema](../database/firestore-schema.md#firebase-storage-campaign-media)
for the three paths and their size caps, each matching Meta's own Cloud
API media limits (5MB image / 16MB video / 100MB document) so a file that
passes upload validation is guaranteed not to be rejected by Meta on size
grounds.

**Reusable `MediaPreviewComponent`** (`components/media-preview/`) renders
whichever of image/video/PDF is being previewed — used in the form (before
saving), the campaign view page, and anywhere else a saved campaign's
media needs showing. It's presentational only; the "remove" button and
upload trigger stay with each caller, matching the precedent
`ExecutionProgressCardComponent` set.

**What actually gets sent**: `CampaignDeliveryWorker` (see
[Background delivery worker](#background-delivery-worker)) reads the
campaign's `mediaType` and picks the matching `IWhatsAppProvider` method —
`SendImageMessageAsync`/`SendVideoMessageAsync`/`SendDocumentMessageAsync`,
falling back to `SendTextMessageAsync` for `Text` (or if a `Mixed`
campaign's declared type has no matching URL actually set). `thumbnailUrl`,
`footer`, and `buttonText` are **display-only** — no Meta message type this
app sends today has a slot for them; they exist for the Live Preview and
campaign view page, exactly as `buttonUrl` already was before this phase.

## Audience

`CAMPAIGN_AUDIENCES = ['ALL_ACTIVE_SUBSCRIBERS']` — the only value that
exists. `subscriberCount` on a campaign document is a **snapshot**, taken
via `getCountFromServer()` when the campaign is created/updated — it is
not recalculated at send time, so a campaign sitting in `DRAFT` for a week
while new subscribers join will understate its real reach until it's
saved again.

## Message placeholders

`CAMPAIGN_PLACEHOLDERS = ['{{name}}', '{{mobile}}', '{{product}}', '{{link}}', '{{date}}']`
are offered in the campaign form's message editor as insertable tokens,
but **no substitution logic exists yet** — a saved campaign's `message`
field contains the literal placeholder text. Implementing per-recipient
substitution is part of turning `campaignQueue` into a real send pipeline
(see [WhatsApp Integration Plan](whatsapp-integration-plan.md)).

## The "send" pipeline, as it exists today

Clicking "Send Now" does two things beyond setting `status: 'READY_TO_SEND'`:

1. `CampaignQueueService.enqueueForCampaign()` fans the campaign out into
   `campaignQueue` — one document per subscriber, each starting at
   `status: 'PENDING'` (see
   [Firestore Schema](../database/firestore-schema.md#collection-campaignqueue)).
2. `CampaignExecutionService.createExecution()` creates one `campaignExecutions`
   document tracking the send *as a whole* (see below).

That's the entire pipeline. Nothing reads `campaignQueue` and calls an
external API; nothing transitions a queue item out of `PENDING`. The
Delivery Dashboard and Campaign Queue admin pages exist to *view* this
queue, not to process it.

## Execution engine <a name="execution-engine"></a>

`campaignExecutions` (see
[Firestore Schema](../database/firestore-schema.md#collection-campaignexecutions))
tracks one record per "Send Campaign" click — distinct from `campaignQueue`,
which tracks one record per *recipient*. `CampaignExecutionService` (Angular)
is deliberately kept separate from `CampaignQueueService` and from any
WhatsApp-sending concern: it only ever creates a record with
`status: 'QUEUED'` and all counts at `0`, and later reads it for display.
It does not enqueue anything itself (that's `CampaignQueueService`'s job)
and does not send anything — sending is `api/`'s job, see
[Background delivery worker](#background-delivery-worker) below.

**Execution Progress page** (`/admin/campaigns/:id/execution`, linked from
Campaign List's "View Progress" action on `READY_TO_SEND`/`SENT`
campaigns) resolves the latest execution for that campaign and live-watches
it via `onSnapshot`, so as `CampaignDeliveryWorker` writes
`processedRecipients`/`successfulRecipients`/`failedRecipients`/`status`/
`startedAt`/`completedAt` to the same document, the page updates in real
time with no Angular code change needed. The reusable
`ExecutionProgressCardComponent` renders the progress bar and counts —
built as a standalone presentational component (`input.required<CampaignExecution>()`)
so it can be reused wherever an execution needs to be shown (e.g. a future
executions list or campaign detail view).

### Recipient engine

`campaignRecipients` (see
[Firestore Schema](../database/firestore-schema.md#collection-campaignrecipients))
adds per-recipient tracking scoped to a specific *execution*, not just the
campaign — `CampaignRecipientService.createRecipientsForExecution()` is
called right after `CampaignExecutionService.createExecution()` and
snapshots one `QUEUED` recipient document per active subscriber. Right
after that, `CampaignFormComponent.syncExecutionStats()` calls
`CampaignRecipientService.getStatusCounts()` and writes the result into the
execution via `CampaignExecutionService.updateExecutionStats()` — the
execution's counters are genuinely *derived* from recipient statuses, not
hardcoded, even though today every recipient is `QUEUED` so the derived
numbers are unsurprising.

**Execution Details page** (`/admin/campaigns/:id/execution/recipients`,
linked from the Execution Progress page's "View Recipient Details" button)
shows the full recipient list for the latest execution: name, phone number,
status badge, message ID, attempts, error message, and an expandable
per-row timeline (queued → sent → delivered → read, or failed). It
supports the same status vocabulary as filter pills (All/Queued/Sending/
Sent/Delivered/Read/Failed) and a name-or-phone search box.

Unlike every other list in this module, the recipient list is **not** a
live `onSnapshot()` listener — a campaign can have thousands of recipients,
and a live listener over an unbounded, unfiltered collection would
download and re-render the entire result set on every write. Instead,
`CampaignRecipientService` does cursor-paginated one-time `getDocs()`
fetches (`orderBy('queuedAt') limit(25)`, paging via `startAfter()`), with
a status filter re-running the query server-side and the search box
filtering client-side over whatever's been loaded so far — a page fetches
a new set of Firestore documents, search does not.

## Background delivery worker <a name="background-delivery-worker"></a>

`api/Services/CampaignDelivery/CampaignDeliveryWorker.cs` is a .NET
`BackgroundService` — the first piece of `api/` that does real,
independent work rather than just answering HTTP requests, and the first
thing in `api/` to actually talk to Firestore (via a new `FirestoreDb`
client built by `IFirebaseService`, using `FirebaseOptions`' service-account
fields for the first time since they were added). It's registered once in
`Program.cs` (`AddCampaignDeliveryWorker()`) and runs for the app's entire
lifetime, independent of any HTTP request.

Every `CampaignDelivery:PollingIntervalSeconds` (default 5s), it:

1. Queries `campaignExecutions` for `status in [QUEUED, IN_PROGRESS]`.
2. Claims any `QUEUED` execution (`status → IN_PROGRESS`, `startedAt` set) —
   this is what "Running" means in practice: nothing in Angular ever sets
   `IN_PROGRESS` directly, the worker does, the moment it picks up work.
3. For each active execution, re-checks its live status (cancellation
   support — if something set it to `CANCELLED`, the worker stops
   immediately, including mid-batch) then pulls up to
   `CampaignDelivery:BatchSize` (default 20) `QUEUED` `campaignRecipients`.
4. For each recipient: `status → SENDING`, calls the existing
   `IWhatsAppProvider.SendTextMessageAsync()` (the same Meta provider from
   the WhatsApp integration — nothing new added to it), then
   `status → SENT` + `messageId` + `sentAt` on success, or
   `status → FAILED` + `errorMessage` + `failedAt` on failure/exception.
   A per-recipient failure never aborts the batch.
5. After the batch, atomically increments the execution's
   `processedRecipients`/`successfulRecipients`/`failedRecipients`
   (Firestore `FieldValue.Increment`) and logs the resulting percentage.
6. Once a poll finds zero `QUEUED` recipients left for an execution, sets
   `status → COMPLETED` and `completedAt`.

**Deliberately unchanged by this worker**: `campaignQueue` (the older
Phase 2 collection — still nobody's job, unrelated to this worker),
`Campaign.message` placeholder substitution (`{{name}}` etc. are still
sent literally — see [WhatsApp Integration Plan](whatsapp-integration-plan.md)),
and the WhatsApp webhook (`DELIVERED`/`READ` on a recipient are still only
reachable once webhook processing is implemented, per constraint — the
webhook stays exactly as before, logging events only).

**Resolving scoped dependencies from a singleton `BackgroundService`**:
`ICampaignDeliveryRepository` and `IWhatsAppProvider` are Scoped/Transient,
but `CampaignDeliveryWorker` is a Singleton (as every `IHostedService` is).
It resolves both from a fresh `IServiceScopeFactory.CreateScope()` every
poll tick rather than injecting them directly — the standard .NET pattern
for a long-running service with scoped dependencies.

## Templates

`CampaignTemplateService` self-seeds six default templates (Welcome, New
Collection, Festival, GOAT Sale, Price Drop, Wishlist Reminder) into
`campaignTemplates` the first time the collection is queried empty — there
is no manual seed script to run. `template-form`/`template-list`
components give admins full CRUD over both the defaults and any custom
templates (`isDefault: false`). Selecting a template in the campaign form
pre-fills message/image/button but doesn't link the campaign back to the
template afterward — editing a template later never retroactively changes
campaigns already created from it.

## Send Test

The "Send Test" button on the campaign form writes a `testMessages`
document (see
[Firestore Schema](../database/firestore-schema.md#collection-testmessages))
and nothing else — `status` is always `QUEUED`. It records the *intent*
to test-send to a specific number; it does not actually deliver a WhatsApp
message. The Live WhatsApp Preview panel next to the message editor is
what currently gives an admin visual confidence in how the message will
render — a client-side approximation of the WhatsApp UI, not a real
message.
