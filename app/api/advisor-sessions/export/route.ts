import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getVisibleLeadSessionsForUser } from "@/lib/lead-assistant-core";
import { getAdvisorSessions } from "@/lib/leads";
import { readCollection } from "@/lib/store";
import type { LeadStage, Settings, User } from "@/lib/types";

const LEAD_STAGES: LeadStage[] = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"];

function escapeCsvCell(value: string | null | undefined): string {
  const str = value ?? "";
  // Wrap in quotes if the cell contains a comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtDateCsv(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
  } catch {
    return iso;
  }
}

// WF-06: Export the current filtered lead set as CSV.
// Supports: ?stage=new,quoted  ?ownerUserId=user_xxx  (comma-separated stage list)
export async function GET(request: Request) {
  const auth = await requireApiUser(["admin", "manager"]);
  if ("response" in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const stageParam = searchParams.get("stage");
  const ownerParam = searchParams.get("ownerUserId");

  const stageFilter: LeadStage[] | null = stageParam
    ? stageParam.split(",").map((s) => s.trim()).filter((s): s is LeadStage => LEAD_STAGES.includes(s as LeadStage))
    : null;

  const [sessions, users, settings] = await Promise.all([
    getAdvisorSessions(),
    readCollection<User[]>("users"),
    readCollection<Settings>("settings")
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const visibleSessions = getVisibleLeadSessionsForUser(auth.user, sessions);

  const filtered = visibleSessions.filter((s) => {
    if (stageFilter?.length && !stageFilter.includes(s.workflow?.stage ?? "new")) return false;
    if (ownerParam && s.workflow?.ownerUserId !== ownerParam) return false;
    return true;
  });

  const headers = [
    "Name", "Email", "Phone", "Company",
    "Stage", "Owner", "Machine Interest",
    "Created", "Last Contacted", "Next Follow-up",
    "Quotation Reference", "Quote Issued",
    "Follow-up Status"
  ];

  const rows = filtered.map((s) => [
    s.lead.name,
    s.lead.email,
    s.lead.phone,
    s.lead.company ?? "",
    s.workflow?.stage ?? "new",
    s.workflow?.ownerUserId ? (userMap.get(s.workflow.ownerUserId) ?? s.workflow.ownerUserId) : "Unassigned",
    s.recommendation.recommendedCategory ?? "",
    fmtDateCsv(s.createdAt),
    fmtDateCsv(s.workflow?.lastContactedAt),
    fmtDateCsv(s.workflow?.nextFollowUpAt),
    s.workflow?.quotationReference ?? "",
    s.workflow?.quoteIssued ? "Yes" : "No",
    s.workflow?.followUpStatus ?? ""
  ]);

  const csvLines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(","))
  ];

  const csv = csvLines.join("\r\n");
  const filename = `welden-leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
