import { GoogleAIFileManager } from "@google/generative-ai/server";
import { nowIso } from "./store";

let _fileManager: GoogleAIFileManager | null = null;

function getFileManager() {
  if (!_fileManager) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _fileManager = new GoogleAIFileManager(apiKey);
  }
  return _fileManager;
}

/**
 * Uploads a file to Gemini File API and returns its URI.
 * Files expire after 48 hours.
 */
export async function uploadFileToGemini(filePath: string, mimeType: string, displayName?: string) {
  const manager = getFileManager();
  const uploadResult = await manager.uploadFile(filePath, {
    mimeType,
    displayName
  });
  return uploadResult.file.uri;
}

/**
 * Checks if 40 hours have passed since the provided ISO string or timestamp.
 * We refresh at 40 hours to be safe since Gemini files expire at 48 hours.
 */
export function needsGeminiRefresh(uploadTime?: string | number | null): boolean {
  if (!uploadTime) return true;
  const time = typeof uploadTime === "string" ? new Date(uploadTime).getTime() : uploadTime;
  const now = Date.now();
  const hoursSinceUpload = (now - time) / (1000 * 60 * 60);
  return hoursSinceUpload > 40;
}

const staticFileCache = new Map<string, { uri: string; time: number }>();

export async function getCachedStaticFileUri(filePath: string, mimeType: string, displayName: string) {
  const cached = staticFileCache.get(filePath);
  if (cached && !needsGeminiRefresh(cached.time)) {
    return cached.uri;
  }
  const uri = await uploadFileToGemini(filePath, mimeType, displayName);
  staticFileCache.set(filePath, { uri, time: Date.now() });
  return uri;
}
