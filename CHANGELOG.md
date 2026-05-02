# Changelog

All notable changes to the Welden Industries Platform are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Security
- **SEC-02** Replace `Math.random()` IDs with `crypto.randomUUID()` in `lib/store.ts`
- **SEC-03** Add input length caps to all validation functions to prevent oversized payload DoS
- **SEC-04** Remove hardcoded internal IP from `next.config.mjs`; read from `ALLOWED_DEV_ORIGINS` env var

### Fixed
- **CODE-01** `runLeadFollowUpSweep` now isolates errors per lead — one failed email no longer aborts the entire sweep
- **CODE-05** Quotation reference numbers in the chatbot path now use the authoritative `preliminary-quotations` count instead of a derived session count, preventing duplicate references
- **CODE-07** Data directory now respects `DATA_DIR` environment variable, falling back to `<cwd>/data`

### Improved
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
