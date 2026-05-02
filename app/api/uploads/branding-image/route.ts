import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { buildUploadedFileName, saveUploadedAsset } from "@/lib/asset-storage";
import { requireSameOrigin } from "@/lib/origin-check";
import { getUploadSizeError, MAX_PRODUCT_IMAGE_BYTES } from "@/lib/upload-validation";
const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"]
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "branding-image";
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
  const assetName = String(formData.get("assetName") ?? "quotation-logo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const sizeError = getUploadSizeError(file, "Image file", MAX_PRODUCT_IMAGE_BYTES);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  const safeName = slugify(assetName);
  const fileName = buildUploadedFileName(safeName, extension);
  const uploaded = await saveUploadedAsset({
    file,
    directory: "images/branding/uploads",
    fileName
  });

  return NextResponse.json({ url: uploaded.url });
}
