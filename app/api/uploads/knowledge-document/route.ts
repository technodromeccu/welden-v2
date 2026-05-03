import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { buildUploadedFileName, saveUploadedAsset } from "@/lib/asset-storage";
import { requireSameOrigin } from "@/lib/origin-check";

const allowedTypes = new Map([
  ["application/pdf", ".pdf"],
  ["video/mp4", ".mp4"]
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "knowledge-doc";
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

  const formData = await request.formData();
  const file = formData.get("file");
  const documentTitle = String(formData.get("documentTitle") ?? "knowledge-doc");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Document file is required" }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported document type. Only PDF and MP4 are allowed." }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Document file must be under 20MB." }, { status: 400 });
  }

  const safeSlug = slugify(documentTitle);
  const fileName = buildUploadedFileName(safeSlug, extension);
  const uploaded = await saveUploadedAsset({
    file,
    directory: "uploads/knowledge",
    fileName
  });

  return NextResponse.json({ url: uploaded.url });
}
