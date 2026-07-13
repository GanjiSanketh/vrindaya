# Roadmap

Ordered by dependency, not by importance — some later items are blocked on
earlier ones. See [Completed Features](completed-features.md) for what's
already shipped.

## 1. Commit and stabilize the current working tree

Nothing else on this list matters until the monorepo split and the entire
Marketing/Campaign/WhatsApp module are actually committed — see the
working-tree note in [Completed Features](completed-features.md). Until
then, this is all uncommitted local state.

## 2. Meta WhatsApp Cloud API integration — partially done

`CampaignDeliveryWorker` (a .NET `BackgroundService`) now sends real
WhatsApp text, image, video, and document messages per recipient — see
[Campaign Module](../marketing/campaign-module.md#background-delivery-worker)
and [Media Campaigns](../marketing/campaign-module.md#media-campaigns).
What's left, in priority order (full detail in
[WhatsApp Integration Plan](../marketing/whatsapp-integration-plan.md)):

- **Template-approved sending** — urgent, not optional. Meta only allows
  free-form messages (any type — text or media) within a 24-hour
  customer-initiated window; most `marketingSubscribers` sends will
  currently be rejected by Meta outside that window. Submit templates for
  approval in Meta Business Manager now (multi-day external review lag)
  before this blocks a real campaign.
- Placeholder substitution (`{{name}}` etc. still sent literally, in both `message` and `caption`).
- Interactive/button messages — `footer`/`buttonText`/`buttonUrl` are
  currently display-only; sending them for real needs Meta's "interactive"
  message type, a different payload shape `IWhatsAppProvider` doesn't
  support yet.
- Retire `campaignQueue`'s parallel, now-dead fan-out (superseded by
  `campaignRecipients`), or repoint the Campaign Queue/Delivery Dashboard
  pages at the collection that's actually live.
- Wire the WhatsApp webhook (currently log-only, by design) to update
  `campaignRecipients.status` on delivery/read receipts.
- **Add a "Cancel Execution" admin action.** `CampaignDeliveryWorker`
  already honors `CampaignExecution.status: 'CANCELLED'` (stops mid-batch
  immediately), but nothing in Angular sets it yet — today that only
  happens if someone edits the document by hand in the Firebase Console.
- Retry support for `FAILED` recipients (currently one attempt, no retry loop).

## 3. Firebase Authentication in `api/`

`TokenValidationMiddleware` is a reserved pass-through
(see [Backend Architecture](../architecture/backend-architecture.md#token-validation-reserved-not-implemented)).
Implementing real Firebase ID token verification here is a prerequisite
for *any* endpoint in `api/` to be safely callable by `web/` — right now
every controller action that gets added is either unauthenticated or
blocked on this. Do this before, not after, the WhatsApp queue processor
needs its first admin-triggered endpoint.

## 4. Resolve the `admin-users` / `AdminAuthService` split

Either wire `AdminAuthService` to actually read the `admin-users`
Firestore collection (enabling real multi-admin support, matching what
the Admin Management UI already implies is possible), or remove the
unused collection/service/UI so the codebase doesn't imply a capability
that doesn't exist. Whichever direction, add Firestore rules for
`admin-users` — it currently falls through to deny-by-default, so the
existing UI can't work against production rules regardless. See
[Firestore Schema](../database/firestore-schema.md#admin-users).

## 5. CI/CD for `api/`

`web/` has a full CI pipeline (lint, test, SonarCloud, Vercel deploy);
`api/` has none — Render currently deploys via its own Git-push watcher
with no quality gate. Once `api/` has real business logic worth
protecting, add a `.github/workflows` job: `dotnet build`, `dotnet test`
(once tests exist), and ideally a Render deploy hook gated on that job
passing — mirroring the `quality` → `deploy` dependency `web/` already
has. See [Render Deployment](../deployment/render.md).

## 6. Campaign audience segmentation

`CAMPAIGN_AUDIENCES` supports exactly one value
(`ALL_ACTIVE_SUBSCRIBERS`) today. Real campaign targeting (by source, by
join date, by past engagement) needs both a data-model decision (tags on
`marketingSubscribers`? a separate segments collection?) and UI in the
campaign form's audience picker.

## 7. Subscriber lifecycle — now urgent, not hypothetical

No unsubscribe/opt-out flow exists — `status` is always written as
`ACTIVE`. This was a "before real sending" concern; sending is real now.
An opt-out mechanism isn't a nice-to-have at this point — Meta's platform
policies and general messaging compliance expect one, and every
`ACTIVE` subscriber is a real send target on every future campaign.

## 8. Product/order/analytics modules in `api/`

The API's `ProductController`, `OrderController` (if present), and
`AnalyticsController` scaffolding exists with zero implemented actions —
these are the next natural candidates once auth (item 3) lands, moving
product management off `localStorage` and onto a real backend with
Firestore or another persistent store behind it.

## 9. Housekeeping

- Rename `--maroon`/`--maroon-dark`/`--maroon-mid`/`--maroon-light` to a
  teal-accurate name, in one pass across every consuming stylesheet. See
  [Design System](../branding/design-system.md).
- Evaluate replacing `xlsx` (SheetJS) — used for bulk import — given its
  unpatched security advisory, since it's the one third-party parsing
  library operating on user-uploaded file content in the app.
