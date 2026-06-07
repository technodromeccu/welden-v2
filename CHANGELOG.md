# Changelog

All notable changes to the Welden Industries Platform are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **Firebase data backend** — Firestore (Native, `asia-south1`) + Cloud Storage replace the JSON-file data tier. Routed through `readCollection`/`writeCollection` so all 42 API routes are unchanged. Activated by `DATA_BACKEND=firestore`; file backend remains the default.
  - Hybrid layout: single-doc per collection (`state/{name}`) for bounded/capped collections; **itemized per-document** for unbounded business records (`advisor-sessions`, `preliminary-quotations`) to avoid the Firestore 1 MB-per-doc ceiling.
  - One-shot seed migration: `npm run migrate:firestore`.
  - Firestore **Point-in-Time Recovery** enabled (7-day continuous) plus a managed export to `gs://welden-industries-backups/` (90-day lifecycle).
- **Admin Help & Guide** screen at `/admin/help` — sticky-ToC reference for user flows, terminology, roles, and FAQs. Six sections: Quick Start, Sections of the Admin, User Flows, Glossary, Roles & Permissions, FAQ. Discoverable via a Help link in the admin sidebar.

### Changed
- **Advisor model** is now `gemini-3.5-flash` (was `gemini-2.0-flash`). Sampling temperature and `thinkingLevel` are env-tunable (`GEMINI_TEMPERATURE`, `GEMINI_THINKING_LEVEL`).
- **Advisor latency** — removed brochure/KB PDF uploads through the Gemini Files API. The advisor now grounds on text only (product specs, knowledge-document `extractedText`, site sections), which already produced spec-complete answers. Per-call time drops well below Netlify's function timeout.
- **`/api/health`** now performs a real Firestore round-trip via `lib/firestore-health.ts` when `DATA_BACKEND=firestore`. The deploy gate fails fast if the backend is unreachable instead of failing silently in production.

### Security
- **SEC-01** Durable Firestore-backed rate limiter (`lib/rate-limit-store.ts`). The previous in-memory `globalThis` Map didn't hold across serverless instances — the advisor was effectively unthrottled vs. Gemini cost. `enforceRateLimit` is now async and awaited at all five call sites (advisor, contact-lead, login, forgot-password, reset-password). Buckets self-clean via a Firestore TTL policy on `expireAt`.
- **SEC-02** Replace `Math.random()` IDs with `crypto.randomUUID()` in `lib/store.ts`
- **SEC-03** Add input length caps to all validation functions to prevent oversized payload DoS
- **SEC-04** Remove hardcoded internal IP from `next.config.mjs`; read from `ALLOWED_DEV_ORIGINS` env var

### Fixed
- **Chat formatting** — both chatbots now render Markdown (headings, bold, lists, code, links) via a shared dependency-free `ChatMarkdown` component instead of showing raw `**bold**` / `*` bullets.
- **Admin copilot reply visibility** — the lead copilot no longer auto-navigates on every `open_lead` proposal (which used to reset the conversation when the lead page loaded). Replies stay in the chat window; "Open lead" is now an explicit button.
- **Admin copilot UX** — close on click-outside or Escape; auto-scroll to the newest message and the "Thinking…" indicator.
- **Advisor timeout error** — defensive `text()` + `JSON.parse` in both chat clients. A serverless timeout (HTML error page) now shows "taking longer than usual, please try again" instead of `Unexpected token '<'`.
- **Function timeout headroom** — `maxDuration = 26` on `/api/advisor/recommend` and `/api/internal-assistant` (Netlify honors it up to the plan's max).
- **CODE-01** `runLeadFollowUpSweep` now isolates errors per lead — one failed email no longer aborts the entire sweep
- **CODE-05** Quotation reference numbers in the chatbot path now use the authoritative `preliminary-quotations` count instead of a derived session count, preventing duplicate references
- **CODE-07** Data directory now respects `DATA_DIR` environment variable, falling back to `<cwd>/data`
- **Test suite** — removed five stale `detect*` tests that imported product-detection helpers the LLM intent router replaced. Suite now runs green (32 passing).
- **Lint tooling** — `brace-expansion` override pinned to `2.0.2` (CVE-patched and still exposes the `expand` export `minimatch@3.x` needs). Plus three trivial `react/no-unescaped-entities` fixes.

### Improved
- **Decomposition (Phase 3 first cuts).**
  - `ProductsMachinePagesView`: **1,719 → 822 lines** (52%). Extracted pure helpers (`product-form-helpers.ts`), the shared `FieldGroup` primitive (`product-form-fields.tsx`), asset editors (`product-asset-editors.tsx`), list editors (`product-list-editors.tsx`), the structure organizer (`product-structure-organizer.tsx`), and global/create panels (`product-panels.tsx`). Cleaned up seven now-orphaned imports.
  - `LeadsView`: **1,812 → 1,638 lines**. Extracted helpers (`leads-view-helpers.ts`) and row sub-components (`leads-view-row.tsx`).
- **DS-05** Replace text-only "Submitting…" state with a Loader2 spinner in `ConsultationForm`
- **DS-07** Advisor widget now uses `w-full sm:w-[420px]` to prevent clipping on screens narrower than 440 px

---

## [0.6.0] — 2026-03-28 · Refactor: Admin panel feature views

### Changed
- Refactored admin panel into discrete feature views for dashboard, leads, products, site content, knowledge base, quotation templates, users, and settings

---

## [0.5.0] — 2026-03-22 · Feature: Manual lead quotation & local backup downloads

### Added
- Manual quotation issuance from the admin leads panel
- Local backup downloads for data files

---

## [0.4.0] — 2026-03-17 · Feature: Backup and restore system

### Added
- Google Drive backup and restore via service account
- Encrypted secrets bundle in backup
- Manifest with per-file checksums
- CLI restore script with snapshot selection

---

## [0.3.0] — 2026-03-10 · Feature: Lead health automation and workflow updates

### Added
- SLA-driven lead follow-up sweep (Netlify scheduled function)
- First-call reminder and escalation emails
- Stale lead detection and alerts
- Lead health badge in admin dashboard

---

## [0.2.0] — 2026-03-03 · Hardening: Repo hygiene for runtime data and uploads

### Changed
- Moved runtime JSON files to `.gitignore`
- Moved user-uploaded files (`public/uploads/`) to `.gitignore`
- Seeded default data files committed to repo

---

## [0.1.0] — 2026-02-15 · Initial MVP

### Added
- Next.js 16 App Router project scaffold
- Public landing page (CMS-driven via `site-sections.json`)
- Machine detail pages with static generation
- Guided Machine Advisor chatbot widget with intent detection
- Consultation (contact) form with lead creation
- Admin panel: dashboard, leads, products, site content, knowledge base, quotations, users, settings
- Custom session auth with HMAC-signed cookies
- Brevo email integration with sandbox mode
- In-memory rate limiting on all public API endpoints
- JSON file persistence layer (`lib/store.ts`)
