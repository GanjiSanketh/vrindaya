# Version

**Current Version:** v1.1.0-beta
**Status:** Beta
**Release Date:** Unreleased

## What "Beta" means for this release

The platform is feature-complete for its current scope (storefront, admin
portal, marketing/campaign engine, media campaigns, WhatsApp Cloud API
sending, Collections, Flipkart Operations, Inventory & Lifecycle
Management, Brand CMS & SEO) and builds/runs cleanly end to end. It's
marked Beta rather than a stable `1.0.0` because of known, documented gaps
that affect real-world usage before a general production rollout:

- Most real WhatsApp sends will currently be rejected by Meta outside a
  24-hour customer-initiated window — template-approved sending isn't
  implemented yet (see [WhatsApp Integration Plan](docs/marketing/whatsapp-integration-plan.md)).
- No subscriber opt-out/unsubscribe flow exists.

The previous release's third beta-blocker — `api/`'s auth being a reserved
pass-through — is now resolved: real Firebase JWT Bearer authentication
plus an `AdminOnly` policy enforce every admin/mutating endpoint (see
[docs/SECURITY.md](docs/SECURITY.md)).

None of these are defects in what's built — they're the next items on
[docs/roadmap/roadmap.md](docs/roadmap/roadmap.md), sequenced deliberately
rather than rushed.

## Versioning scheme

Semantic versioning (`MAJOR.MINOR.PATCH[-PRERELEASE]`):

- `MAJOR` — breaking changes to the Firestore schema, public API
  contracts, or deployment topology.
- `MINOR` — new features, additive schema changes, non-breaking API
  additions.
- `PATCH` — bug fixes, documentation, dependency updates.
- `-beta`/`-rc` — pre-release qualifiers; dropped once the roadmap gaps
  above are closed and the release has real-world usage confidence.

See [CHANGELOG.md](CHANGELOG.md) for what's included in this version.
