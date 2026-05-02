# Technical Readiness

## Current architecture
- Frontend: Next.js App Router
- Auth: custom signed-cookie session auth
- Data: local JSON files in `data/`
- Uploads: local filesystem under `public/`, or Netlify Blobs for CMS assets when `USE_BLOBS=true` including brochures, machine images, branding images, and quotation reference documents
- Email: Resend-ready, with audit logging to `data/email-log.json`

## Current strengths
- Fast to iterate locally
- No external infrastructure required for MVP usage
- Clear admin ownership over products, machine pages, site content, leads, tickets, and knowledge base
- Public pages and admin workflows already share one coherent content model

## Current production caveats
- Local JSON files do not provide concurrency safety for multi-instance hosting
- Local uploads are not suitable for horizontally scaled or ephemeral hosting
- Custom auth is workable, but hosted auth will be easier to operate long-term
- Scheduled SLA jobs depend on correct `CRON_SECRET` setup
- Operational backups are still manual unless export routines are added around the JSON data files

## Recommended next migration path
1. Hosted frontend on Vercel, Netlify, or Firebase App Hosting
2. Hosted auth
3. Hosted object storage for uploads
4. Hosted database replacing `data/*.json`
5. Optional AI follow-up layer after infrastructure stabilizes

## Likely entity mapping for Firebase or similar backend
- `users`
- `auth-accounts` or hosted auth provider users
- `products`
- `site-sections`
- `knowledge-documents`
- `advisor-sessions`
- `tickets`
- `settings`
- `email-log`

## Deployment checklist before public launch
- Set `AUTH_SECRET`, `CRON_SECRET`, and `NEXT_PUBLIC_SITE_URL`
- Verify `/api/health`
- Decide production hosting model for uploads
- Decide backend migration target for persistent operational data
- Confirm backup/export strategy for tickets, leads, and CMS data
- Validate admin roles and seeded accounts before opening staff access

## Recommended technical next step after this pass
- Keep the current app on the local MVP stack for active design and workflow iteration
- Once content structure and admin workflows stabilize, move persistence and uploads first
- Delay AI-intensive or automation-heavy additions until auth, storage, and deployment are on hosted infrastructure
