# Frontend Architecture

`web/` is an Angular 21 application using standalone components and
signals throughout — no NgModules, no RxJS state stores. It serves two
distinct experiences from one codebase: the public storefront and the
admin portal, both under the same Angular Router.

## Top-level structure

```
web/src/app/
├── app.ts / app.html / app.routes.ts / app.config.ts   Root shell + route table
├── app.routes.server.ts                                  SSR render-mode overrides
├── layout/                                                Storefront shell (header/footer + global overlays)
├── components/                                            Homepage-only presentational sections (Hero, Categories, ...)
├── core/                                                  App-wide constants, models, and services (Product, Wishlist, SEO, ...)
├── shared/                                                 Reusable components/directives used across features
├── features/                                               Routed pages, one subfolder per route area
└── data/                                                   Static seed data (products.json)
```

## Why `components/` and `features/` are both present

This is the one convention worth calling out explicitly, because it looks
inconsistent until you know the rule:

- **`components/`** — homepage-only sections (`Hero`, `Categories`,
  `NewArrivals`, `TrendingProducts`, ...). Not routed; imported directly
  into `HomePageComponent`'s template.
- **`features/`** — anything with its own route. Each feature owns its own
  `*.routes.ts`, and typically a `pages/` or `components/` subfolder plus
  optional `services/` and `models/` if the feature has state or data
  shapes that don't belong anywhere else.

When adding a new homepage section with no route, it goes in `components/`.
When adding a new page, it goes in `features/<name>/`.

## Standalone components + `@defer`

Every component is `standalone: true`. Homepage sections below the fold
are wrapped in `@defer (on viewport; prefetch on immediate)` so their JS
doesn't block first paint — this is why `home-page.component.html` looks
like a list of `@defer` blocks rather than a flat template. The same
pattern is used for the Insider ribbon (`@defer (on idle)`) and modal
(`@defer (when insider.modalOpen())`) in `layout.component.ts`, so a
feature that's rarely used (the modal) never ships in the initial bundle.

## Signals, not RxJS state

Services expose state as signals, not `BehaviorSubject`s:

```ts
private readonly _ids = signal<number[]>(this.load());
readonly ids   = this._ids.asReadonly();
readonly count = computed(() => this._ids().length);
```

Components `inject()` the service and read signals directly in templates
(`svc.count()`), rather than subscribing in `ngOnInit`. RxJS is still used
where the platform genuinely requires it (Router events, `toObservable()`
bridging for guards that need to wait on a signal), but never as the
primary state container.

## Reactive Forms, not template-driven forms

Every form in the app (campaign form, WhatsApp settings, bulk import
source picker) uses `FormBuilder.group()` + `Validators`, with a consistent
`isInvalid(ctrl)` helper method and `[class.invalid]` binding pattern. One
exception: a few native `(input)`-bound fields (e.g. the "Send Test To"
mobile number in the campaign form) intentionally avoid `ngModel` to keep
the app's dependency footprint free of `FormsModule` — the whole app
imports only `ReactiveFormsModule`.

## Firebase access pattern

There is no AngularFire dependency. Every Firestore/Storage/Auth call uses
the raw `firebase` SDK via **dynamic `import()`**, inside each service
method:

```ts
const { getApps, getApp, initializeApp } = await import('firebase/app');
const { getFirestore, doc, setDoc } = await import('firebase/firestore');
const app = getApps().length ? getApp() : initializeApp(environment.firebase);
```

This keeps Firebase's SDK weight out of the initial bundle (it's only
fetched when a component that needs it actually mounts) and makes SSR safe,
since every such call is also guarded by `isPlatformBrowser(this.pid)`
before running — Firebase never executes during server-side rendering.

## Admin portal

The admin portal is **not a separate Angular application** — it's
`features/admin/`, mounted as a sibling top-level route (`/admin/**`) with
its own layout (`AdminLayoutComponent`, sidebar + topbar) instead of the
storefront's `LayoutComponent`. `app.routes.server.ts` marks the entire
`admin/**` path as `RenderMode.Client` — the API/browser-only surface never
attempts SSR, since it's gated behind Firebase Auth and reads
`localStorage`/browser-only state.

Authorization today is a single hardcoded admin email
(`AdminAuthService.ADMIN_EMAIL`), checked against the signed-in Google
account — **not** the `admin-users` Firestore collection that
`AdminUsersService`/`AdminManagementComponent` manage. That collection and
UI exist for a planned multi-admin model but aren't wired into the actual
authorization decision yet. If you're touching auth, read
[Firestore Schema](../database/firestore-schema.md#admin-users) for the
full explanation before assuming either path is "the" auth system.

## Design tokens

All visual styling reads from CSS custom properties defined once in
`web/src/styles.css` (`--maroon`, `--gold`, `--font-serif`, `--font-sans`,
`--shadow-*`, `--r-*`). See [Design System](../branding/design-system.md)
for the full palette and usage rules — never hardcode a hex color in a
component stylesheet when a token already exists for it.

## Where marketing/campaign code lives

`features/marketing/` holds the entire VIP Club → Bulk Import → Campaigns →
WhatsApp settings surface — see
[Marketing Module](../marketing/marketing-module.md) and
[Campaign Module](../marketing/campaign-module.md) for what's inside it and
why it's organized the way it is.
