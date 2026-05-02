# Upgrade Tracker

Tracks every upgrade item from the April 2026 platform audit.
Update this file whenever an item ships — then update [ROADMAP.md](./ROADMAP.md) and add an entry to [CHANGELOG.md](./CHANGELOG.md).

**How to update:** Change the Status cell, add a "Done in" commit/version note, and move the item to the Completed section at the bottom.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| Backlog | Not yet started |
| In Progress | Actively being worked |
| Done | Shipped |
| Blocked | Waiting on dependency or decision |
| Deferred | Consciously pushed to a later sprint |

---

## TIER 1 — Critical (Pre-launch blockers)

| ID | Area | Item | Status | Notes |
|----|------|------|--------|-------|
| SEC-01 | Security | Add auth / CAPTCHA to public Advisor API (`/api/advisor/recommend`) | Backlog | Design decision needed: signed session token vs CAPTCHA vs API key |
| SEC-02 | Security | Replace `Math.random()` IDs with `crypto.randomUUID()` in `lib/store.ts` | Done | |
| SEC-03 | Security | Add input length caps (name ≤ 120, email ≤ 254, phone ≤ 30, message ≤ 2000) | Done | |
| SEC-04 | Security | Remove hardcoded IP `192.168.22.192` from `next.config.mjs` | Done | Reads `ALLOWED_DEV_ORIGINS` env var instead |

---

## TIER 2 — High Priority

| ID | Area | Item | Status | Notes |
|----|------|------|--------|-------|
| ARCH-01 | Architecture | Migrate JSON file storage to hosted database (Supabase / Firebase) | Backlog | Largest scope item; plan separately |
| ARCH-02 | Architecture | Migrate uploads from `public/uploads/` to object storage (R2 / S3) | Backlog | Depends on ARCH-01 infra decision |
| FEAT-01 | Feature | Password reset email flow for admin users | Backlog | Resend integration already available |
| FEAT-02 | Feature | System-wide audit log for all admin write operations | Backlog | |
| PERF-01 | Performance | Paginate `getAdvisorSessions()` — server-side limit/offset | Backlog | |
| CODE-03 | Code quality | File write locking (`proper-lockfile`) to prevent concurrent data loss | Backlog | Stop-gap until ARCH-01 |

---

## TIER 3 — Design System

| ID | Area | Item | Status | Notes |
|----|------|------|--------|-------|
| DS-01 | Design | Standardise all buttons to use `components/ui/Button` | Backlog | |
| DS-02 | Design | Unify form input styling: ring-based throughout | Backlog | |
| DS-03 | Design | Define named border-radius scale in Tailwind config | Backlog | |
| DS-04 | Design | Define named shadow tokens (card, modal, float) | Backlog | |
| DS-05 | Design | Add Loader2 spinner in ConsultationForm submit button | Done | |
| DS-06 | Design | Standardise uppercase letter-spacing to 0.22em | Backlog | |
| DS-07 | Design | Fix advisor widget mobile width — `w-full sm:w-[420px]` | Done | |
| DS-08 | Design | Add inline validation feedback to ConsultationForm | Backlog | |
| DS-09 | Design | WCAG AA color contrast audit and fixes | Backlog | |

---

## TIER 4 — Feature Upgrades

| ID | Area | Item | Status | Notes |
|----|------|------|--------|-------|
| FEAT-03 | Feature | Real LLM integration for Advisor (RAG via Claude API) | Backlog | Phase 5 per CLAUDE.md build order |
| FEAT-04 | Feature | Semantic/vector search for knowledge base (pgvector / Pinecone) | Backlog | Depends on ARCH-01 |
| FEAT-05 | Feature | Lead round-robin or skill-based assignment | Backlog | |
| FEAT-06 | Feature | Quotation expiry date field and enforcement | Backlog | |
| FEAT-07 | Feature | Email log cleanup job (prune entries > 90 days) | Backlog | |
| FEAT-08 | Feature | Email verification on new admin account creation | Backlog | |
| FEAT-09 | Feature | Error tracking integration (Sentry or equivalent) | Backlog | |
| FEAT-10 | Feature | Server-side global lead search in admin panel | Backlog | |

---

## TIER 5 — Code Quality

| ID | Area | Item | Status | Notes |
|----|------|------|--------|-------|
| CODE-01 | Code quality | Per-lead error isolation in `runLeadFollowUpSweep` | Done | |
| CODE-02 | Code quality | Add Zod schema validation to all API request bodies | Backlog | |
| CODE-04 | Code quality | Read SLA constants from Settings instead of hardcoded values | Backlog | |
| CODE-05 | Code quality | Fix quotation reference numbers — use preliminary-quotations count | Done | |
| CODE-06 | Code quality | Standardise API error response format across all routes | Backlog | |
| CODE-07 | Code quality | Respect `DATA_DIR` environment variable in `lib/store.ts` | Done | |

---

## Completed

| ID | Item | Version / Commit | Date |
|----|------|-----------------|------|
| SEC-02 | `crypto.randomUUID()` for IDs | Unreleased | 2026-04-01 |
| SEC-03 | Input length caps | Unreleased | 2026-04-01 |
| SEC-04 | Remove hardcoded dev IP | Unreleased | 2026-04-01 |
| CODE-01 | Per-lead sweep error isolation | Unreleased | 2026-04-01 |
| CODE-05 | Quotation reference number fix | Unreleased | 2026-04-01 |
| CODE-07 | `DATA_DIR` env var support | Unreleased | 2026-04-01 |
| DS-05 | ConsultationForm loading spinner | Unreleased | 2026-04-01 |
| DS-07 | Advisor widget mobile width | Unreleased | 2026-04-01 |
