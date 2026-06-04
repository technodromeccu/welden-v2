# Deploy & Run-Test Guide (Netlify)

This branch makes the platform run on **Firebase** (Firestore + Cloud Storage) with the `gemini-3.5-flash` advisor, durable rate limiting, and a Firestore-aware health check. The Firebase project is already provisioned and **seeded** — you only need to deploy and set environment variables.

## 1. Connect the repo to Netlify
1. Netlify → **Add new site → Import an existing project** → pick this repo/branch.
2. Build settings are auto-detected from `netlify.toml` + `@netlify/plugin-nextjs`. Leave defaults:
   - Build command: `next build`
   - The Next.js runtime plugin handles functions/publish automatically.

## 2. Environment variables (Site settings → Environment variables)

### Provided by Shandar (securely — do NOT commit)
| Key | Notes |
|-----|-------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | The Admin SDK key for project `welden-industries`, as a **single-line** JSON string. Shandar sends this to you securely. |

### You provide
| Key | Value / How to get it |
|-----|-----------------------|
| `GEMINI_API_KEY` | Your own key from **Google AI Studio** (https://aistudio.google.com/apikey → Create API key). |
| `AUTH_SECRET` | Generate a strong random value: `openssl rand -hex 32` |
| `CRON_SECRET` | Generate a strong random value: `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | Your Netlify site URL, e.g. `https://welden-test.netlify.app` (no trailing slash) |

### Fixed values (copy as-is)
| Key | Value |
|-----|-------|
| `DATA_BACKEND` | `firestore` |
| `FIREBASE_PROJECT_ID` | `welden-industries` |
| `FIREBASE_STORAGE_BUCKET` | `welden-industries-assets` |
| `GEMINI_MODEL` | `gemini-3.5-flash` (this is also the built-in default) |

### Optional (only to test live email)
| Key | Notes |
|-----|-------|
| `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, `RESEND_SENDER_NAME`, `RESEND_REPLY_TO_EMAIL` | Your own Resend credentials. Without these, email send is skipped (logged only) — all other flows still work. |

> Do **not** set `USE_BLOBS` — that was the old Netlify Blobs path; this build uses Firebase.

## 3. Deploy
Trigger a deploy after setting env vars. When it's up, open the site URL.

## 4. Verify before testing flows
- `GET /api/health` should return `{"status":"ok", ... "firestore":{"reachable":true}}` once all required env vars are set. If `status` is `degraded`, the JSON shows which check failed (env presence or Firestore connectivity) — fix that first.

## 5. Seed staff logins (for admin flow testing)
The admin accounts are already seeded in Firestore:
- `admin@welden.example` / `WeldenAdmin!2026`
- `manager@welden.example` / `WeldenManager!2026`
- `agent@welden.example` / `WeldenAgent!2026`

> These are seed credentials for testing only — change them before any real use.

## 6. Complete flow run-test checklist
- **Public site** — home, machine detail pages (`/machines/[slug]`) render with seeded products.
- **Advisor chatbot** — open the advisor widget, ask about a machine, request a quote. Confirm grounded `gemini-3.5-flash` responses (needs your `GEMINI_API_KEY`). Rate limit kicks in after 15 requests / 5 min per IP.
- **Contact form** — submit; a lead is captured (visible in admin).
- **Admin login** — log in with a seed account.
- **CMS** — edit a product / site section / quotation template; reload and confirm persistence (writes to Firestore).
- **Asset upload** — upload a machine image/brochure in the CMS; confirm it renders on the public page (stored in Cloud Storage, served via `/api/assets/*`).
- **Quotation** — issue a preliminary quotation from a lead; confirm it persists and (with Resend set) emails.
- **Leads / dashboard** — confirm lead health, SLA badges, and dashboard counts.

## Notes
- Firestore config collections are already seeded; runtime collections (advisor sessions, quotations, etc.) auto-create on first write.
- Rate limiting is durable (Firestore-backed) and self-cleaning via a TTL policy.
- Uploaded files and runtime data live in the `welden-industries` Firebase project owned by Shandar.
