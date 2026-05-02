import { NextResponse } from "next/server";
import { readStoredAsset } from "@/lib/asset-storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const params = await context.params;
  const asset = await readStoredAsset(params.key);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return new NextResponse(asset.bytes, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"`
    }
  });
}
