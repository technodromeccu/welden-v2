import { promises as fs } from "fs";
import path from "path";

// USE_BLOBS=true enables Netlify Blobs, but never during Next.js build phase.
// NEXT_PHASE=phase-production-build is set by Next.js during `next build`.
const isNetlifyRuntime =
  process.env.USE_BLOBS === "true" &&
  process.env.NEXT_PHASE !== "phase-production-build";

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

const runtimeDefaults: Record<string, unknown> = {
  "advisor-sessions": [],
  "email-log": [],
  "product-drafts": [],
  "preliminary-quotations": [],
  "password-reset-tokens": [],
  "audit-log": [],
  "backup-status": {
    configured: false,
    configurationError: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    latestSnapshotName: null,
    latestSecretsName: null,
    latestSnapshotId: null,
    latestSecretsId: null,
    lastError: null,
    nextScheduledRunsUtc: [],
    retentionDays: 30,
    dailyRetentionDays: 90
  }
};

function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

// ── Netlify Blobs backend ─────────────────────────────────────────────────────

async function blobRead<T>(name: string): Promise<T> {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("welden-data");
  const raw = await store.get(name, { type: "text" });

  if (raw === null) {
    // Key doesn't exist yet — seed with default and return it
    if (Object.prototype.hasOwnProperty.call(runtimeDefaults, name)) {
      const fallback = runtimeDefaults[name] as T;
      await store.setJSON(name, fallback);
      return fallback;
    }
    throw new Error(`Collection "${name}" not found and has no default.`);
  }

  return JSON.parse(raw) as T;
}

async function blobWrite<T>(name: string, value: T): Promise<void> {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("welden-data");
  await store.setJSON(name, value);
}

// ── Filesystem backend (local dev) ───────────────────────────────────────────

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

// CODE-03: Per-file in-process write serializer. Chains each write operation onto the
// previous one so concurrent calls for the same file are queued rather than interleaved.
const writeLocks = new Map<string, Promise<void>>();

async function serializedWrite(filePath: string, data: string): Promise<void> {
  const prev = writeLocks.get(filePath) ?? Promise.resolve();
  let unlock!: () => void;
  const lock = new Promise<void>((res) => { unlock = res; });
  writeLocks.set(filePath, lock);
  await prev;
  try {
    await fs.writeFile(filePath, data, "utf8");
  } finally {
    unlock();
  }
}

async function fsRead<T>(name: string): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(dataDir, `${name}.json`);

  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(stripBom(content)) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && Object.prototype.hasOwnProperty.call(runtimeDefaults, name)) {
      const fallback = runtimeDefaults[name] as T;
      await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    throw error;
  }
}

async function fsWrite<T>(name: string, value: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(dataDir, `${name}.json`);
  await serializedWrite(filePath, JSON.stringify(value, null, 2));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function readCollection<T>(name: string): Promise<T> {
  return isNetlifyRuntime ? blobRead<T>(name) : fsRead<T>(name);
}

export async function writeCollection<T>(name: string, value: T): Promise<void> {
  return isNetlifyRuntime ? blobWrite(name, value) : fsWrite(name, value);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
