# WhatsApp Integration Plan

**Vrindaya now sends real WhatsApp messages** — `api/`'s
`CampaignDeliveryWorker` calls Meta's Cloud API for every `QUEUED`
`campaignRecipients` document. This document used to open with "none of
this sends a real message yet"; that's no longer true. What follows is an
honest accounting of what's real versus what's still a gap, because the
gaps that remain (template approval, placeholder substitution) can make a
real send silently fail or look wrong in ways that are easy to miss.

## What's built

| Piece | What it does today |
| --- | --- |
| Settings page (`whatsapp-settings.component.ts`) | Admin form to enter/edit Meta Business API credentials, stored in `whatsappSettings/default` — **informational only now**; the credentials the actual send path uses come from `api/`'s `WhatsApp:*` config, not this Firestore document |
| Campaign Form (`campaign-form.component.ts`) | Compose a message, pick a template, "Send Test" (still intent-only) and "Send Now" (now triggers a real send — see below) |
| Live WhatsApp Preview (`whatsapp-preview.component.ts`) | Client-side visual approximation of the WhatsApp message bubble UI — no network call |
| Template Management (`template-list`/`template-form`) | CRUD over `campaignTemplates`, six self-seeded defaults — **not the same thing as a Meta-approved template**; see the risk below |
| `IWhatsAppProvider`/`MetaWhatsAppProvider` (`api/Services/WhatsApp/`) | **Real** Meta Graph API calls — `SendTextMessageAsync`, `SendImageMessageAsync`, `SendVideoMessageAsync`, `SendDocumentMessageAsync` are all used (by `CampaignDeliveryWorker`, based on the campaign's `mediaType`); `SendTemplateMessageAsync` exists but nothing calls it yet |
| `CampaignDeliveryWorker` (`api/Services/CampaignDelivery/`) | **Real** background worker — polls `campaignExecutions`, sends to every `QUEUED` `campaignRecipient` via `IWhatsAppProvider`, picking the message type from `mediaType`, updates status/messageId/errorMessage. See [Campaign Module](campaign-module.md#background-delivery-worker). |
| Campaign Queue / Delivery Dashboard (`campaign-queue-list.component.ts`, `delivery-dashboard.component.ts`) | Still view `campaignQueue` — which `CampaignDeliveryWorker` does **not** touch. This UI now shows a permanently-`PENDING` view of a collection nothing processes; `campaignRecipients` (via the Execution Details page) is where real status lives. |

**What sending actually does today**: `CampaignDeliveryWorker` sends the
campaign's declared media (image/video/document, with `caption`) or its
raw `message` field as plain text if `mediaType` is `Text` — see
[Media Campaigns](campaign-module.md#media-campaigns). No template, no
placeholder substitution, and no `footer`/`buttonText`/`thumbnailUrl` in
the actual Meta payload — those remain display-only, since Meta's basic
message types (text/image/video/document) don't support them at all;
only an "interactive" message type would, which isn't implemented. A
campaign with `{{name}}` in its message/caption sends `{{name}}` literally
to every recipient.

## The real risk now that sending is live: Meta's 24-hour window

Meta's Cloud API only allows free-form **text** messages within an active
24-hour *customer-initiated* conversation window. Outside that window,
Meta requires a pre-approved message **template**. `campaignRecipients`
targets `marketingSubscribers` broadly — most of those subscribers have
not messaged the business number in the last 24 hours. **In practice,
this means many/most real sends will be rejected by Meta** with an
error captured in `campaignRecipients.errorMessage` (visible on the
Execution Details page) — not a bug in this app, but an unaddressed gap
in what it sends. See the next section.

## What's left, in priority order

1. **Template-based sending**, to work around the 24-hour-window problem
   above. Requires: (a) submitting message templates for approval in Meta
   Business Manager — a manual, days-long external review process, worth
   starting *now* rather than when it blocks a real campaign — and (b)
   reconciling `campaignTemplates` (this app's Firestore collection) with
   Meta's own approved-template registry, likely by storing Meta's
   approved template name/ID on each `campaignTemplates` document, and
   having `CampaignDeliveryWorker` call the already-implemented
   `IWhatsAppProvider.SendTemplateMessageAsync()` instead of
   `SendTextMessageAsync()` when a campaign is template-based.
2. **Placeholder substitution** (`{{name}}`, `{{mobile}}`, `{{product}}`,
   `{{link}}`, `{{date}}` — see
   [Campaign Module](campaign-module.md#message-placeholders)) — still
   literal text; `CampaignDeliveryWorker` sends `campaign.Message`
   unmodified to every recipient regardless of the placeholders in it.
3. **Retire or repurpose `campaignQueue`.** It's now genuinely dead —
   `CampaignDeliveryWorker` drives `campaignRecipients`, not this
   collection, so the Campaign Queue and Delivery Dashboard admin pages
   show a permanently-`PENDING`, never-updated view. Either point those
   pages at `campaignRecipients` instead, or remove `campaignQueue`'s
   fan-out from `CampaignQueueService.enqueueForCampaign()` entirely once
   nothing reads it — don't leave both fan-outs running indefinitely.
4. **Handle Meta's delivery webhooks.** Meta posts delivery/read receipts
   to a webhook URL configured in Meta Business Manager. `POST /api/v1/whatsapp/webhook`
   already exists and already logs incoming events — per this phase's
   explicit constraint, it does **not** process them. Wiring it to update
   `campaignRecipients.status` (`DELIVERED`/`READ`) via `executionId`+
   `messageId` lookup is the next real step; the webhook's own
   verification handshake (`GET /api/v1/whatsapp/webhook`) is already
   fully implemented.
5. **Only then** does `Campaign.status: 'SENT'` become meaningful —
   nothing sets it yet (see
   [Campaign Module](campaign-module.md#status-lifecycle)); it's arguably
   now more natural to derive campaign-level "sent" from
   `CampaignExecution.status: 'COMPLETED'` than to add a fifth place that
   tracks the same fact.
6. **Retry support.** `campaignRecipients.attempts` is incremented once
   per send today with no retry loop — a transient Meta error currently
   permanently fails that recipient. A future pass through
   `CampaignDeliveryWorker` could re-queue `FAILED` recipients below some
   attempt ceiling.
