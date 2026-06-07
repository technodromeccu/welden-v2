import { requirePageUser } from "@/lib/auth";
import { AdminGuide } from "@/components/admin/help/AdminGuide";

// Always serve fresh — auth state changes shouldn't hit a static cache.
export const dynamic = "force-dynamic";

export default async function AdminHelpPage() {
  const user = await requirePageUser(["admin", "manager", "agent"]);
  return <AdminGuide currentUserRole={user.role} />;
}
