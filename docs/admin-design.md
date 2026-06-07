---
name: welden-admin
scope: "The admin panel (everything under /admin and the AdminPanel shell). The public marketing site uses a separate token system documented in app/globals.css and is out of scope."
colors:
  # ── Surfaces ─────────────────────────────────────
  surface-bright:    "#ffffff"     # default card background
  surface:           "#f8f7f4"     # page background (warm off-white)
  surface-container-lowest: "#ffffff"
  surface-container-low:  "#f3f2ee"
  surface-container:      "#eeede8"
  surface-container-high: "#e8e7e2"
  # ── Text ─────────────────────────────────────────
  on-surface:        "#1a1a1a"     # primary text on light bg (alias: text-on-surface)
  primary-text:      "#2d5282"     # branded text + numbers (alias: text-primary)
  secondary-text:    "#4b5563"     # secondary text, eyebrow labels (alias: text-secondary)
  # ── Borders ──────────────────────────────────────
  outline-variant:   "#d1cfc9"     # default border (used at /15 opacity)
  outline:           "#9ca3af"     # stronger border (rare)
  # ── Primary fill ─────────────────────────────────
  primary:           "#2d5282"     # solid CTA fills
  primary-fixed:     "#dbeafe"     # tinted bg (used at /20-/40 opacity)
  on-primary:        "#ffffff"     # text on primary fills
  # ── Status (semantic) ────────────────────────────
  warning-700:       "#b45309"     # amber-700 — warning text
  warning-50:        "#fffbeb"     # amber-50  — warning surface
  success-700:       "#15803d"     # emerald-700 — success text
  success-50:        "#ecfdf5"     # emerald-50  — success surface
  danger-500:        "#f43f5e"     # rose-500   — destructive action accent
  danger-50:         "#fff1f2"     # rose-50    — destructive hover surface
  info-900:          "#0c4a6e"     # sky-900    — info text
  info-50:           "#f0f9ff"     # sky-50     — info surface
typography:
  page-h1:
    fontFamily: "{font.display}"
    fontSize: "1.875rem"        # text-3xl
    fontSize-md: "2.25rem"      # text-4xl on md+
    fontWeight: 900             # font-black
    letterSpacing: "-0.025em"   # tracking-tight
    color: "{colors.primary-text}"
  page-eyebrow:
    fontSize: "0.6875rem"       # text-[11px]
    fontWeight: 700             # font-bold
    textTransform: "uppercase"
    letterSpacing: "0.2em"      # tracking-[0.2em]
    color: "{colors.secondary-text}"
  card-title:
    fontFamily: "{font.display}"
    fontSize: "1.125rem"        # text-lg
    fontSize-md: "1.5rem"       # text-2xl  (when card stands alone)
    fontWeight: 800             # font-extrabold (or 900 font-black on standalone)
    letterSpacing: "-0.025em"
    color: "{colors.primary-text}"
  card-label:
    fontSize: "0.625rem"        # text-[10px]
    fontWeight: 700             # font-bold
    textTransform: "uppercase"
    letterSpacing: "0.16em"     # tracking-[0.16em]
    color: "{colors.secondary-text}"
  stat-number:
    fontFamily: "{font.display}"
    fontSize: "2.25rem"         # text-4xl
    fontWeight: 900             # font-black
    letterSpacing: "-0.025em"   # tracking-tight
    color: "{colors.primary-text}"
  body:
    fontSize: "0.875rem"        # text-sm
    lineHeight: "1.5"           # leading-6 default
    color: "{colors.secondary-text}"
  body-on-surface:
    fontSize: "0.875rem"
    lineHeight: "1.5"
    color: "{colors.on-surface}"
  data:
    fontSize: "1rem"            # text-base
    color: "{colors.on-surface}"
  micro:
    fontSize: "0.75rem"         # text-xs
    color: "{colors.secondary-text}"
rounded:
  pill:   "9999px"   # full radius — badges, status dots, avatars, pill buttons
  modal:  "1.5rem"   # rounded-3xl — modal shells, floating panels, large surfaces
  card:   "1rem"     # rounded-2xl — primary card shell (canonical)
  inner:  "0.75rem"  # rounded-xl — inner panels, list rows, content tiles
  button: "0.5rem"   # rounded-lg — buttons, inputs, dropdowns
spacing:
  # Strict 8pt grid (4pt only for fine-tuning inside compact components).
  card-pad:         "1.5rem"     # p-6    — DEFAULT CardContent padding
  card-pad-form:    "2rem"       # p-8    — form-heavy cards (editor panels)
  card-pad-compact: "1rem"       # p-4    — list rows, micro tiles
  gap-row:          "0.5rem"     # gap-2  — chip / pill rows
  gap-tight:        "0.75rem"    # gap-3  — most form fields, button rows (4pt fine-tune)
  gap-section:      "1rem"       # gap-4  — multi-card grids
  stack-section:    "1.5rem"     # space-y-6 — between major card groups
  stack-large:      "2rem"       # space-y-8 — between major page sections
shadows:
  card:  "0 1px 2px rgba(10,22,40,0.05)"   # shadow-sm — the canonical card shadow
components:
  card:
    bg: "{colors.surface-bright}"
    border: "border border-outline-variant/15"
    radius: "{rounded.card}"
    shadow: "{shadows.card}"
    contentPadding: "{spacing.card-pad}"
  stat-tile:
    bg: "{colors.surface-bright}"
    border: "border border-outline-variant/15"
    radius: "{rounded.card}"
    shadow: "{shadows.card}"
    contentPadding: "{spacing.card-pad}"
    label: "{typography.card-label}"
    number: "{typography.stat-number}"
    description: "{typography.body}"
  status-badge-warning:
    bg: "{colors.warning-50}"
    text: "{colors.warning-700}"
    border: "border-amber-200/80"
  status-badge-success:
    bg: "{colors.success-50}"
    text: "{colors.success-700}"
    border: "border-emerald-200/80"
  status-badge-info:
    bg: "{colors.info-50}"
    text: "{colors.info-900}"
    border: "border-sky-200/80"
  status-badge-danger-action:
    hoverBg: "{colors.danger-50}"
    hoverText: "{colors.danger-500}"
motion:
  hover-color: "transition-colors duration-150"
  button-press: "transition-all duration-150 active:scale-[0.97]"
---

# Welden Admin — Design System

This is a **derived** spec — codified from what the admin currently does, not aspirational. The goal is consistency, not redesign. The public marketing site uses a parallel token system in `app/globals.css` (forge/steel/iron/arc) and is out of scope here.

> **Where the tokens live.** The values above are already defined as CSS custom properties in `app/globals.css` under the "Semantic (kept for compatibility)" block. The admin reads them via Tailwind utilities like `bg-surface-container-low`, `text-secondary`, `border-outline-variant`. This document is the spec for *which* of those values to use *when*.

---

## 1. Visual Theme & Atmosphere

The Welden admin is a **dense, neutral, data-forward operations console**. Premium B2B feeling — calm, light, low-chrome. Not a marketing surface; signals are conveyed by typography, spacing, and small status colors rather than imagery.

- **Surface palette is warm off-white.** Page background `#f8f7f4`, cards `#ffffff`. No dark mode currently.
- **Text leans dark blue, not pure black.** Primary `#2d5282`, body `#1a1a1a`, secondary `#4b5563`.
- **Color is information, not decoration.** Amber, emerald, rose, sky each carry a specific meaning (warning / success / danger / info). Never decorative.
- **Everything sits inside cards.** Almost every admin view is a stack of `border + white bg + shadow-sm + rounded-2xl` tiles. No bare content on the page background.

---

## 2. Color Palette & Roles

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `surface` | `#f8f7f4` | Page background. Set on `<body>`; do not repeat. |
| `surface-bright` | `#ffffff` | **The card background.** Used everywhere a tile sits on the page. |
| `surface-container-low` | `#f3f2ee` | Light tint inside a card (callout boxes, secondary panels). |
| `surface-container` | `#eeede8` | Mid tint — avatar plates, hover backdrops. |
| `surface-container-high` | `#e8e7e2` | Strong tint — pressed states. |

### Text
| Token | Hex | Use |
|---|---|---|
| `on-surface` | `#1a1a1a` | Primary text on white cards. |
| `text-primary` | `#2d5282` | Branded numbers, large headings, action labels. |
| `text-secondary` | `#4b5563` | Secondary text, descriptions, eyebrow labels, body copy. **The default body color in the admin.** |

### Borders
| Token | Hex | Use |
|---|---|---|
| `outline-variant` (used at `/15`) | `#d1cfc9` × 0.15 alpha | **The canonical card border.** `border-outline-variant/15` is the only opacity to use on cards. |
| `outline-variant/12` | … × 0.12 | List-row dividers inside a card. |
| `outline-variant/20` | … × 0.20 | Stronger emphasis (use sparingly — see Don'ts). |

### Status (semantic — never decorative)
| Meaning | Text | Background | Border |
|---|---|---|---|
| **Warning** (attention, overdue, callbacks committed) | `amber-700` `amber-900` | `amber-50` `amber-100` | `amber-200/80` |
| **Success** (won, qualified, healthy, configured) | `emerald-700` `emerald-800` | `emerald-50` | `emerald-200/80` |
| **Danger** (destructive action) | `rose-500` `rose-700` | `rose-50` (hover) | `rose-200` |
| **Info** (scheduled, callbacks today, neutral facts) | `sky-900` | `sky-50` `sky-100` | `sky-200/80` |
| **Neutral** (unpublished, lost, secondary) | `slate-500` `slate-600` | `slate-50` `slate-100` | `slate-200` |

### Stage themes (Kanban lanes)
The leads board uses **eight stage-specific themes** in `leads-view-helpers.ts → boardStageThemes`. Each lane has its own `lane` / `laneActive` / `dot` / `accentText` / `cardGlow` set. These are **legitimate sub-system colors** — sky, amber, cyan, indigo, emerald, orange, slate — used **only for that board**. Do not import them elsewhere.

---

## 3. Typography Rules

### Hierarchy (use these exactly)
| Role | Class string | Notes |
|---|---|---|
| **Page H1** (view title) | `text-3xl font-black tracking-tight text-primary md:text-4xl` | Always at the top of a view header block. |
| **Page eyebrow** (above H1) | `text-[11px] font-bold uppercase tracking-[0.2em] text-secondary` | Section eyebrows: `[10px]` + `tracking-[0.18em]`. |
| **Card title** | `text-lg font-bold` (inside `<CardTitle>`) | Single-card views can promote to `text-2xl font-black tracking-tight text-primary`. |
| **Card label** (uppercase mini-headline) | `text-[10px] font-bold uppercase tracking-[0.16em] text-secondary` | Dominant pattern (91 uses). |
| **Stat number** (KPI) | `text-4xl font-black tracking-tight text-primary` | For dashboard tiles. Reduce to `text-2xl` in compact tiles. |
| **Body** | `text-sm text-secondary` | The 213-occurrences-strong default. |
| **Body on surface** (denser reads) | `text-sm leading-6 text-on-surface` | When the body needs to read as primary. |
| **Data value** | `text-base` (no weight needed unless emphasized) | For form fields, table cells with real values. |
| **Micro / footnote** | `text-xs text-secondary` | Help text under inputs, timestamp suffixes. |

### Banned in admin
- `text-[10px]` outside of labels — body should never go below `text-xs`.
- `text-[11px]` for body — only acceptable for eyebrow labels.
- `font-medium` — admin is bold or semibold; medium creates ambiguity.

### Font families
- **DM Sans** (`font-display`) — display + headlines.
- **Inter** (`font-body`) — body, labels, data. The default.
- **JetBrains Mono** (`font-mono`) — reserved for code-like content (currently rare in admin).

---

## 4. Component Stylings

### Card (the canonical shell — used everywhere)
```tsx
<Card className="border border-outline-variant/15 bg-white shadow-sm">
  <CardContent className="p-5">
    {/* content */}
  </CardContent>
</Card>
```
- **Border**: `border border-outline-variant/15` — single source of truth.
- **Background**: `bg-white` (the `surface-bright` token).
- **Shadow**: `shadow-sm` (the only card shadow — 78 uses across the admin).
- **Radius**: `rounded-2xl` (the default from `<Card>`; if missing it implicitly).
- **Content padding**: `p-5` default, `p-6` for form-heavy panels, `p-4` for compact list rows.

### Stat tile
```tsx
<Card className="border border-outline-variant/15 bg-white shadow-sm">
  <CardContent className="p-5">
    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Pipeline intake</div>
    <div className="mt-3 text-4xl font-black tracking-tight text-primary">{count}</div>
    <div className="mt-2 text-sm text-secondary">{description}</div>
  </CardContent>
</Card>
```

### Status badge (info example)
```tsx
<Badge variant="outline" className="border-sky-200/80 bg-sky-50 text-sky-900">
  Scheduled
</Badge>
```
Swap the color triplet (`amber-*`, `emerald-*`, `rose-*`, `sky-*`, `slate-*`) per the **Status** table above. Always border + bg + text together.

### Eyebrow label (uppercase mini-heading)
```tsx
<div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
  Today's queue
</div>
```
For variants in size, prefer `text-[11px] tracking-[0.18em]` or `text-[11px] tracking-[0.2em]`. **Pick one per view, never mix two letter-spacings.**

### Button (use the Button component, not raw `<button>`)
- **Default**: the filled primary look — for the main action in a panel.
- **`variant="outline"`** (50 uses) — for secondary actions, by far the most-used in admin.
- **`variant="ghost"`** — for tertiary actions inside dense panels.
- Raw `<button>` is acceptable only for icon-only actions inside list rows (e.g. drag handles, delete-row, dropdown triggers) — and those should always have an `aria-label`.

### Form input
```tsx
<Input placeholder="…" value={…} onChange={…} />
```
Use the `<Input>` and `<Textarea>` components — they already encode the right border, radius, focus ring, and padding. Direct `<input>` in admin is acceptable only for `type="file"` with `className="hidden"` paired with a styled label.

### Destructive action (icon button)
```tsx
<button
  type="button"
  onClick={onRemove}
  className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-rose-50 hover:text-rose-500"
  aria-label="Remove"
>
  <Trash2 className="h-4 w-4" />
</button>
```
- Idle: `text-secondary`.
- Hover: `bg-rose-50 text-rose-500`.
- **`aria-label` is mandatory** for icon-only buttons.

---

## 5. Layout Principles

### Spacing scale — strict 8pt grid (4pt fine-tune only inside compact components)
| Use | Class | Pixels |
|---|---|---|
| Chip-row spacing | `gap-2` | 8 |
| Form-field row spacing | `gap-3` | 12 (4pt fine-tune — exception) |
| Grid-card gap | `gap-4` | 16 |
| Section stack | `space-y-6` | 24 |
| Major page section stack | `space-y-8` | 32 |
| Card content padding (default) | `p-6` | 24 |
| Card content padding (form-heavy) | `p-8` | 32 |
| Card content padding (compact list rows) | `p-4` | 16 |

**Banned:** any `*-5`, `*-7`, `*-9` spacing utility — these are off the 8pt grid. PR Phase-1.1 (2026-06-07) swept all 75 such instances in admin to the nearest on-grid value.

### Page header pattern
```tsx
<div>
  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">{eyebrow}</div>
  <h1 className="mt-2 text-3xl font-black tracking-tight text-primary md:text-4xl">{title}</h1>
  <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">{description}</p>
</div>
```

### Grid breakpoints
Welden admin uses Tailwind's default breakpoints. The admin sidebar collapses at `lg:`; main content uses `lg:ml-72` to clear the sidebar. Multi-card grids are `grid gap-4 md:grid-cols-2 xl:grid-cols-4` or `lg:grid-cols-[1.18fr_0.82fr]` for left-heavy split views.

---

## 6. Depth & Elevation

The admin uses **one shadow value**: `shadow-sm`. That is intentional — depth comes from the border + tint, not from layered shadows.

- **`shadow-sm`** — every card. 78 uses.
- **`shadow-md`** — reserved for floating UI (the lead copilot panel, modals, dropdown popovers).
- **`shadow-lg`+** — banned in admin. (The public site uses these; the admin doesn't need them.)

---

## 7. Shapes (Radii)

| Element | Radius class | Token |
|---|---|---|
| Avatar, dot, pill, status circle | `rounded-full` | `pill` |
| **Modal shell, floating panel, large container** | `rounded-3xl` | `modal` (1.5rem) |
| Card (the shell) | `rounded-2xl` | `card` (1rem) |
| Inner panel, list row, content tile | `rounded-xl` | `inner` (0.75rem) |
| Button, input, dropdown menu | `rounded-lg` | `button` (0.5rem) |

**Custom radii are banned** (`rounded-[1.35rem]`, `rounded-[1.5rem]`, etc.). PR-B (2026-06-07) collapsed all 23 prior custom values to `rounded-3xl`. Anything larger or smaller than these five named values should not appear in the admin.

---

## 8. Motion

The admin uses three motion patterns:

| Pattern | Class | When |
|---|---|---|
| Hover on text/icon buttons | `transition-colors` | The default for hover-only color changes (78%+ of motion uses). |
| Press feedback on buttons | `transition-all active:scale-[0.97]` | Built into the `Button` component. |
| Multi-property animation | `transition-all duration-200` | When **multiple style properties** animate together (drag-state changes, device-preview resize, board-lane focus). Legitimate use of `transition-all` because layout properties (max-width, transform) need to be animated alongside colors. |

`transition-all` for hover-only color changes is overkill — use `transition-colors` instead.

### Interaction states — required on every interactive element

Every clickable element (button, link, tab, icon trigger) must have **all four states** covered.

| State | Visible cue | How to ship it |
|---|---|---|
| **Idle** | Default styling + **pointer cursor on hover** | The base classes. Cursor is **handled globally** in `app/globals.css` — every `<button>` and `[role="button"]` gets `cursor: pointer` (overriding Tailwind's reset which would leave them at `cursor: default`). Disabled buttons get `cursor: not-allowed`. For non-button clickable elements (clickable cards, draggable rows), keep the `cursor-pointer` utility; for drag handles use `cursor-grab` / `cursor-grabbing`. |
| **Hover (mouse)** | Visible change — bg shift, color shift, or border emphasis | A `hover:` utility. Required on raw `<button>`/`<a>` and on the **inactive branch** of any toggle. |
| **Focus (keyboard)** | A visible ring around the element | **Handled globally** — `:focus-visible` in `app/globals.css` adds a 2px iron-navy outline to every focusable element. Do not strip it; if a specific element needs a different focus look, override locally rather than removing the global rule. |
| **Disabled** | Reduced opacity, no pointer events, **`not-allowed` cursor** | The `Button` component already encodes `disabled:opacity-50 disabled:pointer-events-none`. The cursor part is global. Raw `<button>` elements that can be disabled must add the opacity rule. |

The `Button` component covers all four states automatically. Raw `<button>` / `<a>` only need the **hover** rule from the table — focus is global, disabled is added when relevant.

#### Canonical hover patterns (use these)

| Element type | Idle | Hover |
|---|---|---|
| Icon-only button (drag handle, eye, X) | `text-secondary` | `hover:bg-surface-container-low hover:text-primary` |
| Destructive icon (Trash2, X-remove) | `text-secondary` | `hover:bg-rose-50 hover:text-rose-500` |
| Tab toggle — inactive branch | `text-secondary` | `hover:text-primary` (no bg change — the active branch's bg is what differentiates) |
| Filter pill — inactive branch | `bg-slate-100 text-slate-600` | `hover:bg-slate-200 hover:text-on-surface` |
| Text link / anchor | `text-secondary` or `text-on-surface` | `hover:text-primary` or `hover:underline` |

#### Don'ts

- ❌ Don't write a toggle pattern where the inactive branch has no hover (`cn(active ? "..." : "text-secondary")` is missing feedback — make it `"text-secondary hover:text-primary"`).
- ❌ Don't add `outline: none` / `focus:outline-none` without replacing it with a visible focus indicator. The global `:focus-visible` rule already covers all interactive elements; stripping it locally breaks keyboard accessibility.
- ❌ Don't use `:focus` (always-on) where `:focus-visible` (keyboard-only) is appropriate — `:focus` shows rings on mouse clicks too, which feels noisy.

No entrance animations, no skeleton shimmer beyond what the Loader2 spinner provides. The admin is utilitarian by design.

---

## 9. Responsive Behavior

- **Mobile (default)**: single column, full-width cards.
- **`md:` (≥768px)**: 2-column grids start; page H1 promotes from `text-3xl` to `text-4xl`.
- **`lg:` (≥1024px)**: sidebar appears (`lg:ml-72` on main); 3-column grids appear in dashboards.
- **`xl:` (≥1280px)**: 4-column stat grids; split-view detail panels.

The admin assumes a desktop user. Mobile is supported but is not the primary target.

---

## 10. Do's and Don'ts

### Do
- ✅ Use `<Card>` + `<CardContent className="p-5">` for every tile.
- ✅ Use `border border-outline-variant/15` as the canonical card border.
- ✅ Use `text-secondary` as the default body color (not `text-slate-500` or `text-slate-600`).
- ✅ Use `tracking-[0.16em]` for data labels, `tracking-[0.18em]` or `[0.2em]` for eyebrows — but **one value per view**.
- ✅ Use the `Button` component with `variant="outline"` for most secondary actions.
- ✅ Pair status-color triplets together (`bg-amber-50 + text-amber-700 + border-amber-200/80`) — never just one.

### Don't
- ❌ Don't introduce custom radii (`rounded-[1.5rem]` etc.) — use the four named ones.
- ❌ Don't use `text-slate-*` and `text-secondary` in the same view — pick one per view and stick to it (preferably `text-secondary`).
- ❌ Don't mix letter-spacing values within a single view (`tracking-[0.14em]` + `tracking-[0.16em]` + `tracking-[0.18em]` for the same kind of label).
- ❌ Don't use `font-medium` — the admin is bold or semibold.
- ❌ Don't reach for `shadow-md` or `shadow-lg` on cards — only floating UI (modals/popovers) get those.
- ❌ Don't use status colors decoratively — amber means warning, not "looks nice here".
- ❌ Don't put raw `<button>` for anything except icon-only actions — and even then, always with `aria-label`.

---

## 11. Agent Prompt Guide

When asked to build, modify, or review an admin component:

> Read `docs/admin-design.md`. The admin uses warm off-white `#f8f7f4` page background, white cards with `border border-outline-variant/15 shadow-sm rounded-2xl` and `p-5` content padding. Text is `text-secondary` for body, `text-primary` for branded numbers and large headings, `text-on-surface` for dense data. Status colors are amber/warning, emerald/success, rose/danger, sky/info — always used as bg+text+border triplets. Use the `<Card>`, `<Button variant="outline">`, `<Input>`, `<Textarea>`, `<Badge>` components from `components/ui/`. Eyebrow labels are `text-[10px] font-bold uppercase tracking-[0.16em] text-secondary`. Use `rounded-2xl` for cards, `rounded-xl` for inner panels, `rounded-lg` for buttons/inputs, `rounded-full` for pills. Do not invent radii. Do not use `text-slate-*` if `text-secondary` is available.

When asked to audit an admin view, use the punch list in `docs/admin-ui-audit.md` as the rubric.

---

## Change log
- **2026-06-07** — Initial extraction from existing admin code. Derived (not aspirational); reflects the dominant patterns across `components/admin/**` and `components/AdminPanel.tsx`.
