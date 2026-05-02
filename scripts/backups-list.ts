import { listBackupArtifacts } from "../lib/backup.ts";

const artifacts = await listBackupArtifacts();
console.log(JSON.stringify(artifacts, null, 2));
