# Welden Admin — UI Inconsistency Punch List

Derived alongside `docs/admin-design.md` (2026-06-07). Every item is a concrete deviation from the dominant pattern that the design doc codifies. Counts are exact greps across `components/admin/**` and `components/AdminPanel.tsx`.

Severity legend:
- 🟥 **P1** — visible inconsistency a user can perceive (different look across views).
- 🟧 **P2** — code-style inconsistency (no visible drift today, but creates drift over time).
- 🟨 **P3** — micro-inconsistency, cleanup-only.

Action column is the find/replace plan to standardize.

---

## 🟥 P1 — Visible inconsistencies

### 1. Custom radii — 23 instances
**Rule (design.md §7):** four named radii only — `rounded-full`, `rounded-2xl` (cards), `rounded-xl` (inner panels), `rounded-lg` (buttons/inputs).

**Off-pattern uses:**

| Class | Count | Files |
|---|---|---|
| `rounded-[1.5rem]` | 7 | `ProductsMachinePagesView.tsx` (5×), `product-panels.tsx`, `InternalLeadAssistant.tsx` |
| `rounded-[1.35rem]` | 6 | `InternalLeadAssistant.tsx` |
| `rounded-[1.75rem]` | 3 | `LeadsView.tsx` |
| `rounded-[2rem]` | 3 | `product-panels.tsx`, `ProductsMachinePagesView.tsx` |
| `rounded-[1.4rem]` | 2 | `LeadsView.tsx` |
| `rounded-[1.6rem]` | 1 | `LeadsView.tsx` |
| `rounded-[2.2rem]` | 1 | `ProductsMachinePagesView.tsx` |

**Action:** map each to the closest named radius.
- `[1.35rem]`, `[1.4rem]`, `[1.5rem]`, `[1.6rem]` → `rounded-2xl` (1rem) **or** `rounded-3xl` (1.5rem). Pick once per element type and document.
- `[1.75rem]`, `[2rem]`, `[2.2rem]` → modal-scope only (`InternalLeadAssistant`'s outer shell, the global-labels modal). Add `--radius-modal: 1.5rem` reference or accept as the named "modal" radius.

### 2. `text-slate-*` mixed with `text-secondary` — 16 instances
**Rule (design.md §10 Don'ts):** pick one per view; prefer `text-secondary` in admin.

**Hotspots:**

| File | Instances | Notes |
|---|---|---|
| `InternalLeadAssistant.tsx` | 8 | Heaviest offender — uses `text-slate-500/600/700/800/900` throughout. Standalone floating widget; consider isolating to its own colorway or aligning to `text-secondary`/`text-primary`. |
| `ProductsMachinePagesView.tsx` | 3 | `text-slate-400` for muted icons + empty-image placeholders. Could move to `text-secondary` (lighter via opacity). |
| `product-structure-organizer.tsx` | 1 | Status pill "Hidden" uses `text-slate-600` — should match the neutral-status pattern from §2 (`bg-slate-100 text-slate-600` IS the documented neutral pattern, so this one is OK). |

**Action:** sweep `InternalLeadAssistant.tsx` to one colorway (most likely `text-secondary` for muted, `text-on-surface` for body). Leave `text-slate-*` only where it carries the documented neutral-status meaning.

### 3. Page H1 uses `font-extrabold` instead of `font-black` — 7 instances
**Rule (design.md §3 typography):** page H1 = `text-3xl font-black tracking-tight text-primary md:text-4xl`.

**Off-pattern files:**
- `LeadsView.tsx:584` — selected lead's name
- `SiteContentView.tsx:47` — section editor title
- `KnowledgeBaseView.tsx:73, 156` — add document + edit document titles
- `AdminPanel.tsx:1192-ish` — (check) — at least one place uses `extrabold`
- 2 others in product editors

**Action:** find/replace `text-3xl font-extrabold` → `text-3xl font-black` in admin (7 places).

### 4. Letter-spacing scatter on labels — 39 instances of off-pattern value
**Rule (design.md §3):** data labels use `tracking-[0.16em]`; eyebrows use `[0.18em]` or `[0.2em]`. Don't mix within a single view.

`tracking-[0.14em]` appears **39 times** — the only systematic off-pattern value. Mostly inside `product-structure-organizer.tsx` and the leads board (boardStageThemes) where a tighter eyebrow looks subtly different.

**Action:** decide if `[0.14em]` is a legitimate "compact label" variant (then add to design.md) or standardize all 39 to `[0.16em]`. **Recommend the latter** — compact-label nuance isn't perceivable at 10px.

### 5. Card border opacity drift — 31 instances of `outline-variant/20`
**Rule (design.md §2):** card border is `border-outline-variant/15`. `/20` is for "stronger emphasis" — should be rare.

31 uses of `/20` is too many for "rare." Spot-check shows it's mostly inside product editors (file-upload zones, "tip" callouts) and FAQ/spec accordions. Acceptable for nested cards but not for top-level shells.

**Action:** audit each `/20` use. Top-level cards must use `/15`. Nested callouts can keep `/20` if it adds real emphasis, otherwise reduce.

---

## 🟧 P2 — Code-style inconsistencies

### 6. `<Card>` shell pattern not always used
Some places hand-roll the card chrome (`<div className="rounded-2xl border border-outline-variant/15 bg-white shadow-sm ...">`) instead of using the `<Card>` component.

**Reason it matters:** the design.md treats `<Card>` as the canonical wrapper. Hand-rolled cards drift over time as people tweak one without touching the others.

**Action:** convert hand-rolled card shells to `<Card>` when the JSX is moved/refactored. Not worth a dedicated sweep unless the drift becomes user-visible.

### 7. `transition-all` used where `transition-colors` would do
**Rule (design.md §8):** the admin uses `transition-colors` for hover; `transition-all` is for the Button component's press feedback only.

4 instances of `transition-all` outside Button — small, but means hover animates unrelated properties (transforms, opacity changes).

**Action:** scan and downgrade to `transition-colors` where animation of layout properties isn't intended.

### 8. Generous-padding (`p-6`, `p-8`) cards used inconsistently
**Rule (design.md §4):** card padding is `p-5` default, `p-6` for forms, `p-4` for compact.

Right now `p-5` (16 uses), `p-6` (8), `p-4` (5) are spread without clear pattern. Some forms use `p-5`, some KPI tiles use `p-6`.

**Action:** for each card, classify as default/form/compact and snap to the right padding.

---

## 🟨 P3 — Cleanup-only

### 9. Bare `<button>` for icon-only actions — heuristic flagged some
Most icon-only `<button>` elements in admin **do** carry `aria-label` (drag handles, close-X, dropdown triggers). A handful in `InternalLeadAssistant.tsx` and the close-X buttons inside modals are missing it.

**Action:** sweep close/dismiss icon buttons and add `aria-label="Close"` (or equivalent) where missing.

### 10. `text-[11px]` used in places that aren't eyebrows
**Rule (design.md §3):** `text-[11px]` is only for eyebrow labels.

A handful of body / description elements use `text-[11px]` in product editor sub-panels. Below the accessibility threshold for body copy.

**Action:** find/replace body `text-[11px]` → `text-xs` (12px) when not an uppercase label.

---

## State-coverage spot-checks (not exhaustive — to be done manually)

These need human-eye verification. Marked as "to verify":

| Pattern | Where to look | Why |
|---|---|---|
| **Loading states on async actions** | Every `<Button onClick={async ...}>` | Some have spinner, some don't. Inconsistent feels half-finished. |
| **Empty states** | Every list / table / collection view | Currently most show "No X yet" inline; some show nothing. |
| **Error states** | Every fetch in `useAdminApi` | Errors throw via the `api()` helper; UI typically shows toast/notice, but some views silently swallow. |
| **Confirm-before-destructive** | Delete actions in products / KB / users / quotation templates | Some have inline confirm; some just delete on click. |
| **Disabled-button feedback** | All form save buttons | Some show `disabled:opacity-50`, some don't. |
| **Focus rings on keyboard nav** | All interactive elements | Tailwind defaults are decent but custom buttons sometimes strip them. |

---

## Suggested execution order

If you want to do these as small PRs:

1. **PR-A** (mechanical, zero behavior risk): items 3 (H1 font-black) + 4 (tracking-[0.16em] sweep) + 10 (text-[11px] body bump). ~50 lines of find/replace.
2. **PR-B** (mechanical, low risk): item 1 (custom radii → named). ~23 changes; visual diff per-element.
3. **PR-C** (small visual judgment per item): items 2 (slate-* → secondary) + 5 (outline-variant/20 → /15). Needs eye on each.
4. **PR-D** (refactor): item 6 (hand-rolled cards → `<Card>`). Only when those files are otherwise being touched.
5. **PR-E** (per-view state audit): the state-coverage table above — one view at a time, each its own PR.

Each of the mechanical PRs should be **a single commit** for easy revert, and each visual judgment PR should include screenshots of the before/after.
