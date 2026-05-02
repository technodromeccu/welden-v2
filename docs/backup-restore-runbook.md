# Backup and Restore Runbook

## What is backed up
- Runtime JSON data under `data/`
- Uploaded machine assets under `public/images/machines/uploads/` or `welden-assets` Netlify Blobs when blob-backed uploads are enabled
- Uploaded quotation files under `public/uploads/quotations/` or `welden-assets` Netlify Blobs when blob-backed uploads are enabled
- Encrypted environment backup for disaster recovery

## Required environment variables
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`
- `BACKUP_CRON_SECRET`
- `BACKUP_ENCRYPTION_KEY`

## Manual backup
- Open admin and use the backup panel in Settings
- Or run `npm run backup`
- Or call `POST /api/backups/run` as admin or with `Authorization: Bearer <BACKUP_CRON_SECRET>`

## Scheduled backups
Run backups at these UTC times on the production server:
- `30 8 * * *` for 2:00 PM IST
- `30 13 * * *` for 7:00 PM IST

Example cron commands:

```sh
curl -X POST https://your-site.example/api/backups/run -H "Authorization: Bearer $BACKUP_CRON_SECRET"
```

## List backups
```sh
npm run backups:list
```

## Restore after a failure
1. Clone the project from GitHub onto the recovery server.
2. Install dependencies with `npm install`.
3. Set the Google Drive and backup encryption environment variables.
4. List available snapshots with `npm run backups:list`.
5. Restore the required snapshot:

```sh
npm run restore -- --snapshot <snapshot-name>
```

6. If `.env.local` did not exist, the restore writes it automatically. If it already existed, review `.env.restore`.
7. Start the app and verify:
- `npm run build`
- `/api/health`
- admin login
- leads
- preliminary quotations
- uploaded machine assets and quotation files

## Notes
- This recovery flow is intended for a single persistent writable server.
- GitHub restores the source code. Google Drive restores the live operational data.
- Netlify-style stateless hosting is not the official restore target for this filesystem-based version.
