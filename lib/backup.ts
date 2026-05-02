import crypto from "node:crypto";
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { nowIso, readCollection, writeCollection } from "./store.ts";
import { sendEmail } from "./email.ts";
import type { BackupArtifact, BackupBundle, BackupBundleFile, BackupManifest, BackupManifestFile, BackupSecretsBundle, BackupStatus, Settings } from "./types";

const BACKUP_PREFIX = "welden-backup";
const SECRETS_PREFIX = "welden-secrets";
const BACKUP_EXTENSION = ".json.gz";
const SECRETS_EXTENSION = ".enc.json";
const MANIFEST_SCHEMA_VERSION = 1;
const BACKUP_RETENTION_DAYS = 30;
const BACKUP_DAILY_RETENTION_DAYS = 90;
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const DATA_FILES = [
  "data/users.json",
  "data/auth-accounts.json",
  "data/products.json",
  "data/site-sections.json",
  "data/knowledge-documents.json",
  "data/quotation-templates.json",
  "data/settings.json",
  "data/advisor-sessions.json",
  "data/preliminary-quotations.json"
] as const;
const DATA_DIRS = [
  "public/images/machines/uploads",
  "public/uploads/quotations"
] as const;
const SECRET_KEYS = [
  "AUTH_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "RESEND_SENDER_EMAIL",
  "RESEND_SENDER_NAME",
  "RESEND_REPLY_TO_EMAIL",
  "GOOGLE_DRIVE_FOLDER_ID",
  "GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON",
  "BACKUP_CRON_SECRET",
  "BACKUP_ENCRYPTION_KEY",
  "BACKUP_ALERT_EMAILS"
] as const;

type DriveServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  createdTime?: string;
  webViewLink?: string;
  size?: string;
};

type BackupRunResult = {
  status: BackupStatus;
  snapshot: BackupArtifact;
  secrets: BackupArtifact;
};

type RestoreResult = {
  snapshotName: string;
  restoredFiles: string[];
  envFilePath: string | null;
};

function toPosix(value: string) {
  return value.replace(/\\/g, "/");
}

function fromPosix(value: string) {
  return value.split("/").join(path.sep);
}

function isJsonPath(relativePath: string) {
  return relativePath.startsWith("data/") && relativePath.endsWith(".json");
}

function resolveWorkspacePath(relativePath: string) {
  if (relativePath.startsWith("data/")) {
    return path.join(/* turbopackIgnore: true */ process.cwd(), "data", fromPosix(relativePath.slice(5)));
  }
  if (relativePath.startsWith("public/")) {
    return path.join(/* turbopackIgnore: true */ process.cwd(), "public", fromPosix(relativePath.slice(7)));
  }
  throw new Error(`Unsupported backup path: ${relativePath}`);
}

function sha256(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getIstTimestampParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second
  } as Record<string, string>;
}

function getTimestampToken(date = new Date()) {
  const parts = getIstTimestampParts(date);
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${parts.minute}-${parts.second}-IST`;
}

function getIstDisplay(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(date);
}

function getNextScheduledRuns(now = new Date()) {
  const slots = [
    { hour: 8, minute: 30 },
    { hour: 13, minute: 30 }
  ];
  const nextRuns: string[] = [];
  let cursor = new Date(now);
  while (nextRuns.length < 2) {
    const day = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()));
    for (const slot of slots) {
      const candidate = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), slot.hour, slot.minute, 0, 0));
      if (candidate.getTime() > now.getTime()) {
        nextRuns.push(candidate.toISOString());
        if (nextRuns.length === 2) break;
      }
    }
    cursor = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  }
  return nextRuns;
}

function parseServiceAccount(raw: string | undefined | null): DriveServiceAccount {
  if (!raw?.trim()) {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is required.");
  }

  const trimmed = raw.trim();
  let parsed: DriveServiceAccount;
  try {
    if (trimmed.startsWith("{")) {
      parsed = JSON.parse(trimmed) as DriveServiceAccount;
    } else if (trimmed.startsWith("@")) {
      parsed = JSON.parse(readFileSync(trimmed.slice(1), "utf8")) as DriveServiceAccount;
    } else {
      const decoded = Buffer.from(trimmed, "base64").toString("utf8");
      parsed = JSON.parse(decoded) as DriveServiceAccount;
    }
  } catch {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON must be valid JSON or base64-encoded JSON.");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Google Drive service account JSON must include client_email and private_key.");
  }
  return parsed;
}

function getBackupEncryptionKey() {
  const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY?.trim();
  if (!encryptionKey) {
    throw new Error("BACKUP_ENCRYPTION_KEY is required.");
  }
  return encryptionKey;
}

function getBackupConfig() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is required.");
  }

  return {
    folderId,
    serviceAccount: parseServiceAccount(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON),
    encryptionKey: getBackupEncryptionKey(),
    cronSecret: process.env.BACKUP_CRON_SECRET?.trim() || null,
    alertEmails: splitEmails(process.env.BACKUP_ALERT_EMAILS)
  };
}

export function getBackupConfigurationState() {
  try {
    getBackupConfig();
    return { configured: true, configurationError: null as string | null };
  } catch (error) {
    return { configured: false, configurationError: error instanceof Error ? error.message : "Backup is not configured." };
  }
}

function splitEmails(value?: string | null) {
  return Array.from(new Set((value ?? "").split(/\r?\n|,/).map((entry) => entry.trim().toLowerCase()).filter(Boolean)));
}

function getEncryptionKey(value: string) {
  return crypto.createHash("sha256").update(value).digest();
}

function encryptJson(value: object, encryptionKey: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    data: encrypted.toString("base64")
  }, null, 2);
}

function decryptJson<T>(value: string, encryptionKey: string): T {
  const payload = JSON.parse(value) as { iv: string; authTag: string; data: string };
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(encryptionKey), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles() {
  const files: BackupBundleFile[] = [];
  const manifestFiles: BackupManifestFile[] = [];

  for (const relativePath of DATA_FILES) {
    const absolutePath = resolveWorkspacePath(relativePath);
    if (!(await pathExists(absolutePath))) {
      continue;
    }
    const raw = await fs.readFile(absolutePath);
    const encoding = isJsonPath(relativePath) ? "utf8" : "base64";
    const data = encoding === "utf8" ? raw.toString("utf8") : raw.toString("base64");
    files.push({ path: relativePath, encoding, data });
    manifestFiles.push({ path: relativePath, encoding, size: raw.length, sha256: sha256(raw) });
  }

  async function walk(relativeDir: string) {
    const absoluteDir = resolveWorkspacePath(relativeDir);
    if (!(await pathExists(absoluteDir))) {
      return;
    }
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryRelative = toPosix(path.join(relativeDir, entry.name));
      const entryAbsolute = resolveWorkspacePath(entryRelative);
      if (entry.isDirectory()) {
        await walk(entryRelative);
      } else if (entry.isFile()) {
        const raw = await fs.readFile(entryAbsolute);
        files.push({ path: entryRelative, encoding: "base64", data: raw.toString("base64") });
        manifestFiles.push({ path: entryRelative, encoding: "base64", size: raw.length, sha256: sha256(raw) });
      }
    }
  }

  for (const relativeDir of DATA_DIRS) {
    await walk(relativeDir);
  }

  manifestFiles.sort((a, b) => a.path.localeCompare(b.path));
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, manifestFiles };
}

async function getGitCommitHash() {
  try {
    const { execFileSync } = await import("node:child_process");
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: /* turbopackIgnore: true */ process.cwd(), encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function buildSnapshotPayload(createdAt = nowIso(), gitCommitHash?: string | null) {
  const resolvedGitCommitHash = gitCommitHash ?? await getGitCommitHash();
  const timestampToken = getTimestampToken(new Date(createdAt));
  const { files, manifestFiles } = await collectFiles();
  const manifest: BackupManifest = {
    app: "Welden Industries Platform",
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    createdAt,
    createdAtIst: getIstDisplay(new Date(createdAt)),
    gitCommitHash: resolvedGitCommitHash,
    files: manifestFiles
  };
  const bundle: BackupBundle = {
    version: 1,
    manifest,
    files
  };
  return {
    manifest,
    snapshotName: `${BACKUP_PREFIX}-${timestampToken}${BACKUP_EXTENSION}`,
    snapshotBuffer: gzipSync(Buffer.from(JSON.stringify(bundle), "utf8"))
  };
}

async function buildSecretsPayload(createdAt = nowIso(), gitCommitHash?: string | null) {
  const resolvedGitCommitHash = gitCommitHash ?? await getGitCommitHash();
  const timestampToken = getTimestampToken(new Date(createdAt));
  const secrets: Record<string, string> = {};
  for (const key of SECRET_KEYS) {
    const value = process.env[key];
    if (value != null && value !== "") {
      secrets[key] = value;
    }
  }
  const secretsBundle: BackupSecretsBundle = {
    version: 1,
    createdAt,
    gitCommitHash: resolvedGitCommitHash,
    secrets
  };
  return {
    secretsName: `${SECRETS_PREFIX}-${timestampToken}${SECRETS_EXTENSION}`,
    secretsBuffer: Buffer.from(encryptJson(secretsBundle, getBackupEncryptionKey()), "utf8")
  };
}

async function createBackupPayloads() {
  const createdAt = nowIso();
  const gitCommitHash = await getGitCommitHash();
  const snapshot = await buildSnapshotPayload(createdAt, gitCommitHash);
  const secrets = await buildSecretsPayload(createdAt, gitCommitHash);

  return {
    manifest: snapshot.manifest,
    snapshotName: snapshot.snapshotName,
    snapshotBuffer: snapshot.snapshotBuffer,
    secretsName: secrets.secretsName,
    secretsBuffer: secrets.secretsBuffer
  };
}

function createJwtAssertion(serviceAccount: DriveServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: DRIVE_SCOPE,
    aud: serviceAccount.token_uri ?? TOKEN_URI,
    exp: now + 3600,
    iat: now
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.private_key, "base64url");
  return `${unsigned}.${signature}`;
}

async function getDriveAccessToken() {
  const { serviceAccount } = getBackupConfig();
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: createJwtAssertion(serviceAccount)
  });
  const response = await fetch(serviceAccount.token_uri ?? TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Unable to authenticate with Google Drive (${response.status}).`);
  }
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google Drive did not return an access token.");
  }
  return payload.access_token;
}

async function driveRequest<T>(input: string, init: RequestInit = {}) {
  const token = await getDriveAccessToken();
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Drive request failed (${response.status}): ${body}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return await response.json() as T;
}

async function listDriveChildren(parentId: string, mimeType?: string) {
  const parts = [`'${parentId}' in parents`, "trashed = false"];
  if (mimeType) {
    parts.push(`mimeType = '${mimeType}'`);
  }
  const q = encodeURIComponent(parts.join(" and "));
  const response = await driveRequest<{ files: DriveFile[] }>(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,createdTime,webViewLink,size)&pageSize=1000`);
  return response.files;
}

async function findOrCreateFolder(name: string, parentId: string) {
  const existing = (await listDriveChildren(parentId, DRIVE_FOLDER_MIME)).find((entry) => entry.name === name);
  if (existing) {
    return existing.id;
  }
  const created = await driveRequest<DriveFile>("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: DRIVE_FOLDER_MIME, parents: [parentId] })
  });
  return created.id;
}

async function ensureBackupFolderForDate(rootFolderId: string, createdAt: string) {
  const date = new Date(createdAt);
  const year = date.getUTCFullYear().toString();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yearFolderId = await findOrCreateFolder(year, rootFolderId);
  return findOrCreateFolder(month, yearFolderId);
}

async function uploadDriveFile(parentId: string, name: string, data: Buffer) {
  const boundary = `welden-${crypto.randomUUID()}`;
  const metadata = Buffer.from(JSON.stringify({ name, parents: [parentId] }), "utf8");
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`, "utf8"),
    metadata,
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`, "utf8"),
    data,
    Buffer.from(`\r\n--${boundary}--`, "utf8")
  ]);
  return driveRequest<DriveFile>("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,webViewLink,size", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
}

function classifyArtifact(file: DriveFile): BackupArtifact | null {
  if (file.name.startsWith(BACKUP_PREFIX) && file.name.endsWith(BACKUP_EXTENSION)) {
    return { id: file.id, name: file.name, kind: "bundle", createdAt: file.createdTime, webViewLink: file.webViewLink, size: file.size ? Number(file.size) : undefined };
  }
  if (file.name.startsWith(SECRETS_PREFIX) && file.name.endsWith(SECRETS_EXTENSION)) {
    return { id: file.id, name: file.name, kind: "secrets", createdAt: file.createdTime, webViewLink: file.webViewLink, size: file.size ? Number(file.size) : undefined };
  }
  return null;
}

export async function listBackupArtifacts() {
  const { folderId } = getBackupConfig();
  const yearFolders = await listDriveChildren(folderId, DRIVE_FOLDER_MIME);
  const artifacts: BackupArtifact[] = [];
  for (const yearFolder of yearFolders) {
    const monthFolders = await listDriveChildren(yearFolder.id, DRIVE_FOLDER_MIME);
    for (const monthFolder of monthFolders) {
      const files = await listDriveChildren(monthFolder.id);
      for (const file of files) {
        const artifact = classifyArtifact(file);
        if (artifact) {
          artifacts.push(artifact);
        }
      }
    }
  }
  return artifacts.sort((a, b) => (b.createdAt ?? b.name).localeCompare(a.createdAt ?? a.name));
}

async function deleteDriveFile(fileId: string) {
  await driveRequest<void>(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method: "DELETE" });
}

function getArtifactDayKey(artifact: BackupArtifact) {
  const match = artifact.name.match(/(\d{4}-\d{2}-\d{2})-/);
  return match?.[1] ?? "unknown";
}

async function pruneOldArtifacts() {
  const artifacts = await listBackupArtifacts();
  const now = Date.now();
  const dailyKeep = new Map<string, BackupArtifact>();
  for (const artifact of artifacts) {
    const dayKey = `${artifact.kind}:${getArtifactDayKey(artifact)}`;
    if (!dailyKeep.has(dayKey)) {
      dailyKeep.set(dayKey, artifact);
    }
  }

  for (const artifact of artifacts) {
    const createdAt = artifact.createdAt ? new Date(artifact.createdAt).getTime() : NaN;
    if (!Number.isFinite(createdAt)) continue;
    const ageDays = (now - createdAt) / (24 * 60 * 60 * 1000);
    if (ageDays > BACKUP_DAILY_RETENTION_DAYS) {
      await deleteDriveFile(artifact.id);
      continue;
    }
    if (ageDays > BACKUP_RETENTION_DAYS) {
      const dayKey = `${artifact.kind}:${getArtifactDayKey(artifact)}`;
      if (dailyKeep.get(dayKey)?.id !== artifact.id) {
        await deleteDriveFile(artifact.id);
      }
    }
  }
}

function getStatusDefaults(): BackupStatus {
  const configuration = getBackupConfigurationState();
  return {
    configured: configuration.configured,
    configurationError: configuration.configurationError,
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    latestSnapshotName: null,
    latestSecretsName: null,
    latestSnapshotId: null,
    latestSecretsId: null,
    lastError: null,
    nextScheduledRunsUtc: getNextScheduledRuns(),
    retentionDays: BACKUP_RETENTION_DAYS,
    dailyRetentionDays: BACKUP_DAILY_RETENTION_DAYS
  };
}

export async function getBackupStatus() {
  const saved = await readCollection<BackupStatus>("backup-status");
  return {
    ...getStatusDefaults(),
    ...saved,
    nextScheduledRunsUtc: getNextScheduledRuns()
  } satisfies BackupStatus;
}

async function saveBackupStatus(status: BackupStatus) {
  await writeCollection("backup-status", status);
}

function formatAlertBody(error: string) {
  return [
    "A scheduled Welden backup run failed.",
    "",
    `Error: ${error}`,
    `Time: ${new Date().toISOString()}`,
    "",
    "Please review the server logs and backup configuration before the next scheduled run."
  ].join("\n");
}

async function notifyBackupFailure(error: string) {
  const config = getBackupConfig();
  const settings = await readCollection<Settings>("settings");
  const recipients = config.alertEmails.length ? config.alertEmails : settings.internalNotificationEmails;
  if (!recipients.length) {
    return;
  }
  await sendEmail(recipients, "Welden backup failed", formatAlertBody(error));
}

export async function runBackupJob(options: { triggeredBy: "manual" | "scheduled" | "cli" }) : Promise<BackupRunResult> {
  const startedAt = nowIso();
  const existing = await getBackupStatus();
  await saveBackupStatus({ ...existing, lastRunAt: startedAt, nextScheduledRunsUtc: getNextScheduledRuns(), lastError: null });

  try {
    const config = getBackupConfig();
    const payloads = await createBackupPayloads();
    const parentFolderId = await ensureBackupFolderForDate(config.folderId, payloads.manifest.createdAt);
    const snapshot = await uploadDriveFile(parentFolderId, payloads.snapshotName, payloads.snapshotBuffer);
    const secrets = await uploadDriveFile(parentFolderId, payloads.secretsName, payloads.secretsBuffer);
    await pruneOldArtifacts();

    const nextStatus: BackupStatus = {
      ...existing,
      lastRunAt: startedAt,
      lastSuccessAt: nowIso(),
      latestSnapshotName: snapshot.name,
      latestSecretsName: secrets.name,
      latestSnapshotId: snapshot.id,
      latestSecretsId: secrets.id,
      lastError: null,
      nextScheduledRunsUtc: getNextScheduledRuns(),
      retentionDays: BACKUP_RETENTION_DAYS,
      dailyRetentionDays: BACKUP_DAILY_RETENTION_DAYS
    };
    await saveBackupStatus(nextStatus);
    return {
      status: nextStatus,
      snapshot: { id: snapshot.id, name: snapshot.name, kind: "bundle", createdAt: snapshot.createdTime, webViewLink: snapshot.webViewLink, size: snapshot.size ? Number(snapshot.size) : undefined },
      secrets: { id: secrets.id, name: secrets.name, kind: "secrets", createdAt: secrets.createdTime, webViewLink: secrets.webViewLink, size: secrets.size ? Number(secrets.size) : undefined }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backup error";
    const failedStatus: BackupStatus = {
      ...(await getBackupStatus()),
      lastRunAt: startedAt,
      lastFailureAt: nowIso(),
      lastError: message,
      nextScheduledRunsUtc: getNextScheduledRuns(),
      retentionDays: BACKUP_RETENTION_DAYS,
      dailyRetentionDays: BACKUP_DAILY_RETENTION_DAYS
    };
    await saveBackupStatus(failedStatus);
    if (options.triggeredBy === "scheduled") {
      await notifyBackupFailure(message);
    }
    throw error;
  }
}

async function downloadDriveFile(fileId: string) {
  const token = await getDriveAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Unable to download Google Drive file (${response.status}): ${body}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function verifyBundle(bundle: BackupBundle) {
  const fileMap = new Map(bundle.files.map((entry) => [entry.path, entry]));
  for (const manifestFile of bundle.manifest.files) {
    const file = fileMap.get(manifestFile.path);
    if (!file) {
      throw new Error(`Backup archive is missing ${manifestFile.path}.`);
    }
    const decoded = file.encoding === "utf8" ? Buffer.from(file.data, "utf8") : Buffer.from(file.data, "base64");
    if (decoded.length !== manifestFile.size) {
      throw new Error(`Backup archive has invalid size for ${manifestFile.path}.`);
    }
    if (sha256(decoded) !== manifestFile.sha256) {
      throw new Error(`Backup archive checksum mismatch for ${manifestFile.path}.`);
    }
  }
}

function renderEnvFile(bundle: BackupSecretsBundle) {
  return Object.entries(bundle.secrets).map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
}

export async function restoreBackupSnapshot(snapshotName: string): Promise<RestoreResult> {
  const artifacts = await listBackupArtifacts();
  const snapshot = artifacts.find((artifact) => artifact.kind === "bundle" && artifact.name === snapshotName);
  if (!snapshot) {
    throw new Error(`Backup snapshot ${snapshotName} was not found in Google Drive.`);
  }
  const timestampToken = snapshotName.replace(`${BACKUP_PREFIX}-`, "").replace(BACKUP_EXTENSION, "");
  const secretsName = `${SECRETS_PREFIX}-${timestampToken}${SECRETS_EXTENSION}`;
  const secretsArtifact = artifacts.find((artifact) => artifact.kind === "secrets" && artifact.name === secretsName) ?? null;

  const bundleBuffer = await downloadDriveFile(snapshot.id);
  const bundle = JSON.parse(gunzipSync(bundleBuffer).toString("utf8")) as BackupBundle;
  verifyBundle(bundle);

  const root = /* turbopackIgnore: true */ process.cwd();
  const restoredFiles: string[] = [];
  for (const file of bundle.files) {
    const targetPath = resolveWorkspacePath(file.path);
    const resolvedRoot = path.resolve(root);
    const resolvedTarget = path.resolve(targetPath);
    if (!resolvedTarget.startsWith(resolvedRoot)) {
      throw new Error(`Refusing to restore file outside workspace: ${file.path}`);
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const raw = file.encoding === "utf8" ? Buffer.from(file.data, "utf8") : Buffer.from(file.data, "base64");
    await fs.writeFile(targetPath, raw);
    restoredFiles.push(file.path);
  }

  let envFilePath: string | null = null;
  if (secretsArtifact) {
    const encryptedSecrets = (await downloadDriveFile(secretsArtifact.id)).toString("utf8");
    const decrypted = decryptJson<BackupSecretsBundle>(encryptedSecrets, getBackupConfig().encryptionKey);
    const preferredEnvPath = path.join(root, ".env.local");
    envFilePath = (await pathExists(preferredEnvPath)) ? path.join(root, ".env.restore") : preferredEnvPath;
    await fs.writeFile(envFilePath, renderEnvFile(decrypted), "utf8");
  }

  return { snapshotName, restoredFiles, envFilePath };
}

export async function getBackupStatusPayload() {
  const configuration = getBackupConfigurationState();
  if (!configuration.configured) {
    return {
      status: await getBackupStatus(),
      artifacts: [] as BackupArtifact[]
    };
  }

  return {
    status: await getBackupStatus(),
    artifacts: (await listBackupArtifacts()).slice(0, 10)
  };
}

export async function createLocalBackupDownload(kind: "bundle" | "secrets") {
  const createdAt = nowIso();
  const gitCommitHash = await getGitCommitHash();

  if (kind === "bundle") {
    const snapshot = await buildSnapshotPayload(createdAt, gitCommitHash);
    return {
      fileName: snapshot.snapshotName,
      contentType: "application/gzip",
      body: snapshot.snapshotBuffer
    };
  }

  const secrets = await buildSecretsPayload(createdAt, gitCommitHash);
  return {
    fileName: secrets.secretsName,
    contentType: "application/json",
    body: secrets.secretsBuffer
  };
}

export function getNextBackupRunsUtcForTesting(now = new Date()) {
  return getNextScheduledRuns(now);
}

export function encryptSecretsBundleForTesting(secrets: Record<string, string>, encryptionKey: string) {
  return encryptJson({ version: 1, createdAt: nowIso(), gitCommitHash: null, secrets } satisfies BackupSecretsBundle, encryptionKey);
}

export function decryptSecretsBundleForTesting(payload: string, encryptionKey: string) {
  return decryptJson<BackupSecretsBundle>(payload, encryptionKey);
}
