"use client";

import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { User } from "@/lib/types";

type UsersViewProps = {
  users: User[];
  currentUser: User;
  newUser: { name: string; email: string; role: User["role"]; password: string; notificationPreference: User["notificationPreference"] };
  setNewUser: Dispatch<SetStateAction<{ name: string; email: string; role: User["role"]; password: string; notificationPreference: User["notificationPreference"] }>>;
  updateUser: (id: string, payload: Record<string, string | boolean>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  createUser: () => Promise<void>;
  getCreateButtonLabel: (key: string, label: string) => string;
};

export function UsersView(props: UsersViewProps) {
  const { users, currentUser, newUser, setNewUser, updateUser, deleteUser, createUser, getCreateButtonLabel } = props;

  return <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]"><Card className="border border-outline-variant/20 shadow-sm"><CardHeader><CardTitle>Team directory</CardTitle><CardDescription>Add staff, suspend access, or remove unused accounts.</CardDescription></CardHeader><CardContent className="space-y-3">{users.map((u) => <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low p-4"><div className="min-w-0"><div className="text-sm font-semibold text-on-surface">{u.name}</div><div className="truncate text-sm text-secondary">{u.email}</div></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{u.role}</Badge><Badge variant={u.active ? "success" : "warning"}>{u.active ? "Active" : "Suspended"}</Badge>{currentUser.role === "admin" ? <><Button variant="secondary" size="sm" onClick={() => void updateUser(u.id, { active: !u.active })}>{u.active ? "Suspend" : "Reactivate"}</Button>{u.id !== currentUser.id ? <Button variant="outline" size="sm" onClick={() => void deleteUser(u.id)}>Delete</Button> : null}</> : null}</div></div>)}</CardContent></Card>{currentUser.role === "admin" ? <Card className="border border-outline-variant/20 shadow-sm"><CardHeader><CardTitle>Add user</CardTitle><CardDescription>Create an internal account with role-based access.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><Input placeholder="Full name" value={newUser.name} onChange={(e) => setNewUser((c) => ({ ...c, name: e.target.value }))} /><Input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser((c) => ({ ...c, email: e.target.value }))} /><Input placeholder="Temporary password" value={newUser.password} onChange={(e) => setNewUser((c) => ({ ...c, password: e.target.value }))} /><select className="h-10 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={newUser.role} onChange={(e) => setNewUser((c) => ({ ...c, role: e.target.value as User['role'] }))}><option value="agent">Agent</option><option value="manager">Manager</option><option value="admin">Admin</option></select><select className="h-10 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none md:col-span-2" value={newUser.notificationPreference} onChange={(e) => setNewUser((c) => ({ ...c, notificationPreference: e.target.value as User['notificationPreference'] }))}><option value="assigned_only">Assigned leads only</option><option value="all">All notifications</option></select><div className="md:col-span-2"><Button onClick={() => void createUser()}>{getCreateButtonLabel("user-create", "Create user")}</Button></div></CardContent></Card> : null}</div>;
}


