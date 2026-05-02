import type { AdvisorSession, LeadCallOutcome, LeadSuggestedAction, User } from "./types.ts";

export function getVisibleLeadSessionsForUser(user: User, sessions: AdvisorSession[]) {
  if (user.role === "admin" || user.role === "manager") {
    return sessions;
  }

  return sessions.filter((session) => session.workflow?.ownerUserId === user.id || !session.workflow?.ownerUserId);
}

export function getVisibleLeadSessionById(user: User, sessions: AdvisorSession[], sessionId: string) {
  return getVisibleLeadSessionsForUser(user, sessions).find((session) => session.id === sessionId) ?? null;
}

export function actionLabel(action: LeadSuggestedAction | null | undefined) {
  switch (action) {
    case "call_again": return "Call again";
    case "schedule_callback": return "Schedule callback";
    case "send_brochure": return "Send brochure";
    case "prepare_quotation": return "Prepare quotation";
    case "collect_details": return "Collect missing details";
    case "technical_review": return "Arrange technical review";
    case "qualify_budget": return "Qualify budget";
    case "correct_contact": return "Correct contact details";
    case "close_lost": return "Close as lost";
    case "schedule_follow_up": return "Schedule follow-up";
    case "schedule_meeting": return "Schedule meeting";
    case "mark_won": return "Mark won";
    default: return null;
  }
}

export function outcomeLabel(outcome: LeadCallOutcome | null | undefined) {
  return outcome ? outcome.replaceAll("_", " ") : null;
}

export function summarizeLeadAssistantMemory(workflow: AdvisorSession["workflow"]) {
  const parts = [
    workflow?.lastCallOutcome ? `Last call outcome: ${outcomeLabel(workflow.lastCallOutcome)}.` : null,
    workflow?.lastCallSummary ? workflow.lastCallSummary : null,
    workflow?.nextSuggestedAction ? `Next action: ${actionLabel(workflow.nextSuggestedAction)}.` : null
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export function buildLeadPendingAssistantPrompt(session: AdvisorSession, workflow: AdvisorSession["workflow"]) {
  if (!workflow || ["won", "lost"].includes(workflow.stage)) {
    return null;
  }

  if (workflow.lastContactedAt && !workflow.lastCallOutcome) {
    return "You logged contact on this lead. What was the outcome of the phone call?";
  }

  if (workflow.quoteIssued && workflow.quotedAt && !workflow.lastCallOutcome) {
    return "A quotation was sent for this lead. Have you spoken with the customer yet, and what was the outcome?";
  }

  if (workflow.lastCallOutcome === "send_brochure") {
    return "You promised a brochure to this lead. Has the brochure been sent and acknowledged?";
  }

  if (workflow.lastCallOutcome === "needs_more_details") {
    return "This lead is waiting on missing customer details. Which details are still pending?";
  }

  if (workflow.lastCallOutcome === "technical_discussion_needed") {
    return "This lead needs a technical discussion. Should this be escalated to admin or engineering now?";
  }

  const target = workflow.preferredCallbackAt ?? workflow.nextFollowUpAt ?? workflow.firstCallDueAt ?? null;
  if (target && new Date(target).getTime() <= Date.now() && !workflow.lastCallOutcome) {
    return "This lead is due for follow-up now. Once the call is done, please log the outcome so I can track the next step.";
  }

  return null;
}
