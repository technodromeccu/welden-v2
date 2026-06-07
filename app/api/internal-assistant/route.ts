import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { logError } from "@/lib/api-error";
import { getVisibleLeadSessionById } from "@/lib/lead-assistant-core";
import { requireSameOrigin } from "@/lib/origin-check";
import { getAdvisorSessions } from "@/lib/leads";
import { answerInternalAssistantQuery, applyAssistantProposal, logAssistantCallOutcome } from "@/lib/internal-lead-assistant";
import type { AssistantProposal, InternalAssistantResponse, LeadCallOutcome } from "@/lib/types";

// Runs a Gemini call against the CRM context; can exceed the 10s default. Raise the
// function timeout (Netlify honors Next's maxDuration up to the plan's 26s max).
export const maxDuration = 26;

const callOutcomes: LeadCallOutcome[] = ["no_answer", "call_back_requested", "send_brochure", "send_quotation", "needs_more_details", "technical_discussion_needed", "budget_not_clear", "wrong_contact", "not_interested", "follow_up_later", "meeting_scheduled", "converted", "lost"];

export async function POST(request: Request) {
  const auth = await requireApiUser(["admin", "manager", "agent"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  try {
    const body = await request.json() as {
      message?: string;
      selectedLeadId?: string | null;
      action?: "query" | "log_call_outcome" | "apply_proposal";
      sessionId?: string;
      callOutcome?: LeadCallOutcome;
      callSummary?: string | null;
      proposal?: AssistantProposal;
    };

    if (body.action === "log_call_outcome") {
      if (!body.sessionId || !body.callOutcome || !callOutcomes.includes(body.callOutcome)) {
        return NextResponse.json({ error: "A valid lead and call outcome are required." }, { status: 400 });
      }
      const visibleSession = getVisibleLeadSessionById(auth.user, await getAdvisorSessions(), body.sessionId);
      if (!visibleSession) {
        return NextResponse.json({ error: "Lead session not found." }, { status: 404 });
      }

      const session = await logAssistantCallOutcome({
        userId: auth.user.id,
        userName: auth.user.name,
        userRole: auth.user.role,
        sessionId: body.sessionId,
        callOutcome: body.callOutcome,
        callSummary: body.callSummary ?? null
      });

      return NextResponse.json({ ok: true, session });
    }

    if (body.action === "apply_proposal") {
      if (!body.proposal) {
        return NextResponse.json({ error: "A proposal is required." }, { status: 400 });
      }

      const visibleSession = getVisibleLeadSessionById(auth.user, await getAdvisorSessions(), body.proposal.leadId);
      if (!visibleSession) {
        return NextResponse.json({ error: "Lead session not found." }, { status: 404 });
      }

      const result = await applyAssistantProposal({
        user: auth.user,
        proposal: body.proposal
      });

      return NextResponse.json({ ok: true, ...result });
    }

    const result = await answerInternalAssistantQuery({
      user: auth.user,
      message: body.message ?? "",
      selectedLeadId: body.selectedLeadId ?? null
    });

    return NextResponse.json(result satisfies InternalAssistantResponse);
  } catch (error) {
    logError(error, { route: "/api/internal-assistant", method: "POST" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to answer right now." }, { status: 400 });
  }
}
