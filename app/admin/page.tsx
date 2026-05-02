import { AdminPanel } from "@/components/AdminPanel";
import { requirePageUser } from "@/lib/auth";
import { getDashboardSnapshotForUser, type DashboardView } from "@/lib/dashboard";

// Always fetch fresh data — never serve a cached snapshot of the admin panel
export const dynamic = "force-dynamic";

function getInitialView(role: "admin" | "manager" | "agent"): DashboardView {
  return role === "agent" ? "leads" : "dashboard";
}

export default async function AdminPage() {
  const user = await requirePageUser(["admin", "manager", "agent"]);
  const data = await getDashboardSnapshotForUser(user, getInitialView(user.role));
  return <AdminPanel initialData={data} currentUser={user} />;
}
