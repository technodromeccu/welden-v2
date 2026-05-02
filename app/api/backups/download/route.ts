import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createLocalBackupDownload } from "@/lib/backup";
import { apiError } from "@/lib/api-error";

export async function GET(request: Request) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") === "secrets" ? "secrets" : "bundle";

  try {
    const file = await createLocalBackupDownload(kind);
    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return apiError(error, "Unable to prepare backup download.", 500);
  }
}
