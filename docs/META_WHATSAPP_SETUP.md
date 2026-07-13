# Meta WhatsApp Cloud API Setup

This document covers setting up Meta's WhatsApp Cloud API for use with
`api/`'s `MetaWhatsAppProvider` and `CampaignDeliveryWorker`.

## Meta Business Setup

1. Create or use an existing [Meta Business Manager](https://business.facebook.com)
   account.
2. Verify your business (required before you can send to real, non-test
   numbers at any real volume).

## Developer App

1. Create an app at [developers.facebook.com](https://developers.facebook.com/apps)
   with the **Business** app type.
2. Add the **WhatsApp** product to the app.
3. Under WhatsApp → API Setup, note the **temporary access token** shown
   there for immediate testing (see [Temporary Token](#temporary-token-vs-permanent-token)).

## Phone Number

- Meta provides one **free test phone number** per app by default — good
  enough for `POST /api/v1/whatsapp/test` and development, but it can
  only message phone numbers you've explicitly added to its recipient
  allow-list (WhatsApp → API Setup → "To" field / manage recipient list).
  Sending to a number not on this list returns Meta error `131030` (see
  [Known Meta Error Codes](#known-meta-error-codes)).
- For production, add your own business phone number (WhatsApp → Phone
  Numbers → Add phone number) and complete verification.
- Either way, note the **Phone Number ID** (not the phone number itself)
  — this is what `WhatsApp:PhoneNumberId` expects.

## Cloud API

Vrindaya calls Meta's Cloud API directly over HTTPS — no Meta SDK is
used. The base request shape (from `api/Services/WhatsApp/MetaWhatsAppProvider.cs`):

```
POST https://graph.facebook.com/{ApiVersion}/{PhoneNumberId}/messages
Authorization: Bearer {AccessToken}
Content-Type: application/json
```

Four message types are implemented, selected by the sending campaign's
`mediaType` (see [ARCHITECTURE.md](ARCHITECTURE.md#whatsapp-integration-flow)):

```json
// text
{ "messaging_product": "whatsapp", "to": "919999999999", "type": "text", "text": { "body": "..." } }

// image / video (same shape, different "type")
{ "messaging_product": "whatsapp", "to": "919999999999", "type": "image", "image": { "link": "https://...", "caption": "..." } }

// document
{ "messaging_product": "whatsapp", "to": "919999999999", "type": "document", "document": { "link": "https://...", "caption": "...", "filename": "brochure.pdf" } }
```

`SendTemplateMessageAsync` also exists on `IWhatsAppProvider` but nothing
in the app calls it yet — template-based sending is not wired up (see
[Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap)).

## Webhook

1. In your Meta app → WhatsApp → Configuration, set the **Callback URL**
   to `https://<your-api-host>/api/v1/whatsapp/webhook`.
2. Set the **Verify Token** to any string you choose — it must exactly
   match `WhatsApp:VerifyToken` in `api/`'s configuration.
3. Click "Verify and Save". Meta sends a `GET` request with
   `hub.mode=subscribe`, `hub.verify_token=<your token>`, and
   `hub.challenge=<random string>`; the API echoes back `hub.challenge`
   only if the token matches (see [API_REFERENCE.md](API_REFERENCE.md#get-apiv1whatsappwebhook)).
4. Subscribe to the `messages` webhook field so Meta sends delivery/read
   status updates.

**What happens after verification**: incoming events are received at
`POST /api/v1/whatsapp/webhook` and **logged only** — nothing in this
app parses them or updates `campaignRecipients.status` to
`DELIVERED`/`READ` yet. This is a deliberate scope boundary for this
release, not a bug.

## Verify Token

`WhatsApp:VerifyToken` is **not a secret provided by Meta** — it's a
string you invent yourself and enter in both places (Meta's dashboard and
your own config). Any sufficiently random string works; it exists purely
so Meta can prove to your server that the verification request actually
came from Meta's registration flow (or vice versa — that your server is
the one you claim).

## Temporary Token vs Permanent Token

| | Temporary Token | Permanent (System User) Token |
| --- | --- | --- |
| Where to get it | WhatsApp → API Setup, shown directly | Business Settings → System Users → generate a token for a system user with WhatsApp permissions |
| Lifetime | ~24 hours | Does not expire (until manually revoked) |
| Use for | Local testing, `POST /api/v1/whatsapp/test` during development | Production `WhatsApp:AccessToken` |

**Never commit either token to source control.** In this repo,
`api/appsettings.Development.json` (where a real token would go for local
testing) is git-ignored specifically for this reason.

## Environment Variables

| Variable | Section | Notes |
| --- | --- | --- |
| `WhatsApp__AccessToken` | `WhatsApp:AccessToken` | Bearer token — secret |
| `WhatsApp__PhoneNumberId` | `WhatsApp:PhoneNumberId` | Not a secret — also returned by `GET /whatsapp/health` |
| `WhatsApp__BusinessAccountId` | `WhatsApp:BusinessAccountId` | Not currently consumed by any request path — reserved for future WABA-level operations |
| `WhatsApp__VerifyToken` | `WhatsApp:VerifyToken` | Must match the value entered in Meta's dashboard |
| `WhatsApp__ApiVersion` | `WhatsApp:ApiVersion` | e.g. `v23.0` — the Graph API version segment in every request URL |

## Testing

1. Set real values for the five variables above (locally, in
   `api/appsettings.Development.json` — git-ignored — or as real
   environment variables).
2. Run `api/` (`dotnet run`), open Swagger (`https://localhost:5001/swagger`
   in Development).
3. `GET /api/v1/whatsapp/health` should report `"connectionStatus": "Configured"`.
4. `POST /api/v1/whatsapp/test` with a recipient number on your test
   number's allow-list. A `200` with a `messageId` means Meta accepted
   the message — check your phone.
5. To exercise the full send pipeline (not just the test endpoint), create
   and send a real campaign in the Angular admin UI, then watch the API's
   logs for `CampaignDeliveryWorker` batch/send log lines (see
   [ARCHITECTURE.md](ARCHITECTURE.md#background-worker)).

## Known Meta Error Codes

`MetaWhatsAppProvider` does **not** special-case any of Meta's error
codes — it parses the standard `{"error": {"message": ..., "code": ..., "error_subcode": ...}}`
shape into `MetaErrorResponse` and surfaces `error.message` verbatim as
`SendMessageResponse.details` (for the test endpoint) or
`campaignRecipients.errorMessage` (for a real campaign send). The codes
below are Meta's own, documented for reference when reading that
message — not something this app currently branches on.

| Code | Meaning | What to do |
| --- | --- | --- |
| `131030` | Recipient phone number not in the allowed recipient list (test/development phone numbers only) | Add the recipient number in Meta's dashboard (WhatsApp → API Setup), or move to a verified production number |
| `131031` | WhatsApp Business Account has been restricted or disabled by Meta | Check Business Manager for a policy notice; this typically requires a Meta support appeal, not a code fix |
| `190` (`OAuthException`) | Access token is invalid, malformed, or expired | Regenerate the token (temporary tokens expire in ~24h); confirm `WhatsApp:AccessToken` is set correctly |
| `100` | Invalid parameter in the request | Check the payload shape being sent — usually a malformed phone number or missing required field |
| `131047` | Re-engagement message outside the 24-hour window | Expected today — this app doesn't implement template-based sending yet; see [Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap) |
| `131053` | Media upload/download error | Confirm the media URL (`imageUrl`/`videoUrl`/`documentUrl`) is publicly reachable — Firebase Storage rules must allow public read for the relevant path |

### Example error response as this app surfaces it

```json
{
  "success": false,
  "message": "Meta API rejected the request.",
  "messageId": null,
  "details": "Invalid OAuth access token - Cannot parse access token"
}
```

## Related documents

- [API_REFERENCE.md](API_REFERENCE.md#whatsappcontroller) — the endpoints
  described above
- [SECURITY.md](SECURITY.md) — how the access token is protected and
  what is/isn't logged
- [marketing/whatsapp-integration-plan.md](marketing/whatsapp-integration-plan.md) —
  the full, ongoing accounting of what's built versus what remains
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md#meta-authentication-error) —
  diagnosing a failed send step by step
