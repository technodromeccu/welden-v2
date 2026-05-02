import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getVisibleLeadSessionById } from "@/lib/lead-assistant-core";
import { requireSameOrigin } from "@/lib/origin-check";
import { getAdvisorSessions, updateAdvisorSessionWorkflow } from "@/lib/leads";
import { appendAuditEntry } from "@/lib/audit";
import { logError } from "@/lib/api-error";
import type { LeadCallOutcome, LeadFollowUpStatus, LeadStage } from "@/lib/types";

const leadStages: LeadStage[] = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"];
const followUpStatuses: LeadFollowUpStatus[] = ["pending", "scheduled", "due", "completed", "no_answer", "call_back_later"];
const callOutcomes: LeadCallOutcome[] = ["no_answer", "call_back_requested", "send_brochure", "send_quotation", "needs_more_details", "technical_discussion_needed", "budget_not_clear", "wrong_contact", "not_interested", "follow_up_later", "meeting_scheduled", "converted", "lost"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin", "manager", "agent"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const body = await request.json();
  const params = await context.params;
  const visibleSession = getVisibleLeadSessionById(auth.user, await getAdvisorSessions(), params.id);
  if (!visibleSession) {
    return NextResponse.json({ error: "Lead session not found." }, { status: 404 });
  }
  const stage = typeof body.stage === "string" && leadStages.includes(body.stage as LeadStage) ? body.stage as LeadStage : undefined;
  const ownerUserId = body.ownerUserId === undefined ? undefined : (typeof body.ownerUserId === "string" && body.ownerUserId.trim() ? body.ownerUserId : null);
  const nextFollowUpAt = body.nextFollowUpAt === undefined ? undefined : (typeof body.nextFollowUpAt === "string" && body.nextFollowUpAt.trim() ? body.nextFollowUpAt : null);
  const preferredCallbackAt = body.preferredCallbackAt === undefined ? undefined : (typeof body.preferredCallbackAt === "string" && body.preferredCallbackAt.trim() ? body.preferredCallbackAt : null);
  const preferredCallbackNote = body.preferredCallbackNote === undefined ? undefined : (typeof body.preferredCallbackNote === "string" && body.preferredCallbackNote.trim() ? body.preferredCallbackNote : null);
  const followUpStatus = typeof body.followUpStatus === "string" && followUpStatuses.includes(body.followUpStatus as LeadFollowUpStatus) ? body.followUpStatus as LeadFollowUpStatus : undefined;
  const lastContactedAt = body.lastContactedAt === undefined ? undefined : (typeof body.lastContactedAt === "string" && body.lastContactedAt.trim() ? body.lastContactedAt : null);
  const callOutcome = body.callOutcome === undefined ? undefined : (typeof body.callOutcome === "string" && callOutcomes.includes(body.callOutcome as LeadCallOutcome) ? body.callOutcome as LeadCallOutcome : null);
  const callSummary = body.callSummary === undefined ? undefined : (typeof body.callSummary === "string" && body.callSummary.trim() ? body.callSummary : null);
  const note = typeof body.note === "string" ? body.note : undefined;
  const closeReason = body.closeReason === undefined ? undefined : (typeof body.closeReason === "string" && body.closeReason.trim() ? body.closeReason : null);
  const closeReasonNote = body.closeReasonNote === undefined ? undefined : (typeof body.closeReasonNote === "string" && body.closeReasonNote.trim() ? body.closeReasonNote : null);

  try {
    const session = await updateAdvisorSessionWorkflow({
      sessionId: params.id,
      actorUserId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      stage,
      ownerUserId,
      nextFollowUpAt,
      preferredCallbackAt,
      preferredCallbackNote,
      followUpStatus,
      lastContactedAt,
      callOutcome,
      callSummary,
      note,
      closeReason,
      closeReasonNote
    });

    // FEAT-02: audit lead workflow updates
    const changedFields = [stage && "stage", ownerUserId !== undefined && "owner", note && "note", callOutcome && "callOutcome", closeReason !== undefined && "closeReason"]
      .filter(Boolean).join(", ") || "workflow fields";
    void appendAuditEntry({
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "update",
      entityType: "lead",
      entityId: params.id,
      summary: `Updated ${changedFields}`
    });

    return NextResponse.json(session);
  } catch (error) {
    logError(error, { route: "/api/advisor-sessions/[id]", method: "PATCH" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update lead." }, { status: 400 });
  }
}
