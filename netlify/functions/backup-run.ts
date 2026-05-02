export default async function handler() {
  const cronSecret = process.env.BACKUP_CRON_SECRET;
  const siteUrl = process.env.NETLIFY_SITE_URL ?? process.env.URL ?? process.env.DEPLOY_URL;

  if (!cronSecret) {
    console.error("BACKUP_CRON_SECRET is not configured for Netlify scheduled backup.");
    return new Response("Missing BACKUP_CRON_SECRET", { status: 500 });
  }

  if (!siteUrl) {
    console.error("No site URL available for Netlify scheduled backup.");
    return new Response("Missing site URL", { status: 500 });
  }

  const normalizedSiteUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  const response = await fetch(`${normalizedSiteUrl}/api/backups/run`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Netlify scheduled backup failed", response.status, body);
    return new Response("Backup failed", { status: response.status });
  }

  return new Response("Backup completed", { status: 200 });
}
