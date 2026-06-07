# Welden — Agent Instructions (CLAUDE.md)

## Project Overview

Welden is an industrial B2B platform combining a marketing website, AI chatbot, CMS, and ticketing system for a conveyor idler machine manufacturer. Read the docs in this folder before starting any work.

## Documentation Map

| File | What It Contains |
|------|-----------------|
| `PRD.md` | Product requirements, scope, constraints, assumptions |
| `TECH-STACK.md` | Architecture, tech stack, infrastructure, security |
| `AI-SYSTEM.md` | Chatbot spec, RAG pipeline, KB rules, lead qualification |
| `DATA-MODELS.md` | All entity schemas, relationships, enums |
| `FEATURES.md` | Feature specs with acceptance criteria checklists |
| `TASKS.md` | Phase-based development task breakdown |
| `ADMIN-SYSTEM.md` | CMS, ticketing, dashboard, user management specs |
| `MARKETING-CONTENT.md` | All product copy, hero text, specs, descriptions |
| `DESIGN-SYSTEM.md` | UI/UX direction, colors, motion, responsive rules |
| `docs/admin-design.md` | **Admin design system** — derived spec for the admin panel (read before any admin UI change) |
| `docs/admin-ui-audit.md` | Punch list of admin UI inconsistencies graded against `admin-design.md` |

## Key Rules

1. **Scaffold first, AI fill second** — build deterministic backbone before AI features
2. **Chatbot answers only from approved KB** — never invent, hallucinate, or use world knowledge
3. **One admin system** — shared auth for CMS + ticketing
4. **Template-driven products** — new products auto-render from CMS data, no redesign needed
5. **SLA = 2 working days** — color-coded: green/amber/red
6. **Premium industrial aesthetic** — off-white/gray, clean, modern B2B
7. **AI chain server-side only** — no prompts or retrieval logic on client

## Tech Stack

- Next.js 14+ (App Router, TypeScript, strict mode)
- Tailwind CSS + shadcn/ui (admin)
- Framer Motion (animations), GSAP only if needed
- PostgreSQL + Prisma/Drizzle ORM
- Vector store for RAG (pgvector or dedicated)
- LLM API for grounded responses

## Build Order

Phase 1 → Foundation (auth, DB, admin shell)
Phase 2 → Public website
Phase 3 → CMS
Phase 4 → Ticketing + SLA
Phase 5 → AI Chatbot
Phase 6 → Intelligence layer (advisor, lead qual, KB gaps)
Phase 7 → Hardening, performance, QA

## Code Standards

- TypeScript strict, no `any` in production
- Reusable components, no duplicated product layouts
- Content-driven sections (render from data, not hardcoded)
- Server-side validation on all forms
- Audit logging on all admin actions
- Loading / empty / error states on every data component
- Rate limiting on chatbot and forms

---

## UI Standards (enforced — do not regress)

These rules were established through iterative design audits. Treat violations as bugs.

### Typography minimums

| Rule | Detail |
|------|--------|
| **No sub-12px text in public UI** | `text-[10px]` and `text-[11px]` are banned in `app/` and `components/` (excluding `components/admin/**` which intentionally uses dense text) |
| **Minimum font size** | `text-xs` (12px) is the floor for any visible label or badge |
| **Form inputs** | `field-input` must use `text-base` (16px) — prevents iOS Safari auto-zoom |
| **Section headings** | `.section-heading` and `.section-heading-dark` must include `leading-[1.15]` |
| **Hero H1** | Must use `leading-none` (1.0) minimum — never `leading-[0.9]` which clips descenders |

### Design tokens — always use variables, never raw values

```
Tracking (letter-spacing):
  --tracking-display  → -0.05em  — hero / large about headings
  --tracking-heading  → -0.04em  — section h2
  --tracking-tight    → -0.02em  — card titles, subheadings
  --tracking-normal   →  0em     — body copy
  --tracking-eyebrow  →  0.22em  — eyebrow tags, badges

Colors: always var(--color-*), never hex inline in component classes
Shadows: always var(--shadow-*), never raw box-shadow values in component classes
Radii: always var(--radius-*), never hardcoded rem values in component classes
```

### Card padding

`.card` and `.card-dark` carry **no built-in padding** — it must be added at every use site.

- Standard content card: `p-6`
- Feature/section card: `p-6 lg:p-8` or `p-8 lg:p-10`
- Compact card: `p-5`

Never use `.card` or `.card-dark` without a `p-*` class. Text touching a card border is a bug.

### Section padding

| Context | Class | px |
|---------|-------|----|
| Standard marketing section | `py-16` | 64px |
| Hero / contact section | `py-20` | 80px |
| Do not use | `py-24`, `py-28` | 96px / 112px — creates dead-space gaps |

### Bullet / dot alignment in chips

Use `items-center` (not `items-start` + `mt-0.5`) when chip content is reliably single-line.

```tsx
// Correct
<div className="flex items-center gap-2.5 ...">
  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-arc)]" />
  <span className="text-sm font-medium leading-6 ...">Label</span>
</div>

// Wrong — dot floats above cap-height due to leading gap
<div className="flex items-start gap-2.5 ...">
  <span className="mt-0.5 h-1.5 w-1.5 ..." />
  ...
</div>
```

For multi-line content: use `items-start` + `mt-1` (4px), never `mt-0.5`.

### Nav touch targets

All desktop nav links must meet 44px minimum touch target:
```tsx
<Link href="..." className="inline-flex items-center py-3 transition-colors ...">
```

### Eyebrow labels

Always use the component classes — never inline the styles:
- `.eyebrow` — amber tint, on light bg
- `.eyebrow-dark` — white/glass, on dark bg
- `.eyebrow-subtle` — navy tint, on neutral bg

### Browser verification

When verifying UI changes, do not rely on `scroll` action + `screenshot` — the Framer Motion compositor causes screenshots to go blank after scroll. Instead:
- Use `navigate` to a URL hash anchor, wait 3s, then `screenshot` immediately
- Or read computed styles via `javascript_tool` for specific property checks
- Or read the source code directly — the code is the ground truth for token/class correctness

---

## Known Technical Debt

### Machine detail page design split (`app/machines/[slug]/page.tsx`)
This page was built in a separate design pass and uses a different token system:
- Uses `text-primary` / `text-secondary` (Material Design names) instead of `var(--color-forge)` / `var(--color-muted)`
- Hardcoded border radii (`rounded-[2.2rem]`, `rounded-[2rem]`, etc.) instead of `var(--radius-*)`
- Raw shadow values instead of `var(--shadow-*)` tokens
- No `font-display` class on headings, no `eyebrow-*` component classes

**This is a full page re-skin — schedule as its own sprint, not a line-by-line fix.**
