# Contributing

Guidelines for working on the Vrindaya codebase, derived from the
conventions the existing code already follows.

## Branch Strategy

The repository currently deploys from `main` directly
(`.github/workflows/ci.yml` triggers on push/PR to `main`) — there is no
`develop`/`release` branch model in place today. Recommended workflow for
new work:

- Branch from `main`: `feature/<short-description>`, `fix/<short-description>`,
  `docs/<short-description>`.
- Open a pull request into `main`. The Quality Gate (lint, test,
  SonarCloud) runs on every PR automatically — see
  [DEPLOYMENT.md](DEPLOYMENT.md#angular-deployment-vercel).
- Merging to `main` triggers a production deploy of `web/` once the
  Quality Gate passes. There is no equivalent automated gate for `api/`
  yet (see [Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap))
  — be correspondingly more careful with manual verification before
  merging `api/` changes.

## Commit Messages

No enforced commit message format (no commitlint/conventional-commits
tooling is configured), but existing history favors short, descriptive,
present/past-tense summaries of *what* changed. Prefer:

```
Add campaign recipient pagination to Execution Details page
Fix Firestore permission error on bulk import duplicate check
Update WhatsApp provider to support image/video/document messages
```

Over vague messages like `fix bug` or `updates`. If a commit is
significant enough to need explanation beyond the summary line, use a
body paragraph explaining *why*, not a restatement of the diff.

## Coding Standards

### General

- 2-space indentation, UTF-8, trailing whitespace trimmed, final newline
  — enforced by `.editorconfig` at the repo root for all file types.
- Prefer editing existing files/patterns over introducing a new
  convention for something already handled elsewhere in the codebase.

### Angular Standards

- **Standalone components only** — no `NgModule`s. Every new component
  declares `standalone: true` and its own `imports: [...]`.
- **Signals for state, not RxJS `BehaviorSubject`s.** Services expose
  `signal()`/`computed()`; components read them directly in templates.
  RxJS is acceptable only where the platform genuinely requires it
  (Router events, `toObservable()` bridging in guards).
- **Reactive Forms, not template-driven forms** — `FormBuilder.group()` +
  `Validators`, with the existing `isInvalid(ctrl)` + `[class.invalid]`
  pattern for validation display.
- **No AngularFire** — Firestore/Storage/Auth calls use the raw
  `firebase` SDK via dynamic `import()` inside service methods, guarded
  by `isPlatformBrowser()` so nothing executes during SSR.
- **Single quotes** for TypeScript strings (`.editorconfig` enforces
  this); `eslint.config.js` + `npm run lint` (`--max-warnings=0`) gates
  every PR.
- **`components/` vs `features/`**: a homepage-only section with no route
  goes in `components/`; anything with its own route goes in
  `features/<name>/`, owning its own `*.routes.ts`.
- **Extract shared logic, don't duplicate it.** If you're about to copy
  a helper method (e.g. a Firestore error mapper, a date formatter) into
  a second service/component, put it in `shared/utils/` instead — this
  was a specific cleanup item in the v1.0.0-beta release (see
  [RELEASE_NOTES_v1.0.0-beta.md](RELEASE_NOTES_v1.0.0-beta.md)).

### .NET Standards

- **Controllers stay thin.** No `try`/`catch`, no Firestore/HTTP call, no
  conditional beyond routing in a controller action — that logic belongs
  in the injected service.
- **Options pattern for configuration** — a new config section gets its
  own strongly typed class in `Configuration/`, bound once in
  `ServiceCollectionExtensions.AddApplicationOptions()`. Never read
  `IConfiguration` directly in a service.
- **One interface, one implementation, one DI registration** — add a new
  service by implementing its interface and adding one line to
  `AddApplicationServices()`; nothing else in `Program.cs` should need to
  change.
- **`Models/` vs `DTOs/`** — Firestore document shapes
  (`[FirestoreData]`) go in `Models/`; HTTP request/response shapes go in
  `DTOs/`. Never reuse one class for both boundaries.
- **`async`/`await` with `CancellationToken`** — every controller action
  and service method that does I/O accepts and forwards a
  `CancellationToken`. ASP.NET Core auto-binds the request's own token to
  a controller action parameter named `cancellationToken`.
- **Async naming**: methods that return `Task`/`Task<T>` end in `Async`.
- **Status/media-type string constants** live in `Constants/`
  (`CampaignExecutionStatus`, `CampaignRecipientStatus`,
  `CampaignMediaType`) and must exactly mirror the literal string values
  the Angular app writes into Firestore — never hardcode these strings
  in a new file; reference the constant.

## Folder Naming

- Angular: kebab-case folders and filenames
  (`campaign-form/campaign-form.component.ts`), matching Angular CLI
  convention.
- .NET: PascalCase folders matching C# namespace/class convention
  (`Services/CampaignDelivery/CampaignDeliveryWorker.cs`).
- A feature that spans several closely related classes (e.g. a provider
  + its wire-format models, or a worker + its repository) gets its own
  subfolder under `Services/` (see `Services/WhatsApp/`,
  `Services/CampaignDelivery/`); a single implementation class stays flat
  in `Services/`.

## Pull Request Checklist

- [ ] `npm run lint` and `npm run test:ci` pass locally (`web/`)
- [ ] `dotnet build` produces 0 warnings, 0 errors (`api/`)
- [ ] No secrets committed — check `git diff` for anything resembling an
      access token, private key, or password before pushing (see
      [SECURITY.md](SECURITY.md#secrets))
- [ ] New Firestore fields/collections are documented in
      [database/firestore-schema.md](database/firestore-schema.md)
- [ ] New API endpoints are documented in [API_REFERENCE.md](API_REFERENCE.md)
- [ ] No duplicated logic introduced where an existing shared
      utility/service already covers it
- [ ] Existing functionality manually verified where automated test
      coverage doesn't reach (this codebase's test suite is not
      exhaustive — see [Future Roadmap](RELEASE_NOTES_v1.0.0-beta.md#future-roadmap))

## Review Checklist

For the reviewer, not just the author:

- [ ] Does this change match the existing pattern for its layer
      (controller/service/DTO in `api/`; component/service/model in
      `web/`), or does it introduce an inconsistent new one?
- [ ] Are Firestore Security Rules updated in the same change if a new
      collection or field-level restriction is introduced?
- [ ] Does a new `api/` config value follow the Options pattern, with an
      environment variable name that follows the existing
      double-underscore convention?
- [ ] Is anything logged that shouldn't be (access tokens, full request
      bodies containing secrets)? See [SECURITY.md](SECURITY.md#logging).
- [ ] Does the PR description explain *why*, not just *what* — especially
      for anything touching the campaign delivery worker, Firestore
      rules, or authentication?
