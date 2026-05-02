import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { writeCollection } from "@/lib/store";
import type { AuthAccount, User } from "@/lib/types";

function hasValidBootstrapSecret(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const direct = request.headers.get("x-cron-secret");
  return bearer === configuredSecret || direct === configuredSecret;
}

async function authorizeBootstrap(request: Request) {
  if (hasValidBootstrapSecret(request)) {
    return { authorized: true as const };
  }

  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return { authorized: false as const, response: auth.response };
  }

  return { authorized: true as const };
}

async function readBundledJson<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function bootstrapSeedCollections() {
  const [users, authAccounts] = await Promise.all([
    readBundledJson<User[]>("users.json"),
    readBundledJson<AuthAccount[]>("auth-accounts.json")
  ]);

  await Promise.all([
    writeCollection("users", users),
    writeCollection("auth-accounts", authAccounts)
  ]);

  return {
    ok: true,
    users: users.length,
    authAccounts: authAccounts.length
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Bootstrap seeding is disabled in production." }, { status: 403 });
  }

  const auth = await authorizeBootstrap(request);
  if (!auth.authorized) {
    return auth.response;
  }
  if (!hasValidBootstrapSecret(request)) {
    const originError = requireSameOrigin(request);
    if (originError) {
      return originError;
    }
  }

  const result = await bootstrapSeedCollections();
  return NextResponse.json(result);
}
