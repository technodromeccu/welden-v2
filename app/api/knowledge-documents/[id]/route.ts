import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { deleteStoredAsset, fileUrlToAssetKey } from "@/lib/asset-storage";
import { requireSameOrigin } from "@/lib/origin-check";
import { nowIso, readCollection, writeCollection } from "@/lib/store";
import type { KnowledgeDocument } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;
  const body = await request.json();
  const documents = await readCollection<KnowledgeDocument[]>("knowledge-documents");
  const document = documents.find((entry) => entry.id === id);

  if (!document) {
    return NextResponse.json({ error: "Knowledge document not found" }, { status: 404 });
  }

  if (typeof body.title === "string") {
    document.title = body.title;
  }
  if (typeof body.summary === "string") {
    document.summary = body.summary;
  }
  if (typeof body.extractedText === "string") {
    document.extractedText = body.extractedText;
  }
  if (typeof body.active === "boolean") {
    document.active = body.active;
  }
  if (typeof body.sourceType === "string") {
    document.sourceType = body.sourceType;
  }
  if (typeof body.fileUrl === "string") {
    document.fileUrl = body.fileUrl;
  }
  document.updatedAt = nowIso();

  await writeCollection("knowledge-documents", documents);
  return NextResponse.json(document);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;
  const documents = await readCollection<KnowledgeDocument[]>("knowledge-documents");
  const target = documents.find((entry) => entry.id === id);

  if (!target) {
    return NextResponse.json({ error: "Knowledge document not found" }, { status: 404 });
  }

  // 1. Remove the Cloud Storage / Blob / local file if this doc had an uploaded
  //    source. Best-effort — a missing file shouldn't block the Firestore delete.
  let assetRemoved: boolean | null = null;
  const assetKey = fileUrlToAssetKey(target.fileUrl);
  if (assetKey) {
    assetRemoved = await deleteStoredAsset(assetKey);
  }

  // 2. Hard-delete the Firestore document.
  const remaining = documents.filter((entry) => entry.id !== id);
  await writeCollection("knowledge-documents", remaining);

  return NextResponse.json({
    deletedId: id,
    assetRemoved,
    title: target.title
  });
}
