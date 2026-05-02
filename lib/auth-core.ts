import crypto from "crypto";
import type { Role, User } from "@/lib/types";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

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

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

export function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function createPasswordRecord(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, passwordHash: hashPassword(password, salt) };
}

export function buildSessionToken(user: Pick<User, "id" | "role">) {
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function canAccessRole(user: Pick<User, "role">, allowedRoles: Role[]) {
  return allowedRoles.includes(user.role);
}
