# Vrindaya Documentation

This directory is the source of truth for how the Vrindaya monorepo is
built, why it's structured the way it is, and what to do next. It's meant
to outlive any single conversation or contributor — read it before making
architectural changes, and update it when you do.

## Index

### Release (v1.0.0-beta top-level reference set)
- [Architecture](ARCHITECTURE.md) — system overview, monorepo/Angular/.NET/Firebase architecture, WhatsApp + worker + webhook flows, DI, folder structure, with Mermaid diagrams
- [Project Structure](PROJECT_STRUCTURE.md) — the complete, annotated file tree of `web/`, `api/`, and `docs/`
- [API Reference](API_REFERENCE.md) — every implemented endpoint, grouped by controller, with request/response/error examples
- [Firebase Setup](FIREBASE_SETUP.md) — project setup, auth, Firestore, Storage, rules, indexes, environment variables
- [Meta WhatsApp Setup](META_WHATSAPP_SETUP.md) — Business/Developer app setup, webhook, tokens, known Meta error codes
- [Deployment](DEPLOYMENT.md) — Vercel + Render procedures, environment variables, production checklist, rollback
- [Security](SECURITY.md) — authentication, authorization, JWT status, secrets, CORS, rate limiting, logging
- [Troubleshooting](TROUBLESHOOTING.md) — diagnosing build/deploy/Firebase/Meta/worker failures
- [Contributing](CONTRIBUTING.md) — branch strategy, commit style, Angular/.NET coding standards, PR/review checklists
- [Release Notes — v1.0.0-beta](RELEASE_NOTES_v1.0.0-beta.md) — features, known limitations, roadmap, deployment notes

### Architecture
- [System Architecture](architecture/system-architecture.md) — how `web/`, `api/`, and Firebase fit together end to end
- [Frontend Architecture](architecture/frontend-architecture.md) — Angular 21 app structure, conventions, state management
- [Backend Architecture](architecture/backend-architecture.md) — ASP.NET Core API layout, DI, middleware pipeline

### API
- [API Conventions](api/api-conventions.md) — versioning, response shapes, controller/service pattern, Swagger, CORS

### Database
- [Firestore Schema](database/firestore-schema.md) — every collection, its fields, and the security rules that govern it

### Deployment
- [Vercel Deployment](deployment/vercel-deployment.md) — deploying `web/`
- [Render Deployment](deployment/render-deployment.md) — deploying `api/`

### Marketing
- [Marketing Module](marketing/marketing-module.md) — subscribers, bulk import, the Insider ribbon/modal
- [Campaign Module](marketing/campaign-module.md) — campaign lifecycle, statuses, the send-pipeline-so-far
- [WhatsApp Integration Plan](marketing/whatsapp-integration-plan.md) — what's built vs. what Meta Cloud API integration still needs

### Branding
- [Design System](branding/design-system.md) — palette, typography, spacing, component conventions

### Roadmap
- [Roadmap](roadmap/roadmap.md) — what's next, in priority order
- [Completed Features](roadmap/completed-features.md) — a dated log of what's actually shipped

### Setup
- [Local Development](setup/local-development.md) — running `web/` and `api/` together
- [Environment Variables](setup/environment-variables.md) — every configuration value, where it's read, and how to set it per environment

## Conventions for this docs folder

- **Write for the next person, not for this moment.** Explain *why* a decision was made, not just what the code does — the code already says what it does.
- **Keep it accurate over keeping it complete.** A short doc that matches reality is more useful than a long one that's drifted from the code.
- **Update docs in the same change that changes the thing they describe.** If you add a Firestore collection, update `database/firestore-schema.md` in the same PR.
