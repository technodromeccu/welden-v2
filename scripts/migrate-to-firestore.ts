import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import { getFirestoreDb } from "../lib/firebase-admin.ts";

// One-time seed migration: copies the tracked data/*.json seed/config collections
// into Firestore using the Option A layout (one doc per collection in `state/{name}`,
// value stored as a JSON string). Idempotent — skips collections that already exist
// unless invoked with --force. Verifies every write with a read-back deep-equal.
//
// Usage (env must point at the target project + credentials):
//   GOOGLE_APPLICATION_CREDENTIALS=./.secrets/<key>.json \
//   FIREBASE_PROJECT_ID=welden-industries \
//   FIREBASE_STORAGE_BUCKET=welden-industries-assets \
//   node --experimental-strip-types --experimental-specifier-resolution=node scripts/migrate-to-firestore.ts [--force]

const SEED_COLLECTIONS = [
  "products",
  "site-sections",
  "quotation-templates",
  "knowledge-documents",
  "settings",
  "users",
  "auth-accounts",
  "audit-log"
];

const STATE_COLLECTION = "state";

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  const db = await getFirestoreDb();

  let migrated = 0;
  let skipped = 0;

  for (const name of SEED_COLLECTIONS) {
    const filePath = path.join(dataDir, `${name}.json`);

    let value: unknown;
    try {
      const content = await fs.readFile(filePath, "utf8");
      value = JSON.parse(stripBom(content));
    } catch {
      console.log(`-  ${name}: no seed file at ${filePath}, skipping`);
      continue;
    }

    const ref = db.collection(STATE_COLLECTION).doc(name);
    const existing = await ref.get();

    if (existing.exists && !force) {
      console.log(`-  ${name}: already present in Firestore, skipping (use --force to overwrite)`);
      skipped += 1;
      continue;
    }

    const serialized = JSON.stringify(value);
    await ref.set({ data: serialized, updatedAt: new Date().toISOString() });

    // Verify: read back and deep-equal against the source.
    const readBack = await ref.get();
    const stored = readBack.data() as { data?: string } | undefined;
    assert.ok(typeof stored?.data === "string", `${name}: read-back has no data field`);
    assert.deepEqual(JSON.parse(stored.data), value, `${name}: read-back does not match source`);

    console.log(`✓  ${name}: migrated and verified (${serialized.length} bytes)`);
    migrated += 1;
  }

  console.log(`\nDone. ${migrated} migrated, ${skipped} skipped.`);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
