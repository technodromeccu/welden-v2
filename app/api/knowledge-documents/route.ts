import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { makeId, nowIso, readCollection, writeCollection } from "@/lib/store";
import type { KnowledgeDocument } from "@/lib/types";

export async function GET() {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await readCollection<KnowledgeDocument[]>("knowledge-documents"));
}

export async function POST(request: Request) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const documents = await readCollection<KnowledgeDocument[]>("knowledge-documents");
  const body = await request.json();
  const document: KnowledgeDocument = {
    id: makeId("kb"),
    title: body.title,
    sourceType: body.sourceType ?? "text",
    summary: body.summary ?? "",
    extractedText: body.extractedText ?? "",
    active: body.active ?? true,
    fileUrl: body.fileUrl,
    updatedAt: nowIso()
  };
  documents.unshift(document);
  await writeCollection("knowledge-documents", documents);
  return NextResponse.json(document);
}
