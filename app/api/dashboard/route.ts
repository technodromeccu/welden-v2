import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getDashboardSnapshotForUser, type DashboardView } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const allowedViews = new Set<DashboardView>([
  "dashboard",
  "leads",
  "machines",
  "site content",
  "quotation templates",
  "knowledge base",
  "users",
  "settings",
  "full"
]);

export async function GET(request: Request) {
  const auth = await requireApiUser(["admin", "manager", "agent"]);
  if ("response" in auth) {
    return auth.response;
  }

  const searchParams = new URL(request.url).searchParams;
  const viewParam = searchParams.get("view");
  const view = allowedViews.has(viewParam as DashboardView) ? (viewParam as DashboardView) : "full";
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  return NextResponse.json(await getDashboardSnapshotForUser(auth.user, view, offset));
}
