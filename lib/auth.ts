import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { buildSessionToken, canAccessRole, createPasswordRecord, hashPassword } from "@/lib/auth-core";
import { readCollection } from "@/lib/store";
import type { AuthAccount, Role, User } from "@/lib/types";

const SESSION_COOKIE = "welden_session";

type SessionPayload = {
  userId: string;
  role: Role;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? "welden-dev-session-secret";
  if (process.env.NODE_ENV === "production" && secret === "welden-dev-session-secret") {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
  return secret;
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

async function readUsers() {
  return readCollection<User[]>("users");
}

async function readAccounts() {
  return readCollection<AuthAccount[]>("auth-accounts");
}

export { buildSessionToken, canAccessRole, createPasswordRecord, hashPassword };

export async function authenticateUser(email: string, password: string) {
  const [users, accounts] = await Promise.all([readUsers(), readAccounts()]);
  const normalizedEmail = email.trim().toLowerCase();
  const account = accounts.find((entry) => entry.email.toLowerCase() === normalizedEmail);

  if (!account) {
    return null;
  }

  const expectedHash = hashPassword(password, account.salt);
  const valid = crypto.timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(account.passwordHash, "hex"));
  if (!valid) {
    return null;
  }

  return users.find((user) => user.id === account.userId && user.active) ?? null;
}

function readSessionPayload(token: string | undefined | null): SessionPayload | null {
  try {
    if (!token) {
      return null;
    }

    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = sign(encodedPayload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(decode(encodedPayload)) as SessionPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = readSessionPayload(token);
  if (!payload) {
    return null;
  }

  const users = await readUsers();
  return users.find((user) => user.id === payload.userId && user.active && user.role === payload.role) ?? null;
}

export async function setSessionCookie(user: User) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, buildSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function requirePageUser(allowedRoles?: Role[]) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (allowedRoles && !canAccessRole(user, allowedRoles)) {
    redirect("/login?forbidden=1");
  }

  return user;
}

export async function requireApiUser(allowedRoles?: Role[]) {
  const user = await getSessionUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (allowedRoles && !canAccessRole(user, allowedRoles)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}
