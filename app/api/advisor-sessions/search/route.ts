import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getVisibleLeadSessionsForUser } from "@/lib/lead-assistant-core";
import { getAdvisorSessions } from "@/lib/leads";
import { readCollection } from "@/lib/store";
import type { User } from "@/lib/types";

// FEAT-10: Server-side full-text search across ALL sessions — not limited to the paginated page.
// Used by the admin search input so agents can find any lead regardless of Load More state.
// GET /api/advisor-sessions/search?q=...&limit=50
export async function GET(request: Request) {
  const auth = await requireApiUser(["admin", "manager", "agent"]);
  if ("response" in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  if (!query) {
    return NextResponse.json({ sessions: [] });
  }

  const [sessions, users] = await Promise.all([
    getAdvisorSessions(),
    readCollection<User[]>("users")
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const visible = getVisibleLeadSessionsForUser(auth.user, sessions);

  const results = visible
    .filter((s) => {
      const ownerName = s.workflow?.ownerUserId ? (userMap.get(s.workflow.ownerUserId) ?? "") : "";
      const haystack = [
        s.lead.name,
        s.lead.email,
        s.lead.phone,
        s.lead.company ?? "",
        s.recommendation.recommendedCategory ?? "",
        s.workflow?.stage ?? "",
        s.workflow?.quotationReference ?? "",
        ownerName
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, limit);

  return NextResponse.json({ sessions: results, total: results.length });
}
