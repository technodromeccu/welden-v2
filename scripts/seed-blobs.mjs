/**
 * seed-blobs.mjs
 *
 * Seeds Netlify Blobs with the local /data/*.json files using the official SDK.
 * Run from the project root:
 *
 *   $env:NETLIFY_TOKEN="your_token"
 *   $env:NETLIFY_SITE_ID="your_site_id"
 *   node scripts/seed-blobs.mjs
 *
 * Get your token: Netlify dashboard → User Settings → Personal access tokens
 * Get your site ID: Netlify dashboard → Site → Settings → General → Site ID
 */

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getStore } from "@netlify/blobs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

if (!NETLIFY_TOKEN || !NETLIFY_SITE_ID) {
  console.error("Missing env vars. Set NETLIFY_TOKEN and NETLIFY_SITE_ID.");
  process.exit(1);
}

// Static config files to seed
const FILES_TO_SEED = [
  "products",
  "settings",
  "site-sections",
  "users",
  "auth-accounts",
  "knowledge-documents",
  "quotation-templates",
];

async function main() {
  const store = getStore({
    name: "welden-data",
    siteID: NETLIFY_SITE_ID,
    token: NETLIFY_TOKEN,
  });

  console.log(`Seeding ${FILES_TO_SEED.length} collections to Netlify Blobs...\n`);

  for (const name of FILES_TO_SEED) {
    try {
      const raw = await readFile(path.join(dataDir, `${name}.json`), "utf8");
      const parsed = JSON.parse(raw);
      await store.setJSON(name, parsed);
      console.log(`✓  ${name}`);
    } catch (err) {
      console.error(`✗  ${name}: ${err.message}`);
    }
  }

  console.log("\nDone. Your Netlify Blobs store is seeded.");
}

main();
