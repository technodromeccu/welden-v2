import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getBackupStatusPayload } from "@/lib/backup";
import { apiError } from "@/lib/api-error";

export async function GET() {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }

  try {
    return NextResponse.json(await getBackupStatusPayload());
  } catch (error) {
    return apiError(error, "Unable to read backup status.", 500);
  }
}
