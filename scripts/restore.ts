import { restoreBackupSnapshot } from "../lib/backup.ts";

const snapshotIndex = process.argv.findIndex((entry) => entry === "--snapshot");
const snapshotName = snapshotIndex >= 0 ? process.argv[snapshotIndex + 1] : null;

if (!snapshotName) {
  console.error("Usage: npm run restore -- --snapshot <name>");
  process.exit(1);
}

const result = await restoreBackupSnapshot(snapshotName);
console.log(JSON.stringify(result, null, 2));
