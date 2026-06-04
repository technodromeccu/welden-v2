import { promises as fs } from "fs";
import path from "path";
import { createHash } from "node:crypto";

// USE_BLOBS=true enables Netlify Blobs, but never during Next.js build phase.
// NEXT_PHASE=phase-production-build is set by Next.js during `next build`.
const isNetlifyRuntime =
  process.env.USE_BLOBS === "true" &&
  process.env.NEXT_PHASE !== "phase-production-build";

// DATA_BACKEND=firestore routes reads/writes to Firestore (Option A: one document
// per collection, value stored as a JSON string). Disabled during the Next.js build
// phase so static generation never reaches out to Firestore.
const isFirestoreRuntime =
  process.env.DATA_BACKEND === "firestore" &&
  process.env.NEXT_PHASE !== "phase-production-build";

// Unbounded collections that must NOT be stored as a single document (they would
// eventually exceed Firestore's 1 MB/doc limit). Each record becomes its own document
// keyed by its `id`. Reads return the full array ordered newest-first by `createdAt`;
// writes diff by id + content hash so only changed/new records are written and removed
// ones deleted. The public readCollection/writeCollection interface is unchanged, so
// no call sites change. Bounded + already-capped collections stay single-doc (Option A).
const ITEMIZED_COLLECTIONS = new Set(["advisor-sessions", "preliminary-quotations"]);

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
  const raw = await store.get(name, { type: "text", consistency: "strong" });

  if (raw === null) {
    // Key doesn't exist yet — try to seed from bundled data/ folder first
    try {
      const filePath = path.join(dataDir, `${name}.json`);
      const content = await fs.readFile(filePath, "utf8");
      const fallback = JSON.parse(stripBom(content)) as T;
      await store.setJSON(name, fallback);
      return fallback;
    } catch {
      // If no file exists, seed with default and return it
      if (Object.prototype.hasOwnProperty.call(runtimeDefaults, name)) {
        const fallback = runtimeDefaults[name] as T;
        await store.setJSON(name, fallback);
        return fallback;
      }
      throw new Error(`Collection "${name}" not found and has no default.`);
    }
  }

  return JSON.parse(raw) as T;
}

async function blobWrite<T>(name: string, value: T): Promise<void> {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("welden-data");
  await store.setJSON(name, value);
}

// ── Firestore backend (Option A: one doc per collection) ──────────────────────

const FIRESTORE_STATE_COLLECTION = "state";

async function firestoreRead<T>(name: string): Promise<T> {
  const { getFirestoreDb } = await import("./firebase-admin");
  const db = await getFirestoreDb();
  const ref = db.collection(FIRESTORE_STATE_COLLECTION).doc(name);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    const stored = snapshot.data() as { data?: string } | undefined;
    if (typeof stored?.data === "string") {
      return JSON.parse(stored.data) as T;
    }
  }

  // Doc missing — seed from the bundled data/ folder first, then runtime defaults.
  try {
    const filePath = path.join(dataDir, `${name}.json`);
    const content = await fs.readFile(filePath, "utf8");
    const fallback = JSON.parse(stripBom(content)) as T;
    await firestoreWrite(name, fallback);
    return fallback;
  } catch {
    if (Object.prototype.hasOwnProperty.call(runtimeDefaults, name)) {
      const fallback = runtimeDefaults[name] as T;
      await firestoreWrite(name, fallback);
      return fallback;
    }
    throw new Error(`Collection "${name}" not found and has no default.`);
  }
}

async function firestoreWrite<T>(name: string, value: T): Promise<void> {
  const { getFirestoreDb } = await import("./firebase-admin");
  const db = await getFirestoreDb();
  await db.collection(FIRESTORE_STATE_COLLECTION).doc(name).set({
    data: JSON.stringify(value),
    updatedAt: new Date().toISOString()
  });
}

// ── Firestore itemized backend (one doc per record, for unbounded collections) ─

function hashString(value: string): string {
  return createHash("sha1").update(value).digest("hex");
}

async function itemizedRead<T>(name: string): Promise<T> {
  const { getFirestoreDb } = await import("./firebase-admin");
  const db = await getFirestoreDb();
  // Firestore appends `__name__` as a deterministic tiebreak, so a single orderBy
  // gives a stable newest-first order without needing a composite index.
  const snapshot = await db.collection(name).orderBy("createdAt", "desc").get();
  const items = snapshot.docs.map((doc) => {
    const stored = doc.data() as { data?: string };
    return stored.data ? JSON.parse(stored.data) : null;
  });
  return items.filter((item) => item !== null) as T;
}

async function itemizedWrite<T>(name: string, value: T): Promise<void> {
  const items = (Array.isArray(value) ? value : []) as Array<Record<string, unknown>>;
  const { getFirestoreDb } = await import("./firebase-admin");
  const db = await getFirestoreDb();
  const collection = db.collection(name);

  // Fetch existing doc ids + content hashes only (cheap), to diff against the new array.
  const existing = await collection.select("_h").get();
  const existingHashes = new Map<string, string | undefined>(
    existing.docs.map((doc) => [doc.id, (doc.data() as { _h?: string })._h])
  );

  const writer = db.bulkWriter();
  const seen = new Set<string>();

  for (const item of items) {
    const id = String(item.id ?? "");
    if (!id) continue; // skip malformed records without an id rather than corrupt the set
    seen.add(id);
    const data = JSON.stringify(item);
    const hash = hashString(data);
    if (existingHashes.get(id) !== hash) {
      const createdAt = typeof item.createdAt === "string" ? item.createdAt : nowIso();
      void writer.set(collection.doc(id), { data, _h: hash, createdAt });
    }
  }

  for (const id of existingHashes.keys()) {
    if (!seen.has(id)) {
      void writer.delete(collection.doc(id));
    }
  }

  await writer.close();
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
  if (isFirestoreRuntime) {
    return ITEMIZED_COLLECTIONS.has(name) ? itemizedRead<T>(name) : firestoreRead<T>(name);
  }
  return isNetlifyRuntime ? blobRead<T>(name) : fsRead<T>(name);
}

export async function writeCollection<T>(name: string, value: T): Promise<void> {
  if (isFirestoreRuntime) {
    return ITEMIZED_COLLECTIONS.has(name) ? itemizedWrite(name, value) : firestoreWrite(name, value);
  }
  return isNetlifyRuntime ? blobWrite(name, value) : fsWrite(name, value);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
