import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { runBackupJob } from "@/lib/backup";
import { apiError } from "@/lib/api-error";
import { requireSameOrigin } from "@/lib/origin-check";

function isBackupCronAuthorized(request: Request) {
  const configuredSecret = process.env.BACKUP_CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${configuredSecret}`) {
    return true;
  }

  return request.headers.get("x-backup-cron-secret") === configuredSecret;
}

async function handleBackupRun(request: Request) {
  const cronAuthorized = isBackupCronAuthorized(request);
  if (request.method === "GET" && !cronAuthorized) {
    return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
  }

  if (!cronAuthorized) {
    const auth = await requireApiUser(["admin"]);
    if ("response" in auth) {
      return auth.response;
    }
    const originError = requireSameOrigin(request);
    if (originError) {
      return originError;
    }
  }

  try {
    const result = await runBackupJob({ triggeredBy: cronAuthorized ? "scheduled" : "manual" });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "Unable to run backup.", 500);
  }
}

// GET is reserved for cron callers that authenticate with BACKUP_CRON_SECRET.
export async function GET(request: Request) {
  return handleBackupRun(request);
}

// POST is used for manual admin triggers and secret-authenticated cron callers.
export async function POST(request: Request) {
  return handleBackupRun(request);
}
