import { NextResponse } from "next/server";
import { createPasswordRecord, requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { makeId, readCollection, writeCollection } from "@/lib/store";
import { appendAuditEntry } from "@/lib/audit";
import { createWelcomeToken, sendWelcomeSetPasswordEmail } from "@/lib/password-reset";
import { CreateUserSchema, parseSchema } from "@/lib/schemas";
import type { AuthAccount, User } from "@/lib/types";

export async function GET() {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await readCollection<User[]>("users"));
}

export async function POST(request: Request) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const parsed = parseSchema(CreateUserSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, email, password, role, active, notificationPreference } = parsed.data;

  const [users, accounts] = await Promise.all([
    readCollection<User[]>("users"),
    readCollection<AuthAccount[]>("auth-accounts")
  ]);

  if (users.some((u) => u.email.toLowerCase() === email) || accounts.some((a) => a.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const userId = makeId("user");
  const user: User = {
    id: userId,
    name,
    email,
    role,
    active,
    notificationPreference
  };
  const passwordRecord = createPasswordRecord(password);
  const account: AuthAccount = {
    userId,
    email,
    salt: passwordRecord.salt,
    passwordHash: passwordRecord.passwordHash
  };

  users.push(user);
  accounts.push(account);
  await Promise.all([
    writeCollection("users", users),
    writeCollection("auth-accounts", accounts)
  ]);

  void appendAuditEntry({
    userId: auth.user.id,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "create",
    entityType: "user",
    entityId: userId,
    summary: `Created user ${name} (${email}) with role ${role}`
  });

  // FEAT-08: Fire-and-forget welcome email with a "set your password" link (24h token).
  // Never blocks the response — if email delivery fails, the admin can use
  // the existing forgot-password flow to send a new link.
  void (async () => {
    try {
      const token = await createWelcomeToken(userId, email);
      await sendWelcomeSetPasswordEmail(email, name, token);
    } catch {
      // Intentionally swallowed — email failure should not block user creation
    }
  })();

  return NextResponse.json(user, { status: 201 });
}
