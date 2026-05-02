import { sendEmail, sendQuotationEmail } from "./email";
import { getQuotationTemplates, issuePreliminaryQuotation } from "./quotations";
import { makeId, nowIso, readCollection, writeCollection } from "./store";
// CODE-04: use shared constant so leads.ts and settings.ts agree on the default
import { DEFAULT_STALE_LEAD_DAYS } from "./settings";
import { actionLabel, buildLeadPendingAssistantPrompt, outcomeLabel, summarizeLeadAssistantMemory } from "./lead-assistant-core";
import type { AdvisorSession, Lead, LeadActivity, LeadCallOutcome, LeadFollowUpStatus, LeadNote, LeadStage, LeadSuggestedAction, Role, Settings, User } from "./types";

export const leadStageOrder: LeadStage[] = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"];

const DEFAULT_FIRST_CALL_WORKING_DAYS = 2;
const DEFAULT_BUSINESS_DAYS = [1, 2, 3, 4, 5];

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function addDays(iso: string, days: number, hour = 10, minute = 30) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function addWorkingDays(iso: string, workingDaysToAdd: number, businessDays = DEFAULT_BUSINESS_DAYS, hour = 10, minute = 30) {
  const date = new Date(iso);
  let remaining = Math.max(workingDaysToAdd, 0);

  date.setHours(hour, minute, 0, 0);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (businessDays.includes(date.getDay())) {
      remaining -= 1;
    }
  }

  return date.toISOString();
}

function firstCallDueAt(createdAt: string, settings?: Settings | null, preferredCallbackAt?: string | null) {
  if (preferredCallbackAt) {
    return preferredCallbackAt;
  }

  return addWorkingDays(
    createdAt,
    settings?.firstResponseSlaWorkingDays ?? DEFAULT_FIRST_CALL_WORKING_DAYS,
    settings?.businessDays?.length ? settings.businessDays : DEFAULT_BUSINESS_DAYS,
    settings?.businessHours?.start ?? 10,
    30
  );
}

function lastMeaningfulLeadAt(session: AdvisorSession) {
  return session.workflow?.lastContactedAt ?? session.workflow?.lastUpdatedAt ?? session.workflow?.quotedAt ?? session.createdAt;
}

function isLeadStale(session: AdvisorSession, settings?: Settings | null, compareTime = Date.now()) {
  const staleLeadDays = settings?.staleLeadDays ?? DEFAULT_STALE_LEAD_DAYS;
  const lastTouchedAt = lastMeaningfulLeadAt(session);
  return compareTime - new Date(lastTouchedAt).getTime() >= staleLeadDays * 24 * 60 * 60 * 1000;
}

function defaultStageForSession(session: AdvisorSession): LeadStage {
  if (session.workflow?.quoteIssued || session.diagnostics?.quoteAsked) return "quoted";
  if (session.workflow?.preferredCallbackAt) return "contact_scheduled";
  if (session.escalated || session.diagnostics?.intent === "human" || session.diagnostics?.intent === "custom_requirement") return "contacted";
  return "new";
}

function inferFollowUpStatus(session: AdvisorSession): LeadFollowUpStatus {
  const workflow = session.workflow;
  const explicit = workflow?.followUpStatus;
  if (explicit && explicit !== "pending") return explicit;
  const target = workflow?.preferredCallbackAt ?? workflow?.nextFollowUpAt;
  if (!target) return "pending";
  return new Date(target).getTime() <= Date.now() ? "due" : "scheduled";
}

function defaultNextFollowUpAt(session: AdvisorSession, baseIso = nowIso()) {
  const workflow = session.workflow;
  if (workflow?.preferredCallbackAt) {
    return workflow.preferredCallbackAt;
  }
  if (workflow?.followUpStatus === "no_answer") {
    return addDays(baseIso, 1, 11, 0);
  }
  if (workflow?.followUpStatus === "call_back_later") {
    return workflow?.preferredCallbackAt ?? addHours(baseIso, 4);
  }
  if (workflow?.quoteIssued || session.diagnostics?.quoteAsked || session.diagnostics?.intent === "quote") {
    return addHours(baseIso, 4);
  }
  if (workflow?.stage === "proposal_sent") {
    return addDays(baseIso, 1, 10, 30);
  }
  if (workflow?.stage === "qualified") {
    return addHours(baseIso, 6);
  }
  return addHours(baseIso, 2);
}

function makeLeadActivity(type: LeadActivity["type"], body: string, authorName = "System", authorRole: LeadActivity["authorRole"] = "system"): LeadActivity {
  return {
    id: makeId("leadactivity"),
    type,
    body,
    createdAt: nowIso(),
    authorName,
    authorRole
  };
}

function applyCallOutcomeDefaults(input: {
  session: AdvisorSession;
  workflow: NonNullable<AdvisorSession["workflow"]>;
  outcome: LeadCallOutcome;
  callSummary?: string | null;
  actorName: string;
  actorRole: Role;
  actorUserId?: string | null;
  explicitNextFollowUpAt?: string | null;
}): NonNullable<AdvisorSession["workflow"]> {
  const { session, workflow, outcome, callSummary, actorName, actorRole, actorUserId, explicitNextFollowUpAt } = input;
  const baseIso = nowIso();
  const summary = callSummary?.trim() || null;
  const activity: LeadActivity[] = [...workflow.activity];

  let stage = workflow.stage;
  let followUpStatus: LeadFollowUpStatus | null = workflow.followUpStatus ?? inferFollowUpStatus(session);
  let preferredCallbackAt = workflow.preferredCallbackAt ?? null;
  let nextFollowUpAt = explicitNextFollowUpAt === undefined ? workflow.nextFollowUpAt ?? null : explicitNextFollowUpAt;
  let nextSuggestedAction: LeadSuggestedAction | null = null;
  let nextSuggestedActionDueAt: string | null = nextFollowUpAt;
  let closeReason = workflow.closeReason ?? null;

  switch (outcome) {
    case "no_answer":
      followUpStatus = "no_answer";
      nextSuggestedAction = "call_again";
      nextFollowUpAt = nextFollowUpAt ?? addDays(baseIso, 1, 11, 0);
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "call_back_requested":
      followUpStatus = "scheduled";
      nextSuggestedAction = "schedule_callback";
      preferredCallbackAt = preferredCallbackAt ?? nextFollowUpAt ?? addDays(baseIso, 1, 10, 30);
      nextFollowUpAt = preferredCallbackAt;
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "send_brochure":
      followUpStatus = "scheduled";
      nextSuggestedAction = "send_brochure";
      nextFollowUpAt = nextFollowUpAt ?? addHours(baseIso, 4);
      nextSuggestedActionDueAt = nextFollowUpAt;
      activity.unshift(makeLeadActivity("brochure_requested", "Brochure follow-up requested for this lead.", actorName, actorRole));
      break;
    case "send_quotation":
      stage = ["new", "contact_scheduled", "contacted"].includes(workflow.stage) ? "qualified" : workflow.stage;
      followUpStatus = "scheduled";
      nextSuggestedAction = "prepare_quotation";
      nextFollowUpAt = nextFollowUpAt ?? addHours(baseIso, 4);
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "needs_more_details":
      followUpStatus = "scheduled";
      nextSuggestedAction = "collect_details";
      nextFollowUpAt = nextFollowUpAt ?? addHours(baseIso, 6);
      nextSuggestedActionDueAt = nextFollowUpAt;
      activity.unshift(makeLeadActivity("details_requested", "Customer details are still required before the next step.", actorName, actorRole));
      break;
    case "technical_discussion_needed":
      stage = workflow.stage === "new" ? "qualified" : workflow.stage;
      followUpStatus = "scheduled";
      nextSuggestedAction = "technical_review";
      nextFollowUpAt = nextFollowUpAt ?? addDays(baseIso, 1, 10, 30);
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "budget_not_clear":
      followUpStatus = "scheduled";
      nextSuggestedAction = "qualify_budget";
      nextFollowUpAt = nextFollowUpAt ?? addDays(baseIso, 1, 10, 30);
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "wrong_contact":
      followUpStatus = "due";
      nextSuggestedAction = "correct_contact";
      nextFollowUpAt = nextFollowUpAt ?? addDays(baseIso, 1, 11, 0);
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "not_interested":
      followUpStatus = "completed";
      nextSuggestedAction = "close_lost";
      nextFollowUpAt = null;
      nextSuggestedActionDueAt = null;
      closeReason = closeReason ?? "not_interested";
      break;
    case "follow_up_later":
      followUpStatus = "scheduled";
      nextSuggestedAction = "schedule_follow_up";
      nextFollowUpAt = nextFollowUpAt ?? addDays(baseIso, 2, 10, 30);
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "meeting_scheduled":
      stage = workflow.stage === "new" ? "contact_scheduled" : workflow.stage;
      followUpStatus = "scheduled";
      nextSuggestedAction = "schedule_meeting";
      nextFollowUpAt = nextFollowUpAt ?? addDays(baseIso, 1, 10, 30);
      nextSuggestedActionDueAt = nextFollowUpAt;
      break;
    case "converted":
      stage = "won";
      followUpStatus = "completed";
      nextSuggestedAction = "mark_won";
      nextFollowUpAt = null;
      nextSuggestedActionDueAt = null;
      break;
    case "lost":
      stage = "lost";
      followUpStatus = "completed";
      nextSuggestedAction = "close_lost";
      nextFollowUpAt = null;
      nextSuggestedActionDueAt = null;
      closeReason = closeReason ?? "lost_after_call";
      break;
  }

  activity.unshift(makeLeadActivity(
    "call_outcome_logged",
    summary
      ? `Call outcome logged as ${outcomeLabel(outcome)}. ${summary}`
      : `Call outcome logged as ${outcomeLabel(outcome)}.`,
    actorName,
    actorRole
  ));

  const draftWorkflow = {
    ...workflow,
    stage,
    preferredCallbackAt,
    nextFollowUpAt,
    followUpStatus,
    lastCallAt: workflow.lastCallAt ?? workflow.lastContactedAt ?? baseIso,
    lastCallByUserId: actorUserId ?? workflow.lastCallByUserId ?? null,
    lastCallOutcome: outcome,
    lastCallSummary: summary,
    nextSuggestedAction,
    nextSuggestedActionDueAt,
    closeReason,
    activity
  };

  draftWorkflow.assistantMemory = summarizeLeadAssistantMemory(draftWorkflow);
  draftWorkflow.pendingAssistantPrompt = buildLeadPendingAssistantPrompt({ ...session, workflow: draftWorkflow }, draftWorkflow);
  return draftWorkflow;
}

function deriveFollowUpState(session: AdvisorSession, workflow: AdvisorSession["workflow"], explicitStatus?: LeadFollowUpStatus | null): { nextFollowUpAt: string | null; followUpStatus: LeadFollowUpStatus } {
  const next = workflow?.nextFollowUpAt ?? null;
  const preferred = workflow?.preferredCallbackAt ?? null;
  const target = preferred ?? next;

  let followUpStatus = explicitStatus ?? workflow?.followUpStatus ?? inferFollowUpStatus(session);
  let nextFollowUpAt = next;

  if (workflow?.stage === "won" || workflow?.stage === "lost") {
    return {
      nextFollowUpAt: null,
      followUpStatus: "completed" as LeadFollowUpStatus
    };
  }

  if (followUpStatus === "completed") {
    return {
      nextFollowUpAt: null,
      followUpStatus
    };
  }

  if (followUpStatus === "call_back_later") {
    return {
      nextFollowUpAt: preferred ?? next ?? defaultNextFollowUpAt(session),
      followUpStatus
    };
  }

  if (followUpStatus === "no_answer") {
    return {
      nextFollowUpAt: next ?? defaultNextFollowUpAt({ ...session, workflow: { ...workflow, followUpStatus } as AdvisorSession["workflow"] }),
      followUpStatus
    };
  }

  if (!target) {
    return {
      nextFollowUpAt: defaultNextFollowUpAt(session),
      followUpStatus: workflow?.quoteIssued ? "scheduled" : "due"
    };
  }

  const inferredStatus: LeadFollowUpStatus = new Date(target).getTime() <= Date.now() ? "due" : "scheduled";
  return {
    nextFollowUpAt: next ?? target,
    followUpStatus: followUpStatus === "pending" ? inferredStatus : followUpStatus
  };
}

function getLeadOwner(users: User[], ownerUserId?: string | null) {
  return users.find((user) => user.id === ownerUserId && user.active) ?? null;
}

function getNewLeadRecipients(settings: Settings, users: User[], ownerUserId?: string | null) {
  const owner = getLeadOwner(users, ownerUserId);
  return Array.from(new Set([owner?.email, ...(settings.internalNotificationEmails ?? [])].filter(Boolean))) as string[];
}

export async function notifyNewLead(session: AdvisorSession, settings: Settings, users: User[]) {
  const owner = getLeadOwner(users, session.workflow?.ownerUserId ?? null);
  const recipients = getNewLeadRecipients(settings, users, session.workflow?.ownerUserId ?? null);

  if (!recipients.length) {
    return;
  }

  const firstCallDue = session.workflow?.firstCallDueAt ?? session.workflow?.nextFollowUpAt ?? firstCallDueAt(session.createdAt, settings, session.workflow?.preferredCallbackAt ?? null);
  const quoteLine = session.workflow?.quotationReference
    ? `Quotation reference: ${session.workflow.quotationReference}`
    : session.workflow?.quoteIssued
      ? "Quotation: chatbot-issued quote on this lead"
      : "Quotation: not issued yet";

  await sendEmail(
    recipients,
    `New lead assigned: ${session.lead.name}`,
    [
      "A new Welden lead has been created.",
      `Lead: ${session.lead.name}`,
      `Company: ${session.lead.company ?? "Not provided"}`,
      `Email: ${session.lead.email}`,
      `Phone: ${session.lead.phone}`,
      `Assigned staff: ${owner?.name ?? "Unassigned"}`,
      `Lead stage: ${session.workflow?.stage ?? "new"}`,
      `First call deadline: ${new Date(firstCallDue).toLocaleString()}`,
      `Machine interest: ${session.recommendation.recommendedCategory ?? "Needs review"}`,
      quoteLine,
      session.workflow?.preferredCallbackNote ? `Callback note: ${session.workflow.preferredCallbackNote}` : null,
      "Please call the customer within 2 working days and update the lead in the admin."
    ].filter(Boolean).join("\n")
  );
}

export function normalizeAdvisorSession(session: AdvisorSession): AdvisorSession {
  const workflow = session.workflow;
  const normalizedQuoteIssued = workflow?.quoteIssued ?? Boolean(workflow?.quotationReference || session.diagnostics?.preliminaryQuotationReference);
  const normalizedActivity = workflow?.activity ?? [];

  const normalized = {
    ...session,
    workflow: {
      stage: workflow?.stage ?? defaultStageForSession(session),
      ownerUserId: workflow?.ownerUserId ?? null,
      nextFollowUpAt: workflow?.nextFollowUpAt ?? null,
      firstCallDueAt: workflow?.firstCallDueAt ?? firstCallDueAt(session.createdAt, null, workflow?.preferredCallbackAt ?? null),
      firstCallCompletedAt: workflow?.firstCallCompletedAt ?? workflow?.lastContactedAt ?? null,
      firstCallReminderSentAt: workflow?.firstCallReminderSentAt ?? null,
      firstCallEscalationSentAt: workflow?.firstCallEscalationSentAt ?? null,
      staleAlertSentAt: workflow?.staleAlertSentAt ?? null,
      preferredCallbackAt: workflow?.preferredCallbackAt ?? null,
      preferredCallbackNote: workflow?.preferredCallbackNote ?? null,
      followUpStatus: workflow?.followUpStatus ?? inferFollowUpStatus(session),
      quoteIssued: normalizedQuoteIssued,
      quotationReference: workflow?.quotationReference ?? session.diagnostics?.preliminaryQuotationReference ?? null,
      quotationStatus: workflow?.quotationStatus ?? (normalizedQuoteIssued ? "issued" : null),
      quotationSnapshot: workflow?.quotationSnapshot ?? null,
      quotationPrice: workflow?.quotationPrice ?? null,
      quotationCurrency: workflow?.quotationCurrency ?? null,
      quotationTitle: workflow?.quotationTitle ?? null,
      quotedAt: workflow?.quotedAt ?? null,
      quotedMachineName: workflow?.quotedMachineName ?? session.recommendation.recommendedCategory ?? null,
      quotedVariantLabel: workflow?.quotedVariantLabel ?? null,
      lastCallAt: workflow?.lastCallAt ?? workflow?.lastContactedAt ?? null,
      lastCallByUserId: workflow?.lastCallByUserId ?? null,
      lastCallOutcome: workflow?.lastCallOutcome ?? null,
      lastCallSummary: workflow?.lastCallSummary ?? null,
      nextSuggestedAction: workflow?.nextSuggestedAction ?? null,
      nextSuggestedActionDueAt: workflow?.nextSuggestedActionDueAt ?? null,
      pendingAssistantPrompt: workflow?.pendingAssistantPrompt ?? null,
      assistantMemory: workflow?.assistantMemory ?? null,
      publicAdvisorMemory: workflow?.publicAdvisorMemory ?? null,
      publicAdvisorMemoryUpdatedAt: workflow?.publicAdvisorMemoryUpdatedAt ?? null,
      lastReminderSentAt: workflow?.lastReminderSentAt ?? null,
      lastContactedAt: workflow?.lastContactedAt ?? null,
      lastUpdatedAt: workflow?.lastUpdatedAt ?? session.createdAt,
      notes: workflow?.notes ?? [],
      activity: normalizedActivity.length ? normalizedActivity : [makeLeadActivity("chatbot_created", "Lead created from chatbot conversation.")],
      closeReason: workflow?.closeReason ?? null,
      closeReasonNote: workflow?.closeReasonNote ?? null
    },
    diagnostics: {
      intent: session.diagnostics?.intent ?? "answer",
      found: session.diagnostics?.found ?? false,
      quoteAsked: session.diagnostics?.quoteAsked ?? session.diagnostics?.intent === "quote",
      preliminaryQuotationId: session.diagnostics?.preliminaryQuotationId ?? null,
      preliminaryQuotationReference: session.diagnostics?.preliminaryQuotationReference ?? null,
      matchedProductId: session.diagnostics?.matchedProductId ?? null,
      matchedCategory: session.diagnostics?.matchedCategory ?? null
    }
  } satisfies AdvisorSession;

  const followUpState = deriveFollowUpState(normalized, normalized.workflow, normalized.workflow?.followUpStatus ?? null);
  normalized.workflow = {
    ...normalized.workflow,
    nextFollowUpAt: followUpState.nextFollowUpAt,
    followUpStatus: followUpState.followUpStatus
  };
  normalized.workflow.assistantMemory = summarizeLeadAssistantMemory(normalized.workflow);
  normalized.workflow.pendingAssistantPrompt = buildLeadPendingAssistantPrompt(normalized, normalized.workflow);

  return normalized;
}

export async function getAdvisorSessions() {
  const sessions = await readCollection<AdvisorSession[]>("advisor-sessions");
  return sessions.map(normalizeAdvisorSession).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function saveAdvisorSessions(sessions: AdvisorSession[]) {
  await writeCollection("advisor-sessions", sessions.map(normalizeAdvisorSession));
}

export async function updateAdvisorSessionPublicMemory(input: {
  sessionId: string;
  summary: string | null;
}) {
  const sessions = await getAdvisorSessions();
  const sessionIndex = sessions.findIndex((session) => session.id === input.sessionId);
  if (sessionIndex < 0) {
    throw new Error("Lead session not found.");
  }

  const current = sessions[sessionIndex];
  sessions[sessionIndex] = normalizeAdvisorSession({
    ...current,
    workflow: {
      ...(current.workflow ?? normalizeAdvisorSession(current).workflow!),
      publicAdvisorMemory: input.summary?.trim() || null,
      publicAdvisorMemoryUpdatedAt: input.summary?.trim() ? nowIso() : null,
      lastUpdatedAt: nowIso()
    }
  });

  await saveAdvisorSessions(sessions);
  return sessions[sessionIndex];
}

export async function createLeadFromInquiry(input: {
  lead: Lead;
  source: "chatbot" | "website_form";
  question: string;
  machineInterest?: string | null;
  transcriptSummary?: string;
  ownerUserId?: string | null;
  preferredCallbackAt?: string | null;
  preferredCallbackNote?: string | null;
  quality?: AdvisorSession["quality"];
  escalated?: boolean;
  recommendation?: Partial<AdvisorSession["recommendation"]>;
  diagnostics?: Partial<NonNullable<AdvisorSession["diagnostics"]>>;
}): Promise<AdvisorSession> {
  const [sessions, settings, users] = await Promise.all([
    getAdvisorSessions(),
    readCollection<Settings>("settings"),
    readCollection<User[]>("users")
  ]);
  const createdAt = nowIso();
  // FEAT-05: Round-robin assignment across active agents/managers.
  // If the caller specifies an owner, respect it; if not, distribute evenly by counting
  // how many open leads each active staff member already owns, then assign to the one
  // with the fewest. Falls back to the default assignee if no active agents exist.
  const ownerUserId = (() => {
    if (input.ownerUserId !== undefined) return input.ownerUserId ?? null;
    const activeStaff = users.filter((u) => u.active && (u.role === "agent" || u.role === "manager"));
    if (!activeStaff.length) return settings.advisorDefaultAssigneeId ?? null;
    const openLeads = sessions.filter((s) => s.workflow?.ownerUserId && !["won", "lost"].includes(s.workflow.stage));
    const loadMap = new Map(activeStaff.map((u) => [u.id, 0]));
    for (const s of openLeads) {
      const uid = s.workflow!.ownerUserId!;
      if (loadMap.has(uid)) loadMap.set(uid, loadMap.get(uid)! + 1);
    }
    // Pick the active staff member with the lowest open-lead count
    let minLoad = Infinity;
    let assignee = settings.advisorDefaultAssigneeId ?? activeStaff[0].id;
    for (const [uid, count] of loadMap) {
      if (count < minLoad) { minLoad = count; assignee = uid; }
    }
    return assignee;
  })();
  const callDueAt = firstCallDueAt(createdAt, settings, input.preferredCallbackAt ?? null);
  const session = normalizeAdvisorSession({
    id: makeId("advisor"),
    lead: input.lead,
    quality: input.quality,
    answers: {
      machineProblem: input.question,
      materialType: "",
      throughput: "",
      bottleneck: "",
      automationLevel: "",
      precisionNeed: "",
      urgency: ""
    },
    recommendation: {
      recommendedProductId: input.recommendation?.recommendedProductId ?? null,
      recommendedCategory: input.recommendation?.recommendedCategory ?? input.machineInterest ?? null,
      confidence: input.recommendation?.confidence ?? "medium",
      explanation: input.recommendation?.explanation ?? input.transcriptSummary ?? input.question,
      highlights: input.recommendation?.highlights ?? [],
      citations: input.recommendation?.citations,
      escalationReason: input.recommendation?.escalationReason
    },
    escalated: input.escalated ?? true,
    createdAt,
    workflow: {
      stage: input.diagnostics?.quoteAsked ? "quoted" : input.preferredCallbackAt ? "contact_scheduled" : "new",
      ownerUserId,
      nextFollowUpAt: callDueAt,
      firstCallDueAt: callDueAt,
      firstCallCompletedAt: null,
      firstCallReminderSentAt: null,
      firstCallEscalationSentAt: null,
      staleAlertSentAt: null,
      preferredCallbackAt: input.preferredCallbackAt ?? null,
      preferredCallbackNote: input.preferredCallbackNote ?? null,
      followUpStatus: "scheduled",
      quoteIssued: false,
      quotationReference: null,
      quotationStatus: null,
      quotationSnapshot: null,
      quotationPrice: null,
      quotationCurrency: null,
      quotationTitle: null,
      quotedAt: null,
      quotedMachineName: input.machineInterest ?? null,
      quotedVariantLabel: null,
      publicAdvisorMemory: null,
      publicAdvisorMemoryUpdatedAt: null,
      lastReminderSentAt: null,
      lastContactedAt: null,
      lastUpdatedAt: createdAt,
      notes: [],
      activity: [makeLeadActivity(input.source === "website_form" ? "contact_request_created" : "chatbot_created", input.source === "website_form" ? "Lead created from website consultation form." : "Lead created from chatbot conversation.")]
    },
    diagnostics: {
      intent: input.diagnostics?.intent ?? "human",
      found: input.diagnostics?.found ?? false,
      quoteAsked: input.diagnostics?.quoteAsked ?? false,
      preliminaryQuotationId: input.diagnostics?.preliminaryQuotationId ?? null,
      preliminaryQuotationReference: input.diagnostics?.preliminaryQuotationReference ?? null,
      matchedProductId: input.diagnostics?.matchedProductId ?? null,
      matchedCategory: input.diagnostics?.matchedCategory ?? input.machineInterest ?? null
    }
  });

  // WF-04: Deduplication â€” if an open lead with the same email exists, merge instead of creating a duplicate.
  // "Open" means not won or lost; returning customers (won/lost) always get a fresh session.
  const emailNormalized = input.lead.email.trim().toLowerCase();
  const existingOpen = sessions.find(
    (s) =>
      s.lead.email.trim().toLowerCase() === emailNormalized &&
      s.workflow?.stage !== "won" &&
      s.workflow?.stage !== "lost"
  );

  if (existingOpen) {
    // Append the new inquiry as a note on the existing lead so nothing is lost
    const mergeNote: LeadNote = {
      id: makeId("leadnote"),
      body: `Duplicate inquiry merged â€” new message: "${input.question.slice(0, 400)}"${input.machineInterest ? ` (machine interest: ${input.machineInterest})` : ""}`,
      createdAt: nowIso(),
      authorName: "System",
      authorRole: "system" as LeadNote["authorRole"]
    };
    const mergeActivity = makeLeadActivity("duplicate_merged", `A duplicate submission from ${input.lead.email} was merged into this lead.`);
    const updatedSession: AdvisorSession = {
      ...existingOpen,
      workflow: {
        ...existingOpen.workflow!,
        notes: [...(existingOpen.workflow?.notes ?? []), mergeNote],
        activity: [...(existingOpen.workflow?.activity ?? []), mergeActivity],
        lastUpdatedAt: nowIso()
      }
    };
    const idx = sessions.findIndex((s) => s.id === existingOpen.id);
    sessions[idx] = normalizeAdvisorSession(updatedSession);
    await saveAdvisorSessions(sessions);

    // Fix WF-04: Re-notify staff so they know the customer followed up again.
    // We notify on the existing session (which has the assigned owner) so the right person gets pinged.
    try {
      await notifyNewLead(sessions[idx], settings, users);
    } catch (notifyErr) {
      console.error("[leads] Failed to send duplicate-merge notification:", notifyErr);
      // Non-fatal â€” the merge was saved successfully; notification failure shouldn't surface to the caller
    }

    // Return the existing session with a synthetic flag the caller can inspect
    return Object.assign({}, sessions[idx], { _merged: true }) as AdvisorSession;
  }

  // New lead path â€” errors here should NOT be silently swallowed.
  // If save fails we bubble the error so the API route can return a 500 rather than
  // pretending to the customer that their inquiry was received.
  sessions.unshift(session);
  try {
    await saveAdvisorSessions(sessions);
  } catch (saveErr) {
    console.error("[leads] Critical: failed to persist new lead session:", saveErr);
    throw saveErr; // re-throw so the caller can handle and return an error response
  }
  try {
    await notifyNewLead(session, settings, users);
  } catch (notifyErr) {
    // Non-fatal â€” lead is already saved; a notification failure shouldn't undo that.
    console.error("[leads] Failed to send new-lead notification:", notifyErr);
  }
  return session;
}

async function notifyLeadReassigned(session: AdvisorSession, newOwnerUserId: string, settings: Settings, users: User[]) {
  const newOwner = users.find((u) => u.id === newOwnerUserId && u.active);
  if (!newOwner?.email) return;

  // Also CC internal emails so the team has visibility on reassignments
  const recipients = Array.from(new Set([newOwner.email, ...(settings.internalNotificationEmails ?? [])]));

  await sendEmail(
    recipients,
    `Lead reassigned to you: ${session.lead.name}`,
    [
      `A Welden lead has been reassigned to ${newOwner.name}.`,
      `Lead: ${session.lead.name}`,
      `Company: ${session.lead.company ?? "Not provided"}`,
      `Email: ${session.lead.email}`,
      `Phone: ${session.lead.phone}`,
      `Lead stage: ${session.workflow?.stage ?? "new"}`,
      `Machine interest: ${session.recommendation.recommendedCategory ?? "Needs review"}`,
      "Please review this lead and follow up with the customer as needed."
    ].join("\n")
  );
}

export async function updateAdvisorSessionWorkflow(input: {
  sessionId: string;
  actorUserId?: string | null;
  actorName: string;
  actorRole: Role;
  stage?: LeadStage;
  ownerUserId?: string | null;
  nextFollowUpAt?: string | null;
  preferredCallbackAt?: string | null;
  preferredCallbackNote?: string | null;
  followUpStatus?: LeadFollowUpStatus | null;
  lastContactedAt?: string | null;
  callOutcome?: LeadCallOutcome | null;
  callSummary?: string | null;
  note?: string;
  closeReason?: string | null;
  closeReasonNote?: string | null;
}) {
  const sessions = await getAdvisorSessions();
  const sessionIndex = sessions.findIndex((session) => session.id === input.sessionId);
  if (sessionIndex < 0) {
    throw new Error("Lead session not found.");
  }

  const current = sessions[sessionIndex];
  const workflow = current.workflow ?? normalizeAdvisorSession(current).workflow!;
  const notes: LeadNote[] = [...workflow.notes];
  const activity: LeadActivity[] = [...workflow.activity];
  const trimmedNote = input.note?.trim();

  if (trimmedNote) {
    notes.unshift({
      id: makeId("leadnote"),
      body: trimmedNote,
      createdAt: nowIso(),
      authorName: input.actorName,
      authorRole: input.actorRole
    });
    activity.unshift(makeLeadActivity("note_added", trimmedNote, input.actorName, input.actorRole));
  }

  if (input.stage && input.stage !== workflow.stage) {
    activity.unshift(makeLeadActivity("status_changed", `Lead stage changed from ${workflow.stage} to ${input.stage}.`, input.actorName, input.actorRole));
  }
  const ownerChanged =
    input.ownerUserId !== undefined &&
    input.ownerUserId !== (workflow.ownerUserId ?? null) &&
    Boolean(input.ownerUserId); // only flag as changed when setting a real owner, not clearing
  if (input.ownerUserId !== undefined && input.ownerUserId !== (workflow.ownerUserId ?? null)) {
    activity.unshift(makeLeadActivity("owner_changed", input.ownerUserId ? "Lead owner changed." : "Lead owner cleared.", input.actorName, input.actorRole));
  }
  if (input.nextFollowUpAt !== undefined || input.preferredCallbackAt !== undefined) {
    activity.unshift(makeLeadActivity("follow_up_scheduled", "Follow-up schedule updated.", input.actorName, input.actorRole));
  }
  if (input.lastContactedAt) {
    activity.unshift(makeLeadActivity("call_logged", "Lead contact attempt logged.", input.actorName, input.actorRole));
  }
  // WF-10: Log close reason when stage changes to won/lost and a reason is provided
  if (input.closeReason && (input.stage === "won" || input.stage === "lost")) {
    const reasonLabel = input.closeReason === "other" && input.closeReasonNote ? `Other: ${input.closeReasonNote}` : input.closeReason;
    activity.unshift(makeLeadActivity("close_reason_set", `Lead closed as ${input.stage}: ${reasonLabel}.`, input.actorName, input.actorRole));
  }

  let draftWorkflow: NonNullable<AdvisorSession["workflow"]> = {
    stage: input.stage ?? workflow.stage,
    ownerUserId: input.ownerUserId === undefined ? workflow.ownerUserId ?? null : input.ownerUserId,
    nextFollowUpAt: input.nextFollowUpAt === undefined ? workflow.nextFollowUpAt ?? null : input.nextFollowUpAt,
    firstCallDueAt: workflow.firstCallDueAt ?? firstCallDueAt(current.createdAt, null, workflow.preferredCallbackAt ?? null),
    firstCallCompletedAt: workflow.firstCallCompletedAt ?? (input.lastContactedAt ?? workflow.lastContactedAt ?? null),
    firstCallReminderSentAt: workflow.firstCallReminderSentAt ?? null,
    firstCallEscalationSentAt: workflow.firstCallEscalationSentAt ?? null,
    staleAlertSentAt: null,
    preferredCallbackAt: input.preferredCallbackAt === undefined ? workflow.preferredCallbackAt ?? null : input.preferredCallbackAt,
    preferredCallbackNote: input.preferredCallbackNote === undefined ? workflow.preferredCallbackNote ?? null : input.preferredCallbackNote,
    followUpStatus: input.followUpStatus === undefined ? workflow.followUpStatus ?? inferFollowUpStatus(current) : input.followUpStatus,
    quoteIssued: workflow.quoteIssued ?? false,
    quotationReference: workflow.quotationReference ?? null,
    quotationStatus: workflow.quotationStatus ?? null,
    quotationSnapshot: workflow.quotationSnapshot ?? null,
    quotationPrice: workflow.quotationPrice ?? null,
    quotationCurrency: workflow.quotationCurrency ?? null,
    quotationTitle: workflow.quotationTitle ?? null,
    quotedAt: workflow.quotedAt ?? null,
    quotedMachineName: workflow.quotedMachineName ?? null,
    quotedVariantLabel: workflow.quotedVariantLabel ?? null,
    lastCallAt: workflow.lastCallAt ?? workflow.lastContactedAt ?? null,
    lastCallByUserId: workflow.lastCallByUserId ?? null,
    lastCallOutcome: workflow.lastCallOutcome ?? null,
    lastCallSummary: workflow.lastCallSummary ?? null,
    nextSuggestedAction: workflow.nextSuggestedAction ?? null,
    nextSuggestedActionDueAt: workflow.nextSuggestedActionDueAt ?? null,
    pendingAssistantPrompt: workflow.pendingAssistantPrompt ?? null,
    assistantMemory: workflow.assistantMemory ?? null,
    publicAdvisorMemory: workflow.publicAdvisorMemory ?? null,
    publicAdvisorMemoryUpdatedAt: workflow.publicAdvisorMemoryUpdatedAt ?? null,
    lastReminderSentAt: workflow.lastReminderSentAt ?? null,
    lastContactedAt: input.lastContactedAt === undefined ? workflow.lastContactedAt ?? null : input.lastContactedAt,
    lastUpdatedAt: nowIso(),
    notes,
    activity,
    closeReason: input.closeReason === undefined ? (workflow.closeReason ?? null) : input.closeReason,
    closeReasonNote: input.closeReasonNote === undefined ? (workflow.closeReasonNote ?? null) : input.closeReasonNote
  };

  if (input.callOutcome) {
    draftWorkflow = applyCallOutcomeDefaults({
      session: current,
      workflow: draftWorkflow,
      outcome: input.callOutcome,
      callSummary: input.callSummary,
      actorName: input.actorName,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId ?? null,
      explicitNextFollowUpAt: draftWorkflow.nextFollowUpAt
    });
  } else {
    draftWorkflow.assistantMemory = summarizeLeadAssistantMemory(draftWorkflow);
    draftWorkflow.pendingAssistantPrompt = buildLeadPendingAssistantPrompt({ ...current, workflow: draftWorkflow }, draftWorkflow);
  }

  const nextFollowUpState = deriveFollowUpState(current, draftWorkflow, draftWorkflow.followUpStatus ?? null);

  sessions[sessionIndex] = normalizeAdvisorSession({
    ...current,
    workflow: {
      ...draftWorkflow,
      nextFollowUpAt: nextFollowUpState.nextFollowUpAt,
      followUpStatus: nextFollowUpState.followUpStatus,
      firstCallCompletedAt: draftWorkflow.firstCallCompletedAt ?? (input.lastContactedAt ?? workflow.lastContactedAt ?? null)
    }
  });

  await saveAdvisorSessions(sessions);

  // Notify the new owner when a lead is reassigned
  if (ownerChanged && input.ownerUserId) {
    try {
      const [settings, users] = await Promise.all([
        readCollection<Settings>("settings"),
        readCollection<User[]>("users")
      ]);
      await notifyLeadReassigned(sessions[sessionIndex], input.ownerUserId, settings ?? {} as Settings, users ?? []);
    } catch (notifyErr) {
      // Non-fatal â€” lead was already saved; notification failure shouldn't surface
      console.error("[leads] Failed to send reassignment notification:", notifyErr);
    }
  }

  return sessions[sessionIndex];
}

export async function attachQuotationToAdvisorSession(input: {
  sessionId: string;
  actorName?: string;
  actorRole?: Role | "system";
  quotationId?: string | null;
  quotationReference: string;
  quotationTitle: string;
  quotationSnapshot: string;
  quotationPrice: string;
  quotationCurrency: string;
  quotedMachineName: string;
  quotedVariantLabel?: string | null;
  activityBody?: string;
  emailDeliveryFailed?: boolean;
}) {
  const sessions = await getAdvisorSessions();
  const sessionIndex = sessions.findIndex((session) => session.id === input.sessionId);
  if (sessionIndex < 0) {
    throw new Error("Lead session not found.");
  }

  const current = sessions[sessionIndex];
  const workflow = current.workflow ?? normalizeAdvisorSession(current).workflow!;
  const quotationBase = nowIso();
  const updated = normalizeAdvisorSession({
    ...current,
    workflow: {
      ...workflow,
      stage: ["new", "contact_scheduled", "contacted", "qualified"].includes(workflow.stage) ? "quoted" : workflow.stage,
      nextFollowUpAt: workflow.nextFollowUpAt ?? defaultNextFollowUpAt({ ...current, workflow: { ...workflow, quoteIssued: true, quotedAt: quotationBase } }),
      firstCallDueAt: workflow.firstCallDueAt ?? firstCallDueAt(current.createdAt, null, workflow.preferredCallbackAt ?? null),
      firstCallCompletedAt: workflow.firstCallCompletedAt ?? workflow.lastContactedAt ?? null,
      firstCallReminderSentAt: workflow.firstCallReminderSentAt ?? null,
      firstCallEscalationSentAt: workflow.firstCallEscalationSentAt ?? null,
      staleAlertSentAt: null,
      followUpStatus: workflow.preferredCallbackAt ? "scheduled" : workflow.followUpStatus ?? "scheduled",
      quoteIssued: true,
      quotationReference: input.quotationReference,
      quotationStatus: "issued",
      quotationSnapshot: input.quotationSnapshot,
      quotationPrice: input.quotationPrice,
      quotationCurrency: input.quotationCurrency,
      quotationTitle: input.quotationTitle,
      quotedAt: quotationBase,
      quotedMachineName: input.quotedMachineName,
      quotedVariantLabel: input.quotedVariantLabel ?? null,
      lastUpdatedAt: quotationBase,
      activity: [
        makeLeadActivity("quote_issued", input.activityBody ?? `Preliminary quotation ${input.quotationReference} issued.`, input.actorName ?? "System", input.actorRole ?? "system"),
        ...(input.emailDeliveryFailed ? [makeLeadActivity("email_delivery_failed", `Email delivery failed for quotation ${input.quotationReference} â€” follow up manually with the customer.`, "System", "system")] : []),
        ...(workflow.activity ?? [])
      ],
      notes: workflow.notes ?? []
    },
    diagnostics: {
      intent: current.diagnostics?.intent ?? "quote",
      found: current.diagnostics?.found ?? false,

      quoteAsked: true,
      preliminaryQuotationId: input.quotationId ?? current.diagnostics?.preliminaryQuotationId ?? null,
      preliminaryQuotationReference: input.quotationReference,
      matchedProductId: current.diagnostics?.matchedProductId ?? null,
      matchedCategory: current.diagnostics?.matchedCategory ?? null
    }
  });

  sessions[sessionIndex] = updated;
  await saveAdvisorSessions(sessions);
  return updated;
}

export async function issueLeadQuotationFromTemplate(input: {
  sessionId: string;
  templateId: string;
  actorName: string;
  actorRole: Role;
}) {
  const [sessions, templates] = await Promise.all([getAdvisorSessions(), getQuotationTemplates()]);
  const session = sessions.find((entry) => entry.id === input.sessionId);
  if (!session) {
    throw new Error("Lead session not found.");
  }

  const template = templates.find((entry) => entry.id === input.templateId && entry.active);
  if (!template) {
    throw new Error("Active quotation template not found.");
  }

  const quotation = await issuePreliminaryQuotation({
    template,
    requester: session.lead,
    productTitle: template.machineName || session.recommendation.recommendedCategory || "Welden machine",
    advisorSessionId: session.id
  });

  const delivery = await sendQuotationEmail({
    to: [session.lead.email],
    quotation,
    variantLabel: template.variantLabel ?? null
  });

  const updatedSession = await attachQuotationToAdvisorSession({
    sessionId: session.id,
    actorName: input.actorName,
    actorRole: input.actorRole,
    quotationId: quotation.id,
    quotationReference: quotation.referenceNumber,
    quotationTitle: quotation.quoteTitle,
    quotationSnapshot: quotation.quoteBody,
    quotationPrice: quotation.basePrice,
    quotationCurrency: quotation.currency,
    quotedMachineName: quotation.productTitle,
    quotedVariantLabel: template.variantLabel ?? null,
    activityBody: delivery.delivered
      ? `Preliminary quotation ${quotation.referenceNumber} issued and emailed to customer.`
      : `Preliminary quotation ${quotation.referenceNumber} prepared, but email delivery needs review.`
  });

  return {
    session: updatedSession,
    quotation,
    delivery
  };
}

export async function runLeadFollowUpSweep() {
  const [sessions, settings, users] = await Promise.all([
    getAdvisorSessions(),
    readCollection<Settings>("settings"),
    readCollection<User[]>("users")
  ]);

  let changed = false;
  const now = new Date();
  const nowTime = now.getTime();
  const reminderLeadMinutes = Math.max(30, (settings.slaReminderLeadHours ?? 4) * 60);
  const escalationLeadHours = Math.max(1, settings.slaEscalationLeadHours ?? 24);

  const sweepErrors: { leadId: string; leadName: string; error: string }[] = [];

  for (const session of sessions) {
    const workflow = session.workflow;
    if (!workflow || ["won", "lost"].includes(workflow.stage)) continue;

    try {
      const derived = deriveFollowUpState(session, workflow, workflow.followUpStatus ?? null);
      if (derived.nextFollowUpAt !== workflow.nextFollowUpAt || derived.followUpStatus !== workflow.followUpStatus) {
        workflow.nextFollowUpAt = derived.nextFollowUpAt;
        workflow.followUpStatus = derived.followUpStatus;
        changed = true;
      }

      const target = workflow.preferredCallbackAt ?? workflow.nextFollowUpAt;
      if (target) {
        const targetDate = new Date(target);
        if (!Number.isNaN(targetDate.getTime())) {
          const reminderAt = new Date(targetDate.getTime() - reminderLeadMinutes * 60_000);
          const alreadyReminded = workflow.lastReminderSentAt && new Date(workflow.lastReminderSentAt).getTime() >= reminderAt.getTime();
          if (now >= reminderAt && !alreadyReminded && !["completed", "won", "lost"].includes(workflow.followUpStatus ?? "")) {
            const owner = users.find((user) => user.id === workflow.ownerUserId && user.active);
            const recipients = Array.from(new Set([owner?.email, ...(settings.internalNotificationEmails ?? [])].filter(Boolean))) as string[];
            if (recipients.length) {
              const urgencyLine = workflow.quoteIssued ? "This lead already has a preliminary quotation and should be called promptly." : "This lead is waiting for direct follow-up in the Welden admin.";
              await sendEmail(
                recipients,
                `Lead follow-up reminder: ${session.lead.name} (${workflow.quotationReference ?? session.recommendation.recommendedCategory ?? "Welden lead"})`,
                [
                  `Lead: ${session.lead.name}`,
                  `Email: ${session.lead.email}`,
                  `Phone: ${session.lead.phone}`,
                  workflow.quotationReference ? `Quotation reference: ${workflow.quotationReference}` : null,
                  `Scheduled follow-up: ${targetDate.toISOString()}`,
                  workflow.preferredCallbackNote ? `Callback note: ${workflow.preferredCallbackNote}` : null,
                  urgencyLine,
                  "Please review the lead in the Welden admin and complete the follow-up."
                ].filter(Boolean).join("\n")
              );
            }
            workflow.lastReminderSentAt = nowIso();
            workflow.activity.unshift(makeLeadActivity("reminder_sent", `Follow-up reminder sent for ${session.lead.name}.`));
            changed = true;
          }
        }
      }

      const firstCallDue = workflow.firstCallDueAt ? new Date(workflow.firstCallDueAt) : null;
      const firstCallIsOpen = !workflow.firstCallCompletedAt && !workflow.lastContactedAt;
      if (firstCallIsOpen && firstCallDue && !Number.isNaN(firstCallDue.getTime())) {
        const escalationAt = new Date(firstCallDue.getTime() + escalationLeadHours * 60 * 60 * 1000);
        const alreadyEscalated = workflow.firstCallEscalationSentAt && new Date(workflow.firstCallEscalationSentAt).getTime() >= escalationAt.getTime();
        if (now >= escalationAt && !alreadyEscalated) {
          const owner = users.find((user) => user.id === workflow.ownerUserId && user.active);
          const recipients = Array.from(new Set([owner?.email, ...(settings.internalNotificationEmails ?? []), ...(settings.slaEscalationEmails ?? [])].filter(Boolean))) as string[];
          if (recipients.length) {
            await sendEmail(
              recipients,
              `Lead escalation: first call overdue for ${session.lead.name}`,
              [
                `Lead: ${session.lead.name}`,
                `Email: ${session.lead.email}`,
                `Phone: ${session.lead.phone}`,
                `Assigned staff: ${owner?.name ?? "Unassigned"}`,
                `First call deadline: ${firstCallDue.toISOString()}`,
                workflow.quotationReference ? `Quotation reference: ${workflow.quotationReference}` : null,
                `Current stage: ${workflow.stage}`,
                "This lead has passed the first-call deadline and now needs escalation follow-up."
              ].filter(Boolean).join("\n")
            );
          }
          workflow.firstCallEscalationSentAt = nowIso();
          workflow.activity.unshift(makeLeadActivity("escalation_sent", `First-call escalation sent for ${session.lead.name}.`));
          changed = true;
        }
      }

      const lastTouchedAt = lastMeaningfulLeadAt(session);
      const alreadyStaleAlertedAfterLastTouch = workflow.staleAlertSentAt && new Date(workflow.staleAlertSentAt).getTime() >= new Date(lastTouchedAt).getTime();
      if (isLeadStale(session, settings, nowTime) && !alreadyStaleAlertedAfterLastTouch) {
        const owner = users.find((user) => user.id === workflow.ownerUserId && user.active);
        const recipients = Array.from(new Set([owner?.email, ...(settings.internalNotificationEmails ?? [])].filter(Boolean))) as string[];
        if (recipients.length) {
          await sendEmail(
            recipients,
            `Stale lead alert: ${session.lead.name}`,
            [
              `Lead: ${session.lead.name}`,
              `Email: ${session.lead.email}`,
              `Phone: ${session.lead.phone}`,
              `Assigned staff: ${owner?.name ?? "Unassigned"}`,
              `Last meaningful activity: ${new Date(lastTouchedAt).toISOString()}`,
              workflow.quotationReference ? `Quotation reference: ${workflow.quotationReference}` : null,
              `Current stage: ${workflow.stage}`,
              "This lead has gone stale and should be reviewed for next action, re-engagement, or closure."
            ].filter(Boolean).join("\n")
          );
        }
        workflow.staleAlertSentAt = nowIso();
        workflow.activity.unshift(makeLeadActivity("stale_alert_sent", `Stale lead alert sent for ${session.lead.name}.`));
        changed = true;
      }
    } catch (error) {
      sweepErrors.push({
        leadId: session.id,
        leadName: session.lead.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (sweepErrors.length) {
    console.error(`[SLA sweep] ${sweepErrors.length} lead(s) failed processing:`, sweepErrors);
  }

  if (changed) {
    await saveAdvisorSessions(sessions);
  }

  return sessions;
}





