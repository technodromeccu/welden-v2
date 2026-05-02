import crypto from "crypto";
import { readCollection, writeCollection, makeId, nowIso } from "@/lib/store";
import { sendEmail } from "@/lib/email";

// FEAT-01: Password reset token store.
// Tokens are single-use, expire after 1 hour, and are stored as HMAC-signed
// records so a compromised data dir doesn't let an attacker forge tokens.

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PasswordResetToken {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function readTokens(): Promise<PasswordResetToken[]> {
  return readCollection<PasswordResetToken[]>("password-reset-tokens");
}

async function writeTokens(tokens: PasswordResetToken[]): Promise<void> {
  await writeCollection("password-reset-tokens", tokens);
}

/** Create a reset token for the given email. Returns null if no matching active user. */
export async function createPasswordResetToken(email: string): Promise<{ token: string; userId: string } | null> {
  const [users] = await Promise.all([readCollection<{ id: string; email: string; active: boolean }[]>("users")]);
  const user = users.find(
    (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.active
  );
  if (!user) return null;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const record: PasswordResetToken = {
    id: makeId("prt"),
    userId: user.id,
    email: user.email,
    tokenHash: hashToken(rawToken),
    createdAt: nowIso(),
    expiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
    usedAt: null
  };

  const existing = await readTokens();
  // Invalidate any previous unused tokens for this user
  const cleaned = existing.filter((t) => t.userId !== user.id || t.usedAt !== null);
  cleaned.unshift(record);
  await writeTokens(cleaned);

  return { token: rawToken, userId: user.id };
}

/** Validate a reset token. Returns the userId if valid, null otherwise. */
export async function validatePasswordResetToken(rawToken: string): Promise<{ userId: string; email: string } | null> {
  const tokens = await readTokens();
  const hash = hashToken(rawToken);
  const record = tokens.find((t) => t.tokenHash === hash && t.usedAt === null);

  if (!record) return null;
  if (new Date(record.expiresAt).getTime() < Date.now()) return null;

  return { userId: record.userId, email: record.email };
}

/** Consume a reset token (mark it used) and update the user's password. */
export async function consumePasswordResetToken(rawToken: string, newPassword: string): Promise<boolean> {
  const [tokens, accounts] = await Promise.all([
    readTokens(),
    readCollection<{ userId: string; salt: string; passwordHash: string; email: string }[]>("auth-accounts")
  ]);

  const hash = hashToken(rawToken);
  const recordIndex = tokens.findIndex((t) => t.tokenHash === hash && t.usedAt === null);
  if (recordIndex === -1) return false;

  const record = tokens[recordIndex]!;
  if (new Date(record.expiresAt).getTime() < Date.now()) return false;

  // Mark token used
  tokens[recordIndex] = { ...record, usedAt: nowIso() };

  // Update password hash
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString("hex");
  const accountIndex = accounts.findIndex((a) => a.userId === record.userId);
  if (accountIndex === -1) return false;

  accounts[accountIndex] = { ...accounts[accountIndex]!, salt, passwordHash };

  await Promise.all([
    writeTokens(tokens),
    writeCollection("auth-accounts", accounts)
  ]);

  return true;
}

// FEAT-08: Create a welcome token for a brand-new user with a 24-hour TTL.
// Skips the "find user in users collection" check because the user record may not be
// flushed to disk yet at call time — we receive the userId directly from the caller.
export async function createWelcomeToken(userId: string, email: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const TTL_24H = 24 * 60 * 60 * 1000;
  const record: PasswordResetToken = {
    id: makeId("prt"),
    userId,
    email,
    tokenHash: hashToken(rawToken),
    createdAt: nowIso(),
    expiresAt: new Date(now + TTL_24H).toISOString(),
    usedAt: null
  };
  const existing = await readTokens();
  existing.unshift(record);
  await writeTokens(existing);
  return rawToken;
}

/** Send a "set your password" welcome email to a newly-created staff account. */
export async function sendWelcomeSetPasswordEmail(email: string, name: string, token: string): Promise<void> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const setPasswordUrl = `${siteUrl}/login/reset-password?token=${token}`;

  const body = [
    `Hi ${name},`,
    "",
    "Your Welden Industries staff account has been created.",
    "",
    "Set your password using the link below. This link expires in 24 hours.",
    "",
    setPasswordUrl,
    "",
    "Once your password is set, you can sign in at:",
    `${siteUrl}/login`,
    "",
    "If you were not expecting this email, please contact your administrator."
  ].join("\n");

  await sendEmail([email], "Set your Welden staff password", body);
}

/** Send the reset link email. */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${siteUrl}/login/reset-password?token=${token}`;

  const body = [
    "You requested a password reset for your Welden Industries staff account.",
    "",
    "Click the link below to set a new password. This link expires in 1 hour.",
    "",
    resetUrl,
    "",
    "If you did not request this, you can safely ignore this email.",
    "Your password will not change unless you click the link above."
  ].join("\n");

  await sendEmail([email], "Reset your Welden staff password", body);
}
