import crypto from "crypto";
import path from "path";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";

type AssetDirectory = "brochures/uploads" | "images/machines/uploads" | "images/branding/uploads" | "uploads/quotations" | "uploads/knowledge";

const isBlobAssetRuntime =
  process.env.USE_BLOBS === "true" &&
  process.env.NEXT_PHASE !== "phase-production-build";

const isFirebaseAssetRuntime =
  process.env.DATA_BACKEND === "firestore" &&
  process.env.NEXT_PHASE !== "phase-production-build";

const contentTypeByExtension = new Map([
  [".pdf", "application/pdf"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"]
]);

function joinPublicPath(relativePath: string) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "public", ...relativePath.split("/"));
}

function sanitizeSegments(value: string[]) {
  return value
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""));
}

function assertInsidePublic(resolvedPath: string) {
  const publicRoot = path.resolve(joinPublicPath(""));
  const target = path.resolve(resolvedPath);
  if (target !== publicRoot && !target.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error("Refusing to access an asset outside the public directory.");
  }
}

function encodeAssetKey(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getContentTypeFromKey(key: string) {
  const extension = path.extname(key).toLowerCase();
  return contentTypeByExtension.get(extension) ?? "application/octet-stream";
}

async function getAssetStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore("welden-assets");
}

export function createAssetUrl(key: string) {
  return `/api/assets/${encodeAssetKey(key)}`;
}

export function isBlobAssetEnabled() {
  return isBlobAssetRuntime;
}

export async function saveUploadedAsset(input: {
  file: File;
  directory: AssetDirectory;
  fileName: string;
}) {
  const key = `${input.directory}/${input.fileName}`;
  const raw = await input.file.arrayBuffer();
  const bytes = Buffer.from(raw);
  const contentType = input.file.type || getContentTypeFromKey(key);

  if (isFirebaseAssetRuntime) {
    const { getStorageBucket } = await import("./firebase-admin");
    const bucket = await getStorageBucket();
    await bucket.file(key).save(bytes, {
      contentType,
      metadata: { metadata: { originalName: input.file.name } }
    });
    return { key, url: createAssetUrl(key) };
  }

  if (isBlobAssetRuntime) {
    const store = await getAssetStore();
    await store.set(key, raw, {
      metadata: {
        contentType,
        originalName: input.file.name
      }
    });
    return { key, url: createAssetUrl(key) };
  }

  const outputPath = joinPublicPath(key);
  assertInsidePublic(outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
  return { key, url: `/${key}` };
}

export async function readStoredAsset(keySegments: string[]) {
  const key = sanitizeSegments(keySegments).join("/");
  if (!key) {
    return null;
  }

  if (isFirebaseAssetRuntime) {
    const { getStorageBucket } = await import("./firebase-admin");
    const bucket = await getStorageBucket();
    const fileRef = bucket.file(key);
    const [exists] = await fileRef.exists();
    if (!exists) {
      return null;
    }
    const [buffer] = await fileRef.download();
    const [meta] = await fileRef.getMetadata();
    const originalName = (meta.metadata as { originalName?: string } | undefined)?.originalName;
    return {
      key,
      bytes: Buffer.from(buffer),
      contentType: meta.contentType || getContentTypeFromKey(key),
      fileName: originalName || path.basename(key)
    };
  }

  if (isBlobAssetRuntime) {
    const store = await getAssetStore();
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result) {
      return null;
    }

    const metadata = result.metadata as { contentType?: string; originalName?: string } | undefined;
    return {
      key,
      bytes: Buffer.from(result.data),
      contentType: metadata?.contentType || getContentTypeFromKey(key),
      fileName: metadata?.originalName || path.basename(key)
    };
  }

  try {
    const outputPath = joinPublicPath(key);
    assertInsidePublic(outputPath);
    return {
      key,
      bytes: await readFile(outputPath),
      contentType: getContentTypeFromKey(key),
      fileName: path.basename(outputPath)
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function buildUploadedFileName(prefix: string, extension: string) {
  return `${prefix}-${crypto.randomUUID()}${extension}`;
}

// Best-effort asset deletion. Mirrors readStoredAsset's backend selection
// (Firebase Storage → Netlify Blobs → local public/). Returns true if the
// asset was removed (or didn't exist), false on a real failure. Never throws —
// callers should treat a false return as "asset cleanup did not succeed" and
// decide whether to proceed with the rest of their work.
export async function deleteStoredAsset(keySegments: string[]): Promise<boolean> {
  const key = sanitizeSegments(keySegments).join("/");
  if (!key) return false;

  try {
    if (isFirebaseAssetRuntime) {
      const { getStorageBucket } = await import("./firebase-admin");
      const bucket = await getStorageBucket();
      const fileRef = bucket.file(key);
      const [exists] = await fileRef.exists();
      if (!exists) return true;
      await fileRef.delete();
      return true;
    }

    if (isBlobAssetRuntime) {
      const store = await getAssetStore();
      await store.delete(key);
      return true;
    }

    const outputPath = joinPublicPath(key);
    assertInsidePublic(outputPath);
    try {
      await unlink(outputPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
      throw error;
    }
    return true;
  } catch (error) {
    console.warn("[asset-storage] deleteStoredAsset failed", key, error);
    return false;
  }
}

// Convert a stored fileUrl (either "/api/assets/<key>" for Cloud Storage / Blobs,
// or "/<key>" for the legacy local-dev form) into the key segments expected by
// deleteStoredAsset / readStoredAsset. Returns null if the URL is empty or
// doesn't point at a stored asset.
export function fileUrlToAssetKey(fileUrl: string | null | undefined): string[] | null {
  const trimmed = (fileUrl ?? "").trim();
  if (!trimmed) return null;

  const apiPrefix = "/api/assets/";
  const rawKey = trimmed.startsWith(apiPrefix)
    ? trimmed.slice(apiPrefix.length)
    : trimmed.replace(/^\/+/, "");

  if (!rawKey) return null;
  return rawKey.split("/").filter(Boolean).map((seg) => decodeURIComponent(seg));
}
