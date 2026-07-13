# API Reference

Base URL:

```
Development:  http://localhost:5000/api/v1  (or https://localhost:5001/api/v1)
Production:    https://<your-render-service>.onrender.com/api/v1
```

All routes are versioned by URL segment (`/api/v1/...`). Swagger UI is
available at `/swagger` in Development only.

**Authentication**: no endpoint in this API enforces authentication
today. `TokenValidationMiddleware` is registered in the pipeline but is a
pure pass-through — see [SECURITY.md](SECURITY.md) and
[ARCHITECTURE.md](ARCHITECTURE.md#net-api-architecture). Every endpoint
below is reachable without a token.

**Error shape (unhandled exceptions)** — from `GlobalExceptionMiddleware`,
wraps every controller:

```json
{
  "success": false,
  "message": "Unexpected error occurred.",
  "traceId": "0HNMS5HGV7O9E:00000001"
}
```

**Error shape (validation failures)** — standard ASP.NET Core
`ValidationProblemDetails` (RFC 7807), returned automatically by
`[ApiController]` when model binding/validation fails:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "PhoneNumber": ["Phone number must contain 10 to 15 digits, ..."] },
  "traceId": "00-...-00"
}
```

## Controllers with implemented endpoints

- [HealthController](#healthcontroller)
- [WhatsAppController](#whatsappcontroller)

## Controllers with no implemented endpoints (scaffolding only)

`ProductController`, `MarketingController`, `CampaignController`,
`AnalyticsController`, `OrdersController`, `AuthController` are each
registered, versioned, and constructor-injected against their `I*Service`
interface — but have **zero `[Http*]` actions today**. Hitting any route
under these controllers (e.g. `GET /api/v1/product`) returns a `404`,
since there is no matching action, not a `501` or placeholder response.
See [Completed Features](roadmap/completed-features.md) for what's
planned for each.

---

## HealthController

Route prefix: `api/v{version:apiVersion}/health` (deliberately not
pluralized like a resource collection — this is a status check).

### `GET /api/v1/health`

**Purpose**: rich, versioned health payload for API consumers (dashboards,
uptime checks that want structured data).

| | |
| --- | --- |
| Method | `GET` |
| Route | `/api/v1/health` |
| Request | None |
| Authentication | None required |
| Possible errors | None expected — this endpoint has no dependencies to fail |

**Example request**

```bash
curl https://localhost:5001/api/v1/health
```

**Example response — `200 OK`**

```json
{
  "status": "Healthy",
  "application": "Vrindaya API",
  "version": "1.0.0",
  "environment": "Development",
  "serverTime": "2026-07-13T04:29:35.290Z"
}
```

> Note: `GET /health` (no `/api/v1` prefix) also exists — it's ASP.NET
> Core's built-in Health Checks middleware, returning plain-text
> `Healthy`/`Unhealthy`, unversioned. It's intended for Render's
> infrastructure-level health probe, not for API consumers. See
> [API Conventions](api/api-conventions.md#health-checks--two-on-purpose-at-different-paths).

---

## WhatsAppController

Route prefix: `api/v{version:apiVersion}/whatsapp`.

### `GET /api/v1/whatsapp/health`

**Purpose**: reports whether the required Meta credentials are
*configured* (present), safe to poll from an admin dashboard without
auth. This does **not** verify Meta actually accepts the token — it's a
configuration-presence check only, to avoid burning API calls/rate limit
on every poll.

| | |
| --- | --- |
| Method | `GET` |
| Route | `/api/v1/whatsapp/health` |
| Request | None |
| Response | `WhatsAppHealthDto` |
| Authentication | None required |
| Possible errors | None expected |

**Example response — `200 OK`**

```json
{
  "connectionStatus": "Configured",
  "phoneNumberId": "1188542594345308",
  "apiVersion": "v23.0"
}
```

`connectionStatus` is `"Configured"` if `WhatsApp:AccessToken` and
`WhatsApp:PhoneNumberId` are both non-empty, otherwise `"NotConfigured"`.
The response deliberately never includes the access token or business
account ID.

---

### `POST /api/v1/whatsapp/test`

**Purpose**: sends a **real** WhatsApp text message via Meta's Cloud API
to a single recipient. This is the one endpoint in the whole API that
performs a genuine external side effect.

| | |
| --- | --- |
| Method | `POST` |
| Route | `/api/v1/whatsapp/test` |
| Request | `SendMessageRequest` (JSON body) |
| Response | `SendMessageResponse` |
| Authentication | None required |
| Possible errors | `400` validation, `502` Meta rejection/unreachable |

**Request body — `SendMessageRequest`**

| Field | Type | Validation |
| --- | --- | --- |
| `phoneNumber` | string | Required. 10–15 digits, no `+`/spaces/symbols (e.g. `919999999999`) |
| `message` | string | Required. 1–4096 characters (WhatsApp's text body limit) |

**Example request**

```bash
curl -X POST https://localhost:5001/api/v1/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"919999999999","message":"Hello from Vrindaya"}'
```

**Example response — `200 OK` (Meta accepted it)**

```json
{
  "success": true,
  "message": "Message sent successfully.",
  "messageId": "wamid.HBgMOTE5OTk5OTk5OTk5FQIAERgS...",
  "details": null
}
```

**Example response — `502 Bad Gateway` (Meta rejected it)**

```json
{
  "success": false,
  "message": "Meta API rejected the request.",
  "messageId": null,
  "details": "Invalid OAuth access token - Cannot parse access token"
}
```

`502`, not `500`, is used deliberately here — the API handled the request
correctly; an upstream dependency (Meta) declined it. See
[SECURITY.md](SECURITY.md) for what is and isn't logged for this call
(the access token is never logged).

**Example response — `400 Bad Request` (invalid phone number)**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "PhoneNumber": ["Phone number must contain 10 to 15 digits, including the country code, with no spaces or symbols (e.g. 919999999999)."]
  }
}
```

---

### `GET /api/v1/whatsapp/webhook`

**Purpose**: Meta's webhook subscription verification handshake. Called
by Meta when you register/verify a webhook URL in the Meta App Dashboard
— not intended to be called by this app's own clients.

| | |
| --- | --- |
| Method | `GET` |
| Route | `/api/v1/whatsapp/webhook` |
| Request | Query parameters: `hub.mode`, `hub.verify_token`, `hub.challenge` |
| Response | Plain text (the echoed `hub.challenge`), or `403` |
| Authentication | None — `[AllowAnonymous]`, deliberately, so it stays reachable once auth is added elsewhere |
| Possible errors | `403 Forbidden` if `hub.mode != "subscribe"` or `hub.verify_token` doesn't match `WhatsApp:VerifyToken` |

**Example request**

```bash
curl "https://localhost:5001/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=vrindaya_verify&hub.challenge=12345"
```

**Example response — `200 OK`**

```
12345
```

(Plain text — the exact `hub.challenge` value, echoed back.)

**Example response — `403 Forbidden`** (wrong verify token): empty body.

---

### `POST /api/v1/whatsapp/webhook`

**Purpose**: receives ongoing delivery/read/message status events from
Meta after the webhook is verified.

| | |
| --- | --- |
| Method | `POST` |
| Route | `/api/v1/whatsapp/webhook` |
| Request | Arbitrary JSON body (Meta's webhook event payload) |
| Response | `200 OK`, empty body |
| Authentication | None — `[AllowAnonymous]` |
| Possible errors | None — the body is logged as-is and always acknowledged |

**What this endpoint does NOT do**: it does not parse the payload, does
not update `campaignRecipients.status` to `DELIVERED`/`READ`, and does
not verify Meta's `X-Hub-Signature-256` header. The raw payload is logged
only. This is a deliberate, documented scope boundary — see
[WhatsApp Integration Plan](marketing/whatsapp-integration-plan.md) and
[Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap).

**Example request**

```bash
curl -X POST https://localhost:5001/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"id":"123","changes":[{"value":{"statuses":[]}}]}]}'
```

**Example response — `200 OK`**: empty body.

---

## DTO Reference

### `SendMessageRequest`

```csharp
public class SendMessageRequest
{
    public string PhoneNumber { get; set; }  // [Required], [WhatsAppPhoneNumber]
    public string Message { get; set; }       // [Required], [StringLength(4096)]
}
```

### `SendMessageResponse`

```csharp
public class SendMessageResponse
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public string? MessageId { get; set; }  // set only on success
    public string? Details { get; set; }     // set only on failure
}
```

### `WhatsAppHealthDto`

```csharp
public class WhatsAppHealthDto
{
    public string ConnectionStatus { get; set; }  // "Configured" | "NotConfigured"
    public string PhoneNumberId { get; set; }
    public string ApiVersion { get; set; }
}
```

### `HealthStatusDto`

```csharp
public class HealthStatusDto
{
    public string Status { get; set; }
    public string Application { get; set; }
    public string Version { get; set; }
    public string Environment { get; set; }
    public DateTime ServerTime { get; set; }
}
```

## CORS

Only two origins may call this API — configured in `appsettings.json`
under `Cors:AllowedOrigins`, not hardcoded:

- `http://localhost:4200` (Angular dev server)
- `https://vrindaya.vercel.app` (production)

A request from any other origin will not receive
`Access-Control-Allow-Origin` and will be blocked by the calling
browser — see [SECURITY.md](SECURITY.md#cors).

## Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — how these endpoints fit into the
  overall system
- [docs/api/api-conventions.md](api/api-conventions.md) — the underlying
  conventions (versioning, response shape philosophy) this reference
  follows
- [META_WHATSAPP_SETUP.md](META_WHATSAPP_SETUP.md) — how to obtain the
  credentials `POST /whatsapp/test` needs to actually succeed
