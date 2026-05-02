# Welden Industries Platform

Full-stack Next.js MVP for the Welden Industries website, Guided Machine Advisor, shared CMS, and internal admin workflow.

## What is included
- Public industrial landing page at `/`
- SEO-focused machine detail pages at `/machines/[slug]`
- Guided Machine Advisor that captures lead data and can issue preliminary quotations
- Unified admin at `/admin`
- Product CMS, site content CMS, machine page CMS, and quotation template CMS
- Filesystem-backed admin workflow with Resend email delivery
- API routes for advisor, dashboard, products, sections, users, settings, auth, SLA sweep, and backups

## Run locally
1. `cmd /c npm install`
2. Copy `.env.example` to `.env.local`
3. Set `AUTH_SECRET`
4. Optional: configure Resend variables for real email sending
5. Use one of these commands:
   - `cmd /c npm run dev`
   - `cmd /c npm run preview` if your local `next dev` environment is unstable
6. Open `http://localhost:3000`

## Seed staff logins
- `admin@welden.example` / `WeldenAdmin!2026`
- `manager@welden.example` / `WeldenManager!2026`
- `agent@welden.example` / `WeldenAgent!2026`

## Environment variables
### Required for production
- `AUTH_SECRET`: session-signing secret
- `CRON_SECRET`: protects `/api/sla-sweep`
- `NEXT_PUBLIC_SITE_URL`: canonical public site URL for metadata

### Optional
- `RESEND_API_KEY`
- `RESEND_SENDER_EMAIL`
- `RESEND_SENDER_NAME`
- `RESEND_REPLY_TO_EMAIL`
- `NETLIFY_SITE_URL`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`
- `BACKUP_CRON_SECRET`
- `BACKUP_ENCRYPTION_KEY`
- `BACKUP_ALERT_EMAILS`

## Resend email setup
- `RESEND_API_KEY`: your Resend API key
- `RESEND_SENDER_EMAIL`: a verified Resend sender email
- `RESEND_SENDER_NAME`: sender display name
- `RESEND_REPLY_TO_EMAIL`: optional reply-to email

## GitHub hygiene
- CMS seed/config files remain tracked in `data/`:
  - `products.json`
  - `site-sections.json`
  - `quotation-templates.json`
  - `knowledge-documents.json`
  - `settings.json`
  - `users.json`
  - `auth-accounts.json`
- Runtime-only files are intentionally gitignored:
  - `data/advisor-sessions.json`
  - `data/email-log.json`
  - `data/tickets.json`
  - `data/preliminary-quotations.json`
  - `data/backup-status.json`
  - `public/uploads/*`
  - `public/images/machines/uploads/*`
- On a fresh clone, missing runtime collections are auto-created by the app.

## Notes
- Data is stored in `data/*.json` for this MVP.
- Uploaded files are stored on the local filesystem under `public/` for this MVP.
- If `USE_BLOBS=true` on Netlify, CMS uploads use the `welden-assets` Netlify Blobs store and are served through `/api/assets/*`. This covers brochures, machine images, branding images, and quotation reference uploads.
- Admin access is session-based and protected at both page and API level.
- This app is feature-complete for MVP usage, but local JSON storage and local uploads are not the long-term production architecture.

## Backup and restore
- `POST /api/backups/run` can be triggered by an authenticated admin session or with `Authorization: Bearer <BACKUP_CRON_SECRET>`
- `GET /api/backups/status` returns the latest backup health plus recent Google Drive artifacts for admin use
- CLI commands:
  - `npm run backup`
  - `npm run backups:list`
  - `npm run restore -- --snapshot <snapshot-name>`
- Backups include runtime JSON data, uploaded assets, a manifest with checksums, and an encrypted secrets payload
- See `docs/backup-restore-runbook.md` for the production recovery steps

## SLA sweep automation
- `POST /api/sla-sweep` can be triggered by an authenticated admin session
- For scheduled production sweeps, set `CRON_SECRET` and call the endpoint with either:
  - `Authorization: Bearer <CRON_SECRET>`
  - `x-cron-secret: <CRON_SECRET>`
- The sweep supports:
  - reminder emails before the first-response SLA expires
  - overdue alerts when the SLA is breached
  - escalation emails after the configured escalation window

## Deployment readiness
- Package versions are pinned for reproducible builds
- `next.config.mjs` uses `output: "standalone"` for simpler hosting/container deploys
- `GET /api/health` reports deployment-critical readiness without exposing secrets
- Production should set:
  - `AUTH_SECRET`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_SITE_URL`
  - Resend vars when live email is enabled
- If `/api/health` returns `degraded`, fix env configuration before launch

## Current MVP limitations
- `data/*.json` is single-instance storage and is not safe for multi-instance write concurrency
- uploaded files under `public/` are local disk assets and will not scale cleanly across ephemeral or horizontally scaled hosting unless `USE_BLOBS=true` is enabled for CMS asset uploads
- the custom auth system is appropriate for MVP use, but hosted auth will be easier to operate long-term
- operational data such as leads, email logs, and uploaded assets should eventually move to hosted persistence

## Netlify hosting prep
- This repo includes `netlify.toml` for Next.js build execution and the scheduled SLA function
- The Netlify scheduled function lives at `netlify/functions/sla-sweep.ts`
- It runs `@hourly` and calls the existing `/api/sla-sweep` route with `CRON_SECRET`
- Recommended Netlify environment variables:
  - `AUTH_SECRET`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_SITE_URL`
  - `USE_BLOBS=true` to store CMS uploads in Netlify Blobs
  - `NETLIFY_SITE_URL` optional override if you want to force the site URL
  - `RESEND_API_KEY`
  - `RESEND_SENDER_EMAIL`
  - `RESEND_SENDER_NAME`
  - `RESEND_REPLY_TO_EMAIL`

## Technical readiness note
See `docs/technical-readiness.md` for the current architecture, deployment caveats, and migration-prep notes.
