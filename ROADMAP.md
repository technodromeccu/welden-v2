# Roadmap

Strategic development plan for the Welden Industries Platform.
Status is kept in sync with [TRACKER.md](./TRACKER.md).

---

## Now — Security & Polish Sprint (April 2026)

Goal: Harden the platform for broader use before marketing outreach begins.

| ID | Item | Status |
|----|------|--------|
| SEC-01 | Add authentication / CAPTCHA to the public Advisor API | Backlog |
| SEC-02 | Replace `Math.random()` IDs with `crypto.randomUUID()` | Done |
| SEC-03 | Input length caps on all validation functions | Done |
| SEC-04 | Remove hardcoded dev IP from `next.config.mjs` | Done |
| CODE-01 | Per-lead error isolation in SLA sweep | Done |
| CODE-05 | Fix quotation reference number generation | Done |
| CODE-07 | Respect `DATA_DIR` environment variable | Done |
| DS-05 | Loading spinner in ConsultationForm | Done |
| DS-07 | Advisor widget mobile width fix | Done |

---

## Next — Feature Completeness Sprint (May 2026)

Goal: Close gaps that affect day-to-day admin usability.

| ID | Item | Status |
|----|------|--------|
| FEAT-01 | Password reset email flow for admin users | Backlog |
| FEAT-02 | System-wide audit log for all admin write operations | Backlog |
| PERF-01 | Paginated lead/session loading (server-side) | Backlog |
| CODE-03 | File write locking to prevent concurrent data loss | Backlog |
| CODE-06 | Standardise API error response format across all routes | Backlog |
| DS-01 | Standardise button usage — use Button component everywhere | Backlog |
| DS-02 | Unify form input styling (ring vs border-bottom) | Backlog |
| DS-08 | Add inline validation feedback to ConsultationForm | Backlog |
| DS-09 | WCAG AA color contrast audit and fixes | Backlog |
| FEAT-09 | Error tracking integration (Sentry or equivalent) | Backlog |

---

## Later — Design System Hardening (June 2026)

Goal: Make the UI fully consistent and maintainable.

| ID | Item | Status |
|----|------|--------|
| DS-03 | Define named border-radius scale in Tailwind config | Backlog |
| DS-04 | Define named shadow tokens (card, modal, float) | Backlog |
| DS-06 | Standardise uppercase label letter-spacing to 0.22em | Backlog |
| FEAT-05 | Lead round-robin or skill-based assignment | Backlog |
| FEAT-06 | Quotation expiry date field and enforcement | Backlog |
| FEAT-07 | Email log cleanup job (prune entries > 90 days) | Backlog |
| FEAT-08 | Email verification on new admin account creation | Backlog |
| FEAT-10 | Server-side global lead search in admin panel | Backlog |
| CODE-02 | Add Zod schema validation to all API request bodies | Backlog |
| CODE-04 | Read SLA constants from Settings instead of hardcoded values | Backlog |

---

## Future — Architecture Migration (Q3 2026)

Goal: Migrate off JSON file storage to a production-grade data tier.

| ID | Item | Status |
|----|------|--------|
| ARCH-01 | Migrate from JSON files to hosted database (Firebase / Supabase) | Backlog |
| ARCH-02 | Migrate file uploads to object storage (R2 / S3 / Firebase Storage) | Backlog |
| FEAT-03 | Real LLM integration for the Advisor chatbot (RAG via Claude API) | Backlog |
| FEAT-04 | Semantic / vector search for knowledge base (pgvector / Pinecone) | Backlog |

---

## Completed

| Version | Milestone |
|---------|-----------|
| v0.6.0 | Admin panel refactored into feature views |
| v0.5.0 | Manual lead quotation and local backup downloads |
| v0.4.0 | Google Drive backup and restore system |
| v0.3.0 | Lead health automation and SLA sweep |
| v0.2.0 | Repo hygiene hardening |
| v0.1.0 | Initial MVP (public site, chatbot, admin, auth, email) |
