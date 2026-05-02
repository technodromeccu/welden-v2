import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
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
  document.updatedAt = nowIso();

  await writeCollection("knowledge-documents", documents);
  return NextResponse.json(document);
}
