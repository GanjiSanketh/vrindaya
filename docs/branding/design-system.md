# Design System

Single source of truth: `web/src/styles.css`. Every component stylesheet
should reference these CSS custom properties — never hardcode a hex color,
font stack, shadow, or border radius that already has a token.

## A naming note you need before touching colors

`styles.css`'s header comment says the palette is "White · Deep Wine
Maroon · Soft Gold," and the CSS variable is literally named `--maroon`
— but its value, `#0f6f84`, is teal, and the variable's own inline comment
says so (`/* Vrindaya brand teal */`). The brand evidently moved from
maroon to teal at some point and the variable names were never renamed to
match. **`--maroon` means teal in this codebase.** Don't "fix" this by
introducing a differently-named teal token alongside it — that would
create two names for the same color and fracture the palette. If a full
rename is ever done, it must touch every component stylesheet in one pass
(a `grep -rl 'var(--maroon' web/src` first, to know the blast radius) —
see [Roadmap](../roadmap/roadmap.md) for whether this is planned.

## Color palette

| Token | Value | Use |
| --- | --- | --- |
| `--cream` / `--white` | `#ffffff` | Page/card backgrounds |
| `--cream-light` | `#fafafa` | Subtle section backgrounds |
| `--cream-mid` | `#f0f0f0` | Dividers, subtle fills |
| `--maroon` | `#0f6f84` (teal — see above) | Primary brand color: links, active states, primary buttons |
| `--maroon-dark` | `#0b5868` | Hover/pressed states, deep accents |
| `--maroon-mid` | `#4d95a5` | Secondary emphasis, icons |
| `--maroon-light` | `#e6f4f7` | Tinted backgrounds behind brand-colored content (badges, highlighted rows) |
| `--gold` | `#c9a54c` | Luxury accent: section labels, italic script text, dividers, ornaments — never large fills |
| `--gold-light` | `#e8d5a3` | Lighter gold accent |
| `--gold-pale` | `#faf5e8` | Pale gold background tint |
| `--text` | `#222222` | Primary body/heading text |
| `--text-muted` | `#666666` | Secondary text, descriptions |
| `--text-light` | `#999999` | Tertiary/disabled text |
| `--border` | `#eaeaea` | Hairline borders |

## Typography

- `--font-serif: 'Cormorant Garamond', Georgia, serif` — every heading
  (`h1`–`h5` globally), plus the italic "script" accent text
  (`.section-script`) used above section titles for a luxury,
  editorial feel.
- `--font-sans: 'DM Sans', system-ui, sans-serif` — body text, buttons,
  form inputs, the uppercase `.section-label` eyebrow text.

Section titles use `clamp(2rem, 4.5vw, 3.5rem)` — fluid type scaling
between a fixed floor and ceiling rather than fixed breakpoint jumps.
Follow this pattern for any new large heading rather than adding a new
media-query breakpoint.

## The section header pattern

Nearly every homepage section (`components/`) and several admin pages
repeat the same header structure — reuse these classes rather than
re-deriving the look:

```html
<div class="section-header">
  <span class="section-label">Curated Collection</span>
  <h2 class="section-title">New Arrivals</h2>
  <span class="section-rule"></span>
  <p class="section-desc">Optional supporting copy, centered, max 520px.</p>
</div>
```

- `.section-label` — gold, uppercase, letter-spaced eyebrow text above the
  title.
- `.section-title` — serif, fluid-sized, the actual heading.
- `.section-script` — optional italic serif accent line (used instead of,
  or alongside, `.section-label` in a few sections for extra warmth).
- `.section-rule` — a centered gold divider line with fade-out edges via
  `::before`/`::after` pseudo-elements.
- `.section-desc` — muted, centered, width-capped supporting paragraph.

## Shadows and radii

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-sm` | `0 2px 12px rgba(0,0,0,0.06)` | Cards at rest |
| `--shadow-md` | `0 8px 30px rgba(0,0,0,0.10)` | Cards on hover, dropdowns |
| `--shadow-lg` | `0 16px 48px rgba(0,0,0,0.14)` | Modals, the exit-intent popup |
| `--r-sm` | `6px` | Inputs, small buttons |
| `--r-md` | `12px` | Cards |
| `--r-lg` | `20px` | Large panels, modals |
| `--r-pill` | `50px` | Pill-shaped buttons/badges |

Shadows are deliberately **neutral gray**, not tinted with the brand
teal — this was a conscious choice (see the CSS comment
`/* neutral, not maroon-tinted */`) to keep elevation cues subtle against
the cream/white backgrounds rather than adding more color.

## Spacing and layout utilities

- `.container-vr` — `max-width: 1280px; margin: 0 auto; padding: 0 2rem;`
  — the app's one content-width wrapper; every top-level section uses it
  rather than defining its own max-width.
- `.section-pad` / `.section-pad-lg` / `.section-pad-sm` — vertical
  section spacing at three sizes (`2.5rem`, `3rem`, `1.5rem` top+bottom).
  Pick one of these three rather than a one-off padding value so vertical
  rhythm stays consistent down the page.

## Motion

`--transition: all 0.3s ease` is the one transition timing used almost
everywhere (hovers, the ribbon's slide-in, modal fades). Introducing a
different duration/easing for a new interactive element should be a
deliberate choice (e.g. a snappier `0.15s` for a toggle), not an
accidental default.

## Iconography

Inline SVGs, not an icon font or icon component library — see
`.lotus-icon` for the pattern (a `color: var(--gold)` SVG sized
`32px × 32px`, used as a section ornament). New icons should follow the
same inline-SVG-with-currentColor approach so they inherit token colors
automatically.

## Applying this to new components

1. Never write a literal hex value in a component's `.css`/`.scss` file —
   if the color you need isn't a token, that's a signal to ask whether it
   should be (a genuinely new brand color) or whether an existing token
   already covers the intent.
2. Reuse `.section-header`/`.container-vr`/`.section-pad*` before writing
   new layout CSS for a homepage section.
3. Match the serif-for-headings / sans-for-everything-else split — don't
   introduce a third font family.
