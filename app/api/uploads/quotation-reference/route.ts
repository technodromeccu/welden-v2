import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { buildUploadedFileName, saveUploadedAsset } from "@/lib/asset-storage";
import { requireSameOrigin } from "@/lib/origin-check";
import { getUploadSizeError, MAX_QUOTATION_REFERENCE_BYTES } from "@/lib/upload-validation";
const allowedTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/msword", ".doc"]
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "quotation-reference";
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
  const templateTitle = String(formData.get("templateTitle") ?? "quotation-reference");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Reference document is required" }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported document type" }, { status: 400 });
  }

  const sizeError = getUploadSizeError(file, "Reference document", MAX_QUOTATION_REFERENCE_BYTES);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  const safeSlug = slugify(templateTitle);
  const fileName = buildUploadedFileName(safeSlug, extension);
  const uploaded = await saveUploadedAsset({
    file,
    directory: "uploads/quotations",
    fileName
  });

  return NextResponse.json({ url: uploaded.url });
}
