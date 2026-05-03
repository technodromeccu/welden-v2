import { generateGeminiJson } from "./gemini";
import { getAdvisorSessions, updateAdvisorSessionWorkflow } from "./leads";
import { actionLabel, getVisibleLeadSessionsForUser, outcomeLabel } from "./lead-assistant-core";
import type { AdvisorSession, AssistantProposal, InternalAssistantResponse, LeadCallOutcome, LeadStage, Role, User } from "./types";

function openAction(session: AdvisorSession): AssistantProposal {
  return { type: "open_lead", leadId: session.id, label: `Open ${session.lead.name}` };
}

function scheduleAction(session: AdvisorSession): AssistantProposal {
  return {
    type: "schedule_follow_up",
    leadId: session.id,
    label: `Schedule follow-up for ${session.lead.name}`,
    dueAt: session.workflow?.nextFollowUpAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    note: session.workflow?.pendingAssistantPrompt ?? `Follow up with ${session.lead.name} on the pending requirement.`,
    requiresConfirmation: true
  };
}

function stageAction(session: AdvisorSession, stage: LeadStage, note: string): AssistantProposal {
  return {
    type: "suggest_stage_change",
    leadId: session.id,
    label: `Move ${session.lead.name} to ${stage.replaceAll("_", " ")}`,
    stage,
    note,
    requiresConfirmation: true
  };
}

function noteAction(session: AdvisorSession, note: string): AssistantProposal {
  return {
    type: "draft_note",
    leadId: session.id,
    label: `Save note for ${session.lead.name}`,
    note,
    requiresConfirmation: true
  };
}

function describeLead(session: AdvisorSession) {
  const workflow = session.workflow;
  const bits = [
    `${session.lead.name} is in ${workflow?.stage ?? "new"} stage.`,
    session.recommendation.recommendedCategory ? `Machine interest: ${session.recommendation.recommendedCategory}.` : null,
    workflow?.quotationReference ? `Quotation: ${workflow.quotationReference}.` : workflow?.quoteIssued ? "Quotation already issued." : "Quotation not issued yet.",
    workflow?.lastCallOutcome ? `Last call outcome: ${outcomeLabel(workflow.lastCallOutcome)}.` : "No call outcome logged yet.",
    workflow?.assistantMemory ?? null,
    workflow?.pendingAssistantPrompt ? `Prompt: ${workflow.pendingAssistantPrompt}` : null,
    workflow?.nextSuggestedAction ? `Next action: ${actionLabel(workflow.nextSuggestedAction)}.` : null
  ].filter(Boolean);

  return bits.join(" ");
}

function getDueTodaySessions(sessions: AdvisorSession[]) {
  const now = Date.now();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return sessions.filter((session) => {
    const target = session.workflow?.preferredCallbackAt ?? session.workflow?.nextFollowUpAt ?? session.workflow?.firstCallDueAt;
    if (!target) return false;
    const time = new Date(target).getTime();
    return time <= end.getTime() && !["won", "lost"].includes(session.workflow?.stage ?? "new") && time <= now + 24 * 60 * 60 * 1000;
  });
}

function getStaleSessions(sessions: AdvisorSession[]) {
  const cutoff = Date.now() - 5 * 24 * 60 * 60 * 1000;
  return sessions.filter((session) => {
    if (["won", "lost"].includes(session.workflow?.stage ?? "new")) return false;
    const lastTouched = session.workflow?.lastContactedAt ?? session.workflow?.lastUpdatedAt ?? session.workflow?.quotedAt ?? session.createdAt;
    return new Date(lastTouched).getTime() <= cutoff;
  });
}

function getQuotedAwaitingCallSessions(sessions: AdvisorSession[]) {
  return sessions.filter((session) => session.workflow?.quoteIssued && !session.workflow?.lastCallOutcome && !["won", "lost"].includes(session.workflow?.stage ?? "new"));
}

function getCallbackCommitments(sessions: AdvisorSession[]) {
  return sessions.filter((session) => Boolean(session.workflow?.preferredCallbackAt) && !["won", "lost"].includes(session.workflow?.stage ?? "new"));
}

function getMissingInfoSessions(sessions: AdvisorSession[]) {
  return sessions.filter((session) => {
    const workflow = session.workflow;
    if (!workflow || ["won", "lost"].includes(workflow.stage)) return false;
    return workflow.lastCallOutcome === "needs_more_details" || workflow.nextSuggestedAction === "collect_details";
  });
}

function formatLeadList(label: string, sessions: AdvisorSession[]) {
  if (!sessions.length) {
    return `${label}: none right now.`;
  }

  return `${label}:\n${sessions.slice(0, 5).map((session) => `- ${session.lead.name} (${session.recommendation.recommendedCategory ?? "Needs review"})`).join("\n")}`;
}

function buildFallbackResponse(input: {
  sessions: AdvisorSession[];
  selectedLead: AdvisorSession | null;
  message: string;
}): InternalAssistantResponse {
  const { sessions, selectedLead } = input;
  const message = input.message.trim().toLowerCase();

  if (!message) {
    return {
      reply: "Ask me about due calls, stale leads, quoted leads needing follow-up, callback commitments, or what should happen next on the selected lead.",
      actions: selectedLead ? [openAction(selectedLead), scheduleAction(selectedLead)] : []
    };
  }

  if (selectedLead && (message.includes("what happened") || message.includes("summary") || message.includes("last time"))) {
    return {
      reply: describeLead(selectedLead),
      actions: [openAction(selectedLead), scheduleAction(selectedLead)]
    };
  }

  if (selectedLead && (message.includes("what should i do next") || message.includes("next step") || message.includes("what next"))) {
    return {
      reply: selectedLead.workflow?.pendingAssistantPrompt
        ? `${selectedLead.workflow.pendingAssistantPrompt} Next suggested action: ${actionLabel(selectedLead.workflow?.nextSuggestedAction) ?? "Review lead"}.`
        : `Next suggested action for ${selectedLead.lead.name}: ${actionLabel(selectedLead.workflow?.nextSuggestedAction) ?? "Review lead"}.`,
      actions: [scheduleAction(selectedLead)]
    };
  }

  if (message.includes("stale")) {
    const stale = getStaleSessions(sessions);
    return {
      reply: formatLeadList("Stale leads", stale),
      actions: stale.slice(0, 2).map(openAction)
    };
  }

  if ((message.includes("quoted") && (message.includes("not called") || message.includes("follow"))) || message.includes("quoted lead")) {
    const quoted = getQuotedAwaitingCallSessions(sessions);
    return {
      reply: formatLeadList("Quoted leads waiting for a call update", quoted),
      actions: quoted.slice(0, 2).flatMap((session) => [openAction(session), scheduleAction(session)])
    };
  }

  if (message.includes("callback")) {
    const callbacks = getCallbackCommitments(sessions);
    return {
      reply: formatLeadList("Callback commitments", callbacks),
      actions: callbacks.slice(0, 2).flatMap((session) => [openAction(session), scheduleAction(session)])
    };
  }

  if (message.includes("missing") || message.includes("details")) {
    const missing = getMissingInfoSessions(sessions);
    return {
      reply: formatLeadList("Leads waiting for missing details", missing),
      actions: missing.slice(0, 2).flatMap((session) => [openAction(session), noteAction(session, `Customer still needs to share the missing technical or commercial details for ${session.recommendation.recommendedCategory ?? "the requested machine"}.`)])
    };
  }

  if (message.includes("due") || message.includes("today") || message.includes("call")) {
    const due = getDueTodaySessions(sessions);
    return {
      reply: formatLeadList("Leads needing calls or follow-up today", due),
      actions: due.slice(0, 2).flatMap((session) => [openAction(session), scheduleAction(session)])
    };
  }

  const due = getDueTodaySessions(sessions);
  const stale = getStaleSessions(sessions);
  const quoted = getQuotedAwaitingCallSessions(sessions);
  return {
    reply: [
      `You currently have ${due.length} leads needing calls or follow-up today.`,
      `${quoted.length} quoted leads still need a call outcome.`,
      `${stale.length} stale leads need review.`,
      selectedLead ? `Selected lead summary: ${describeLead(selectedLead)}` : "Pick a lead and ask what happened last time or what to do next."
    ].join(" "),
    actions: selectedLead ? [openAction(selectedLead), scheduleAction(selectedLead)] : due.slice(0, 2).map(openAction)
  };
}

function clampProposalCount(actions: AssistantProposal[] | undefined) {
  return actions?.slice(0, 3) ?? [];
}

function sanitizeProposal(raw: unknown, sessions: AdvisorSession[], selectedLead: AdvisorSession | null): AssistantProposal | null {
  if (!raw || typeof raw !== "object") return null;

  const proposal = raw as Record<string, unknown>;
  const type = typeof proposal.type === "string" ? proposal.type : "";
  const leadId = typeof proposal.leadId === "string" ? proposal.leadId : selectedLead?.id ?? "";
  const session = sessions.find((entry) => entry.id === leadId) ?? selectedLead;
  if (!session) return null;

  switch (type) {
    case "open_lead":
      return openAction(session);
    case "schedule_follow_up":
      return {
        type: "schedule_follow_up",
        leadId: session.id,
        label: typeof proposal.label === "string" && proposal.label.trim() ? proposal.label : `Schedule follow-up for ${session.lead.name}`,
        dueAt: typeof proposal.dueAt === "string" && proposal.dueAt.trim() ? proposal.dueAt : session.workflow?.nextFollowUpAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        note: typeof proposal.note === "string" ? proposal.note.trim() : null,
        requiresConfirmation: true
      };
    case "suggest_stage_change": {
      const stage = typeof proposal.stage === "string" ? proposal.stage : "";
      const validStages: LeadStage[] = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"];
      if (!validStages.includes(stage as LeadStage)) return null;
      return {
        type: "suggest_stage_change",
        leadId: session.id,
        label: typeof proposal.label === "string" && proposal.label.trim() ? proposal.label : `Move ${session.lead.name} to ${stage.replaceAll("_", " ")}`,
        stage: stage as LeadStage,
        note: typeof proposal.note === "string" ? proposal.note.trim() : null,
        requiresConfirmation: true
      };
    }
    case "draft_note":
      if (typeof proposal.note !== "string" || !proposal.note.trim()) return null;
      return {
        type: "draft_note",
        leadId: session.id,
        label: typeof proposal.label === "string" && proposal.label.trim() ? proposal.label : `Save note for ${session.lead.name}`,
        note: proposal.note.trim(),
        requiresConfirmation: true
      };
    default:
      return null;
  }
}

async function generateGeminiAssistantResponse(input: {
  user: User;
  message: string;
  sessions: AdvisorSession[];
  selectedLead: AdvisorSession | null;
}): Promise<InternalAssistantResponse | null> {
  const queueSummary = [
    `Visible leads: ${input.sessions.length}`,
    `Due today: ${getDueTodaySessions(input.sessions).length}`,
    `Quoted awaiting call: ${getQuotedAwaitingCallSessions(input.sessions).length}`,
    `Stale leads: ${getStaleSessions(input.sessions).length}`,
    `Missing-info leads: ${getMissingInfoSessions(input.sessions).length}`
  ].join(" | ");

  const selectedLeadSummary = input.selectedLead
    ? [
        `Selected lead: ${input.selectedLead.lead.name}`,
        `Stage: ${input.selectedLead.workflow?.stage ?? "new"}`,
        `Machine: ${input.selectedLead.recommendation.recommendedCategory ?? "Needs review"}`,
        `Quotation: ${input.selectedLead.workflow?.quotationReference ?? "none"}`,
        `Assistant memory: ${input.selectedLead.workflow?.assistantMemory ?? "none"}`,
        `Pending prompt: ${input.selectedLead.workflow?.pendingAssistantPrompt ?? "none"}`,
        `Last call outcome: ${input.selectedLead.workflow?.lastCallOutcome ?? "none"}`
      ].join("\n")
    : "Selected lead: none";

  const visibleLeadContext = input.sessions.slice(0, 12).map((session) => [
    `LeadId: ${session.id}`,
    `Name: ${session.lead.name}`,
    `Stage: ${session.workflow?.stage ?? "new"}`,
    `Machine: ${session.recommendation.recommendedCategory ?? "Needs review"}`,
    `Quote: ${session.workflow?.quotationReference ?? "none"}`,
    `Follow-up: ${session.workflow?.nextFollowUpAt ?? session.workflow?.preferredCallbackAt ?? "none"}`,
    `Last call outcome: ${session.workflow?.lastCallOutcome ?? "none"}`,
    `Pending prompt: ${session.workflow?.pendingAssistantPrompt ?? "none"}`
  ].join("\n")).join("\n\n");

  const result = await generateGeminiJson<{
    reply?: string;
    confidence?: "high" | "medium" | "low";
    humanHandoffRecommended?: boolean;
    groundedContextSummary?: string;
    actions?: unknown[];
  }>({
    groundedContextSummary: queueSummary,
    system: [
      "You are Welden's internal CRM copilot for admins, managers, and agents.",
      "Only use the CRM and workflow context provided in the prompt.",
      "Do not invent lead history, promises, reminders, or quotation facts.",
      "You may propose actions, but never imply data was already saved.",
      "Keep the response practical and concise.",
      "Use rich Markdown formatting (like **bolding** key terms, or using bulleted lists) to make the response highly readable.",
      "Return JSON only."
    ].join(" "),
    prompt: [
      `User role: ${input.user.role}`,
      `User question: ${input.message}`,
      `Queue summary: ${queueSummary}`,
      selectedLeadSummary,
      `Visible lead context:\n${visibleLeadContext}`,
      'JSON schema: { "reply": "string", "confidence": "high|medium|low", "humanHandoffRecommended": false, "groundedContextSummary": "string", "actions": [{ "type": "open_lead|schedule_follow_up|suggest_stage_change|draft_note", "leadId": "lead id", "label": "button label", "stage": "optional stage", "dueAt": "optional ISO date", "note": "optional note" }] }'
    ].join("\n\n")
  });

  if (!result.ok || !result.data.reply?.trim()) {
    return null;
  }

  return {
    reply: result.data.reply.trim(),
    actions: clampProposalCount((result.data.actions ?? []).map((action) => sanitizeProposal(action, input.sessions, input.selectedLead)).filter(Boolean) as AssistantProposal[]),
    ai: {
      ...result.metadata,
      confidence: result.data.confidence ?? "medium",
      humanHandoffRecommended: result.data.humanHandoffRecommended ?? false,
      groundedContextSummary: result.data.groundedContextSummary ?? result.metadata.groundedContextSummary
    }
  };
}

export async function answerInternalAssistantQuery(input: {
  user: User;
  message: string;
  selectedLeadId?: string | null;
}): Promise<InternalAssistantResponse> {
  const sessions = getVisibleLeadSessionsForUser(input.user, await getAdvisorSessions());
  const selectedLead = input.selectedLeadId ? sessions.find((session) => session.id === input.selectedLeadId) ?? null : null;

  const gemini = await generateGeminiAssistantResponse({
    user: input.user,
    message: input.message,
    sessions,
    selectedLead
  });

  if (gemini) {
    return gemini;
  }

  return {
    ...buildFallbackResponse({ sessions, selectedLead, message: input.message }),
    ai: {
      provider: "fallback",
      model: null,
      confidence: "low",
      humanHandoffRecommended: false,
      groundedContextSummary: null,
      fallbackReason: "gemini_unavailable"
    }
  };
}

export async function applyAssistantProposal(input: {
  user: User;
  proposal: AssistantProposal;
}) {
  const sessions = getVisibleLeadSessionsForUser(input.user, await getAdvisorSessions());
  const session = sessions.find((entry) => entry.id === input.proposal.leadId);
  if (!session) {
    throw new Error("Lead session not found.");
  }

  switch (input.proposal.type) {
    case "schedule_follow_up": {
      const updated = await updateAdvisorSessionWorkflow({
        sessionId: session.id,
        actorUserId: input.user.id,
        actorName: input.user.name,
        actorRole: input.user.role,
        nextFollowUpAt: input.proposal.dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        followUpStatus: "scheduled",
        note: input.proposal.note ?? undefined
      });
      return {
        reply: `Scheduled follow-up for ${updated.lead.name}.`,
        session: updated
      };
    }
    case "suggest_stage_change": {
      const updated = await updateAdvisorSessionWorkflow({
        sessionId: session.id,
        actorUserId: input.user.id,
        actorName: input.user.name,
        actorRole: input.user.role,
        stage: input.proposal.stage,
        note: input.proposal.note ?? undefined
      });
      return {
        reply: `Updated ${updated.lead.name} to ${input.proposal.stage.replaceAll("_", " ")} stage.`,
        session: updated
      };
    }
    case "draft_note": {
      const updated = await updateAdvisorSessionWorkflow({
        sessionId: session.id,
        actorUserId: input.user.id,
        actorName: input.user.name,
        actorRole: input.user.role,
        note: input.proposal.note
      });
      return {
        reply: `Saved a note on ${updated.lead.name}.`,
        session: updated
      };
    }
    case "open_lead":
      return {
        reply: `Opening ${session.lead.name}.`,
        session
      };
  }
}

export async function logAssistantCallOutcome(input: {
  userId: string;
  userName: string;
  userRole: Role;
  sessionId: string;
  callOutcome: LeadCallOutcome;
  callSummary?: string | null;
}) {
  return updateAdvisorSessionWorkflow({
    sessionId: input.sessionId,
    actorUserId: input.userId,
    actorName: input.userName,
    actorRole: input.userRole,
    lastContactedAt: new Date().toISOString(),
    callOutcome: input.callOutcome,
    callSummary: input.callSummary ?? null
  });
}
