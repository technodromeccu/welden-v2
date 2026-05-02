import { runBackupJob } from "../lib/backup.ts";

const result = await runBackupJob({ triggeredBy: "cli" });
console.log(JSON.stringify(result, null, 2));
