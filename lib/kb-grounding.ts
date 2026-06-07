import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readStoredAsset } from "./asset-storage";
import { needsGeminiRefresh, uploadFileToGemini } from "./gemini-files";
import { readCollection, writeCollection } from "./store";
import type { KnowledgeDocument } from "./types";

// Re-enable advisor grounding on admin-uploaded PDF/MP4 knowledge documents.
// PR #5 dropped the bundled-brochure grounding because it read from a local
// public/brochures/ path that doesn't exist on serverless. This module handles
// uploaded KB docs the right way:
//   - read bytes via readStoredAsset (Cloud Storage in prod, local FS in dev),
//   - upload to the Gemini Files API,
//   - persist the resulting URI on the KB doc in Firestore (KnowledgeDocument
//     already carries geminiFileUri + geminiUploadTime fields for exactly this),
//   - re-upload only when the cached URI is older than 40h (Gemini Files
//     expire at 48h).
// The advisor pipeline picks AT MOST one file-backed KB doc per request so
// latency stays bounded.

function mimeTypeFor(doc: KnowledgeDocument): string {
  return doc.sourceType === "video" ? "video/mp4" : "application/pdf";
}

function extensionFor(mimeType: string): string {
  return mimeType === "video/mp4" ? ".mp4" : ".pdf";
}

// Turn a stored fileUrl into the asset-storage key segments. Supports both the
// Cloud Storage form ("/api/assets/<key>") and the legacy local-dev form ("/<key>").
function fileUrlToKeySegments(fileUrl: string): string[] | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  const apiPrefix = "/api/assets/";
  const rawKey = trimmed.startsWith(apiPrefix)
    ? trimmed.slice(apiPrefix.length)
    : trimmed.replace(/^\/+/, "");

  if (!rawKey) return null;
  return rawKey.split("/").filter(Boolean);
}

async function persistCachedUri(doc: KnowledgeDocument, uri: string): Promise<void> {
  // Best-effort persistence — never let a write failure break answer generation.
  try {
    const documents = await readCollection<KnowledgeDocument[]>("knowledge-documents");
    const next = documents.map((entry) =>
      entry.id === doc.id
        ? { ...entry, geminiFileUri: uri, geminiUploadTime: new Date().toISOString() }
        : entry
    );
    await writeCollection("knowledge-documents", next);
  } catch (error) {
    console.warn("[kb-grounding] failed to persist Gemini URI cache", doc.id, error);
  }
}

export async function getKbDocGeminiFile(doc: KnowledgeDocument): Promise<{ fileUri: string; mimeType: string } | null> {
  if (!doc.active || !doc.fileUrl) return null;
  if (!process.env.GEMINI_API_KEY?.trim()) return null;

  const mimeType = mimeTypeFor(doc);

  // Cache hit — use the existing Gemini URI when still fresh.
  if (doc.geminiFileUri && !needsGeminiRefresh(doc.geminiUploadTime)) {
    return { fileUri: doc.geminiFileUri, mimeType };
  }

  // Re-upload path. Any failure degrades to no-file grounding — the advisor
  // still answers from the text grounding context.
  try {
    const keySegments = fileUrlToKeySegments(doc.fileUrl);
    if (!keySegments) return null;

    const asset = await readStoredAsset(keySegments);
    if (!asset) return null;

    const ext = extensionFor(mimeType);
    const tmpPath = path.join(os.tmpdir(), `kb-${doc.id}-${Date.now()}${ext}`);
    await fs.writeFile(tmpPath, asset.bytes);

    try {
      const uri = await uploadFileToGemini(tmpPath, mimeType, doc.title);
      await persistCachedUri(doc, uri);
      return { fileUri: uri, mimeType };
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  } catch (error) {
    console.warn("[kb-grounding] failed to ground KB file", doc.id, error);
    return null;
  }
}

// Pick at most one file-backed KB doc to ground on — the one that's already in
// the citations (so we don't pay the upload cost for irrelevant docs). Caps
// per-request latency growth from file grounding to a single upload.
export function pickFileBackedDocForGrounding(
  documents: KnowledgeDocument[],
  citedDocumentIds: string[]
): KnowledgeDocument | null {
  for (const id of citedDocumentIds) {
    const doc = documents.find((entry) => entry.id === id);
    if (doc?.active && doc.fileUrl) return doc;
  }
  return null;
}
