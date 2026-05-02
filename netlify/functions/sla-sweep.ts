export default async function handler() {
  const cronSecret = process.env.CRON_SECRET;
  const siteUrl = process.env.NETLIFY_SITE_URL ?? process.env.URL ?? process.env.DEPLOY_URL;

  if (!cronSecret) {
    console.error("CRON_SECRET is not configured for Netlify scheduled SLA sweep.");
    return new Response("Missing CRON_SECRET", { status: 500 });
  }

  if (!siteUrl) {
    console.error("No site URL available for Netlify scheduled SLA sweep.");
    return new Response("Missing site URL", { status: 500 });
  }

  const normalizedSiteUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  const response = await fetch(`${normalizedSiteUrl}/api/sla-sweep`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Netlify scheduled SLA sweep failed", response.status, body);
    return new Response("SLA sweep failed", { status: response.status });
  }

  return new Response("SLA sweep completed", { status: 200 });
}
