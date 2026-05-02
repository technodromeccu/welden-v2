import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { runLeadFollowUpSweep } from "@/lib/leads";

function hasValidCronSecret(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  // Fix: was /^Bearers+/i (matched literal "s"), must be /^Bearer\s+/i (matches whitespace)
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const direct = request.headers.get("x-cron-secret");
  return bearer === configuredSecret || direct === configuredSecret;
}

async function authorizeSweep(request: Request) {
  if (hasValidCronSecret(request)) {
    return { authorized: true as const };
  }

  if (request.method === "GET") {
    return { authorized: false as const, response: NextResponse.json({ error: "Method not allowed." }, { status: 405 }) };
  }

  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return { authorized: false as const, response: auth.response };
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return { authorized: false as const, response: originError };
  }

  return { authorized: true as const };
}

// GET is used by Vercel Cron — it sends GET requests with Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const auth = await authorizeSweep(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const leadSweep = await runLeadFollowUpSweep();
  return NextResponse.json({ leadSweep });
}

// POST remains for manual admin triggers and secret-authenticated cron callers.
export async function POST(request: Request) {
  const auth = await authorizeSweep(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const leadSweep = await runLeadFollowUpSweep();
  return NextResponse.json({ leadSweep });
}
