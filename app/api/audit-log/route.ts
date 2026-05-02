import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { readCollection } from "@/lib/store";
import { apiError } from "@/lib/api-error";
import type { AuditEntry } from "@/lib/audit";

export async function GET(request: Request) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10) || 100));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const log = await readCollection<AuditEntry[]>("audit-log");
    return NextResponse.json({
      entries: log.slice(offset, offset + limit),
      total: log.length
    });
  } catch (error) {
    return apiError(error, "Unable to read audit log.", 500);
  }
}
