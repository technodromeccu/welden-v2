import { NextResponse } from "next/server";
import { createPasswordRecord, requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { readCollection, writeCollection } from "@/lib/store";
import { appendAuditEntry } from "@/lib/audit";
import { UpdateUserSchema, parseSchema } from "@/lib/schemas";
import type { AuthAccount, User } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;

  const parsed = parseSchema(UpdateUserSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  const [users, accounts] = await Promise.all([
    readCollection<User[]>("users"),
    readCollection<AuthAccount[]>("auth-accounts")
  ]);

  const user = users.find((entry) => entry.id === id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.name) user.name = body.name;
  if (body.role) user.role = body.role;
  if (body.active !== undefined) user.active = body.active;
  if (body.notificationPreference) user.notificationPreference = body.notificationPreference;

  if (body.email) {
    const duplicate = users.some((entry) => entry.id !== id && entry.email.toLowerCase() === body.email);
    if (duplicate) {
      return NextResponse.json({ error: "Another user already uses this email." }, { status: 409 });
    }
    user.email = body.email;
    const account = accounts.find((entry) => entry.userId === id);
    if (account) account.email = body.email;
  }

  if (body.password) {
    const account = accounts.find((entry) => entry.userId === id);
    if (account) {
      const passwordRecord = createPasswordRecord(body.password);
      account.salt = passwordRecord.salt;
      account.passwordHash = passwordRecord.passwordHash;
    }
  }

  await Promise.all([
    writeCollection("users", users),
    writeCollection("auth-accounts", accounts)
  ]);

  const passwordChanged = typeof body.password === "string" && body.password.trim();
  void appendAuditEntry({
    userId: auth.user.id,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: passwordChanged ? "password_changed" : "update",
    entityType: "user",
    entityId: id,
    summary: passwordChanged
      ? `Changed password for user ${user.name}`
      : `Updated user ${user.name} (${user.email})`
  });

  return NextResponse.json(user);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;
  if (auth.user.id === id) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }

  const [users, accounts] = await Promise.all([
    readCollection<User[]>("users"),
    readCollection<AuthAccount[]>("auth-accounts")
  ]);

  const nextUsers = users.filter((entry) => entry.id !== id);
  if (nextUsers.length === users.length) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const deletedUser = users.find((entry) => entry.id === id);
  const nextAccounts = accounts.filter((entry) => entry.userId !== id);
  await Promise.all([
    writeCollection("users", nextUsers),
    writeCollection("auth-accounts", nextAccounts)
  ]);

  void appendAuditEntry({
    userId: auth.user.id,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "delete",
    entityType: "user",
    entityId: id,
    summary: `Deleted user ${deletedUser?.name ?? id} (${deletedUser?.email ?? ""})`
  });

  return NextResponse.json({ ok: true });
}
