"use client";

import type { Dispatch, SetStateAction } from "react";
import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Filter, GripVertical, Loader2, Phone, RefreshCw, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InternalLeadAssistant } from "@/components/admin/leads/InternalLeadAssistant";
import { cn } from "@/lib/utils";
import type { AdvisorSession, LeadCallOutcome, LeadStage, LeadSuggestedAction, QuotationTemplate, User } from "@/lib/types";
import { fmtDate, fmtStatus, getLeadFirstCallState, getLeadHealthBadges, getLeadQualityBadge, isLeadStale, isSameLocalDay, leadStageOptions, type LeadWorkflowDraft } from "@/components/admin/shared/admin-panel-helpers";
import { boardStageThemes, relativeTime, type LeadMeta } from "./leads-view-helpers";
import { ActivityIcon, RowActionMenu } from "./leads-view-row";

type LeadsViewProps = {
  showLeadEditor: boolean;
  selectedLead: AdvisorSession | null;
  selectedLeadMeta: LeadMeta | null;
  staleLeadDays: number;
  setShowLeadEditor: (value: boolean) => void;
  saveLeadWorkflow: (options?: { markContactedNow?: boolean }) => Promise<void>;
  getSaveButtonLabel: (key: string, label: string) => string;
  leadQuotationTemplates: QuotationTemplate[];
  selectedLeadQuotationTemplate: QuotationTemplate | null;
  setLeadQuotationTemplateId: (value: string) => void;
  sendLeadQuotation: () => Promise<void>;
  leadQuoteSending: boolean;
  applyLeadFollowUpAction: (action: "one_hour" | "tomorrow_morning" | "align_callback" | "mark_no_answer" | "mark_complete") => Promise<void>;
  leadWorkflowDraft: LeadWorkflowDraft;
  setLeadWorkflowDraft: Dispatch<SetStateAction<LeadWorkflowDraft>>;
  users: User[];
  leadNoteDraft: string;
  setLeadNoteDraft: (value: string) => void;
  filteredLeads: AdvisorSession[];
  leadsWithMeta: LeadMeta[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  // FEAT-10: true while the debounced server search request is in-flight
  serverSearchLoading?: boolean;
  firstCallDueCount: number;
  quotedAwaitingCallCount: number;
  callbacksTodayCount: number;
  retryQueueCount: number;
  setSelectedLeadId: (id: string) => void;
  // WF-01: filters
  stageFilters: LeadStage[];
  setStageFilters: (value: LeadStage[]) => void;
  ownerFilter: string;
  setOwnerFilter: (value: string) => void;
  slaFilter: string;
  setSlaFilter: (value: string) => void;
  machineFilter: string;
  setMachineFilter: (value: string) => void;
  machineCategories: string[];
  currentUserRole: "admin" | "manager" | "agent";
  activeFilterCount: number;
  clearAllFilters: () => void;
  // WF-02 + WF-05: row quick actions
  applyRowQuickAction: (sessionId: string, action: "no_answer" | "mark_contacted" | "follow_up_tomorrow") => Promise<void>;
  rowQuickActionLoading: string | null;
  // WF-12: inline delivery feedback after quotation send
  leadQuoteDelivery: { delivered: boolean; provider: string } | null;
  assistantOverview: {
    leadsNeedingCallUpdate: number;
    callbacksDueNow: number;
    quotationsNeedingFollowUp: number;
    leadsWaitingOnAssets: number;
  };
  logLeadCallOutcome: (callOutcome: LeadCallOutcome, callSummary: string) => Promise<void>;
  // WF-08: bulk patch (reassign / stage change)
  bulkPatchLeads: (sessionIds: string[], patch: { stage?: LeadStage; ownerUserId?: string | null }) => Promise<boolean>;
  // PERF-01: pagination
  leadsTotal?: number;
  loadMoreLeads?: () => Promise<void>;
  loadingMoreLeads?: boolean;
  onRefresh?: () => Promise<void>;
};

export function LeadsView(props: LeadsViewProps) {
  const {
    showLeadEditor,
    selectedLead,
    selectedLeadMeta,
    staleLeadDays,
    setShowLeadEditor,
    saveLeadWorkflow,
    getSaveButtonLabel,
    leadQuotationTemplates,
    selectedLeadQuotationTemplate,
    setLeadQuotationTemplateId,
    sendLeadQuotation,
    leadQuoteSending,
    applyLeadFollowUpAction,
    leadWorkflowDraft,
    setLeadWorkflowDraft,
    users,
    leadNoteDraft,
    setLeadNoteDraft,
    filteredLeads,
    leadsWithMeta,
    searchTerm,
    setSearchTerm,
    firstCallDueCount,
    quotedAwaitingCallCount,
    callbacksTodayCount,
    retryQueueCount,
    setSelectedLeadId,
    stageFilters,
    setStageFilters,
    ownerFilter,
    setOwnerFilter,
    slaFilter,
    setSlaFilter,
    machineFilter,
    setMachineFilter,
    machineCategories,
    currentUserRole,
    activeFilterCount,
    clearAllFilters,
    applyRowQuickAction,
    rowQuickActionLoading,
    leadQuoteDelivery,
    assistantOverview,
    logLeadCallOutcome,
    bulkPatchLeads,
    leadsTotal,
    loadMoreLeads,
    loadingMoreLeads,
    serverSearchLoading,
    onRefresh
  } = props;
  const [refreshing, setRefreshing] = useState(false);

  // WF-07: activity timeline collapse state
  const [timelineOpen, setTimelineOpen] = useState(false);
  // WF-09: quotation preview modal state
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // WF-06: export — builds download URL from active filter state
  function buildExportUrl() {
    const params = new URLSearchParams();
    if (stageFilters.length) params.set("stage", stageFilters.join(","));
    if (ownerFilter && ownerFilter !== "mine" && ownerFilter !== "unassigned") params.set("ownerUserId", ownerFilter);
    return `/api/advisor-sessions/export?${params.toString()}`;
  }

  // WF-08: bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStage, setBulkStage] = useState<LeadStage | "">("");
  const [bulkOwner, setBulkOwner] = useState("");
  const [savedView, setSavedView] = useState<"all" | "stuck" | "cooling_quotes" | "unassigned_hot">("all");
  const [pipelineViewMode, setPipelineViewMode] = useState<"list" | "board">("list");
  const [boardStageDrafts, setBoardStageDrafts] = useState<Record<string, LeadStage>>({});
  const [boardStageOverrides, setBoardStageOverrides] = useState<Record<string, LeadStage>>({});
  const [boardStageLoadingId, setBoardStageLoadingId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    if (!showLeadEditor || !selectedLead) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [showLeadEditor, selectedLead?.id]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); setBulkStage(""); setBulkOwner(""); }

  function isCoolingQuote(entry: LeadMeta) {
    const workflow = entry.session.workflow;
    if (!workflow?.quoteIssued) return false;
    if (entry.session.workflow?.stage === "won" || entry.session.workflow?.stage === "lost") return false;
    if (!workflow.lastContactedAt) return true;
    const daysSinceContact = Math.floor((Date.now() - new Date(workflow.lastContactedAt).getTime()) / 86_400_000);
    return daysSinceContact >= 3;
  }

  function isStuckDeal(entry: LeadMeta) {
    const workflow = entry.session.workflow;
    const stage = workflow?.stage ?? "new";
    if (stage === "won" || stage === "lost") return false;

    const overdueFollowUp = Boolean(
      workflow?.nextFollowUpAt &&
      new Date(workflow.nextFollowUpAt).getTime() <= Date.now()
    );

    return isLeadStale(entry.session, staleLeadDays)
      || overdueFollowUp
      || workflow?.followUpStatus === "no_answer"
      || Boolean(workflow?.firstCallEscalationSentAt);
  }

  function isUnassignedHotLead(entry: LeadMeta) {
    const workflow = entry.session.workflow;
    return !workflow?.ownerUserId && entry.score >= 80 && !["won", "lost"].includes(workflow?.stage ?? "new");
  }

  const savedViewCards = [
    { id: "all" as const, label: "All pipeline", description: "Every visible deal in the working queue.", count: leadsWithMeta.length },
    { id: "stuck" as const, label: "Stuck deals", description: "Stale, overdue, or repeatedly missed deals that need intervention.", count: leadsWithMeta.filter(isStuckDeal).length },
    { id: "cooling_quotes" as const, label: "Cooling quotes", description: "Quoted leads that need human follow-up before they go cold.", count: leadsWithMeta.filter(isCoolingQuote).length },
    { id: "unassigned_hot" as const, label: "Unassigned hot leads", description: "High-intent opportunities without a clear owner yet.", count: leadsWithMeta.filter(isUnassignedHotLead).length }
  ];

  const visibleLeadRows = leadsWithMeta.filter((entry) => {
    switch (savedView) {
      case "stuck":
        return isStuckDeal(entry);
      case "cooling_quotes":
        return isCoolingQuote(entry);
      case "unassigned_hot":
        return isUnassignedHotLead(entry);
      default:
        return true;
    }
  });
  const boardStages: LeadStage[] = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"];
  const visibleLeadIdList = visibleLeadRows.map((entry) => entry.session.id);
  const visibleLeadIdKey = visibleLeadIdList.join("|");

  useEffect(() => {
    setBoardStageDrafts((current) => {
      const next: Record<string, LeadStage> = {};
      let changed = false;

      for (const entry of visibleLeadRows) {
        const leadId = entry.session.id;
        const actualStage = (entry.session.workflow?.stage ?? "new") as LeadStage;
        next[leadId] = boardStageOverrides[leadId] ?? current[leadId] ?? actualStage;
        if (next[leadId] !== current[leadId]) {
          changed = true;
        }
      }

      if (!changed && Object.keys(current).length === Object.keys(next).length) {
        return current;
      }

      return next;
    });
  }, [visibleLeadRows, boardStageOverrides]);

  const boardColumns = boardStages.map((stage) => ({
    stage,
    items: visibleLeadRows.filter((entry) => ((boardStageOverrides[entry.session.id] ?? entry.session.workflow?.stage ?? "new") as LeadStage) === stage)
  }));

  async function applyBulkStage() {
    if (!bulkStage || !selectedIds.size) return;
    setBulkLoading(true);
    await bulkPatchLeads(Array.from(selectedIds), { stage: bulkStage });
    clearSelection();
    setBulkLoading(false);
  }

  async function applyBulkOwner() {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    await bulkPatchLeads(Array.from(selectedIds), { ownerUserId: bulkOwner || null });
    clearSelection();
    setBulkLoading(false);
  }

  async function applyBoardStage(leadId: string, currentStage: LeadStage, stage: LeadStage) {
    if (stage === currentStage) return;

    setBoardStageLoadingId(leadId);
    setBoardStageOverrides((current) => ({ ...current, [leadId]: stage }));
    setBoardStageDrafts((current) => ({ ...current, [leadId]: stage }));

    try {
      const updated = await bulkPatchLeads([leadId], { stage });
      if (!updated) {
        setBoardStageDrafts((current) => ({ ...current, [leadId]: currentStage }));
      }
    } finally {
      setBoardStageOverrides((current) => {
        const next = { ...current };
        delete next[leadId];
        return next;
      });
      setBoardStageLoadingId(null);
      setDraggedLeadId(null);
      setDragOverStage(null);
    }
  }

  useEffect(() => {
    clearSelection();
  }, [savedView]);

  useEffect(() => {
    setBoardStageOverrides((current) => {
      const visibleLeadIds = new Set(visibleLeadIdList);
      const next = Object.fromEntries(
        Object.entries(current).filter(([leadId]) => visibleLeadIds.has(leadId))
      ) as Record<string, LeadStage>;
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [visibleLeadIdKey]);

  // WF-13: copy-to-clipboard state — tracks which key was just copied for brief ✓ flash
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  function copyToClipboard(key: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1500);
    });
  }

  async function fetchQuotePreview() {
    if (!selectedLead || !selectedLeadQuotationTemplate) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/quotation-templates/${selectedLeadQuotationTemplate.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedLead.id })
      });
      const data = await res.json() as { text?: string; error?: string };
      if (data.text) setPreviewText(data.text);
    } finally {
      setPreviewLoading(false);
    }
  }

  // WF-14: compute a context-aware nudge based on current lead state — purely client-side
  function getStagNudge(): string | null {
    if (!selectedLead) return null;
    const w = selectedLead.workflow;
    const stage = leadWorkflowDraft.stage;
    const daysSinceContact = w?.lastContactedAt
      ? Math.floor((Date.now() - new Date(w.lastContactedAt).getTime()) / 86_400_000)
      : null;
    const daysSinceQuote = w?.quotedAt
      ? Math.floor((Date.now() - new Date(w.quotedAt).getTime()) / 86_400_000)
      : null;

    if (stage === "won" || stage === "lost") return null;

    if (w?.quoteIssued && daysSinceQuote !== null && daysSinceQuote >= 3 && !w.lastContactedAt) {
      return `Quote issued ${daysSinceQuote}d ago with no call logged — follow up or move to lost.`;
    }
    if (w?.quoteIssued && daysSinceQuote !== null && daysSinceQuote >= 5 && daysSinceContact !== null && daysSinceContact >= 3) {
      return `Quote issued ${daysSinceQuote}d ago, last contact ${daysSinceContact}d ago — consider closing the loop.`;
    }
    if (stage === "proposal_sent" && daysSinceContact !== null && daysSinceContact >= 5) {
      return `Proposal sent ${daysSinceContact}d ago with no update — move to Won or Lost?`;
    }
    if (stage === "contacted" && daysSinceContact !== null && daysSinceContact === 0) {
      return "Contact logged today — ready to qualify?";
    }
    if (stage === "qualified" && !w?.quoteIssued) {
      return "Lead is qualified — consider sending a preliminary quotation.";
    }
    if (stage === "new" && w?.firstCallDueAt && new Date(w.firstCallDueAt).getTime() < Date.now()) {
      return "First call deadline has passed — call this lead or update the stage.";
    }
    return null;
  }

  const stageNudge = getStagNudge();

  function formatDueLabel(value?: string | null) {
    return value ? `Due ${fmtDate(value)}` : null;
  }

  function getSuggestedActionLabel(action?: LeadSuggestedAction | null) {
    switch (action) {
      case "call_again":
        return "Call the buyer again";
      case "schedule_callback":
        return "Schedule the callback window";
      case "send_brochure":
        return "Send the brochure and specs";
      case "prepare_quotation":
        return "Prepare the quotation";
      case "collect_details":
        return "Collect the missing buyer details";
      case "technical_review":
        return "Move into technical review";
      case "qualify_budget":
        return "Qualify budget and buying intent";
      case "correct_contact":
        return "Correct the contact details";
      case "close_lost":
        return "Close the lead as lost";
      case "schedule_follow_up":
        return "Schedule the next follow-up";
      case "schedule_meeting":
        return "Schedule the next meeting";
      case "mark_won":
        return "Mark the deal as won";
      default:
        return null;
    }
  }

  const nextBestAction = (() => {
    if (!selectedLead) return null;

    const workflow = selectedLead.workflow;
    const overdueFirstCall = Boolean(
      workflow?.firstCallDueAt &&
      new Date(workflow.firstCallDueAt).getTime() <= Date.now() &&
      !workflow.firstCallCompletedAt &&
      !workflow.lastContactedAt
    );
    const suggestedLabel = getSuggestedActionLabel(workflow?.nextSuggestedAction);

    if (leadWorkflowDraft.stage === "won" || leadWorkflowDraft.stage === "lost") {
      return {
        tone: "success" as const,
        eyebrow: "Next best action",
        title: leadWorkflowDraft.stage === "won" ? "Lock the win details." : "Capture why the deal was lost.",
        body: "Finish the close-out fields so the team keeps the commercial record clean and reusable.",
        due: null,
        context: leadWorkflowDraft.closeReason
          ? `Reason captured: ${leadWorkflowDraft.closeReason}${leadWorkflowDraft.closeReasonNote ? ` - ${leadWorkflowDraft.closeReasonNote}` : ""}`
          : "Add the close reason before you leave this workspace.",
        primaryLabel: "Save workspace",
        onPrimary: () => void saveLeadWorkflow()
      };
    }

    if (overdueFirstCall) {
      return {
        tone: "danger" as const,
        eyebrow: "Next best action",
        title: "Make the first human touch now.",
        body: "The buyer has entered the pipeline but the first-call SLA has already passed.",
        due: formatDueLabel(workflow?.firstCallDueAt),
        context: selectedLeadMeta?.nextStep ?? "Call the lead, confirm fit, and update the stage.",
        primaryLabel: "Log contact now",
        onPrimary: () => void saveLeadWorkflow({ markContactedNow: true }),
        secondaryLabel: "Follow up in 1 hour",
        onSecondary: () => void applyLeadFollowUpAction("one_hour")
      };
    }

    if (workflow?.quoteIssued && !workflow?.lastContactedAt) {
      return {
        tone: "warning" as const,
        eyebrow: "Next best action",
        title: "Follow up on the quotation.",
        body: "The quote is already out. The highest-leverage move is a direct buyer touchpoint before the deal cools off.",
        due: formatDueLabel(workflow?.nextFollowUpAt ?? workflow?.nextSuggestedActionDueAt),
        context: selectedLeadMeta?.nextStep ?? "Confirm receipt, answer objections, and move the deal forward.",
        primaryLabel: "Use callback window",
        onPrimary: () => void applyLeadFollowUpAction("align_callback"),
        secondaryLabel: "Preview quotation",
        onSecondary: () => void fetchQuotePreview()
      };
    }

    if (!workflow?.quoteIssued && leadWorkflowDraft.stage === "qualified") {
      return {
        tone: "secondary" as const,
        eyebrow: "Next best action",
        title: "Turn qualification into a commercial offer.",
        body: "The buyer looks qualified. Generate the quotation package while the context is still fresh.",
        due: formatDueLabel(workflow?.nextSuggestedActionDueAt),
        context: selectedLeadQuotationTemplate?.title
          ? `Best available template: ${selectedLeadQuotationTemplate.title}`
          : "Select a quotation template to move this lead into the proposal stage.",
        primaryLabel: "Preview quotation",
        onPrimary: () => void fetchQuotePreview(),
        secondaryLabel: "Generate and email quotation",
        onSecondary: () => void sendLeadQuotation()
      };
    }

    if (suggestedLabel) {
      return {
        tone: "secondary" as const,
        eyebrow: "Next best action",
        title: suggestedLabel,
        body: "This recommendation is based on the current workflow state, call history, and buyer timing.",
        due: formatDueLabel(workflow?.nextSuggestedActionDueAt ?? workflow?.nextFollowUpAt),
        context: workflow?.pendingAssistantPrompt ?? selectedLeadMeta?.nextStep ?? "Review the lead and move it to the next commercial milestone.",
        primaryLabel: "Use callback window",
        onPrimary: () => void applyLeadFollowUpAction("align_callback"),
        secondaryLabel: "Save workspace",
        onSecondary: () => void saveLeadWorkflow()
      };
    }

    return {
      tone: "outline" as const,
      eyebrow: "Next best action",
      title: selectedLeadMeta?.nextStep ?? "Review the lead and set the next move.",
      body: "No higher-priority automation cue is active, so use the workspace controls to keep the deal moving.",
      due: formatDueLabel(workflow?.nextFollowUpAt ?? workflow?.firstCallDueAt),
      context: workflow?.pendingAssistantPrompt ?? "Assign an owner, log the latest buyer context, and set the next follow-up.",
      primaryLabel: "Save workspace",
      onPrimary: () => void saveLeadWorkflow(),
      secondaryLabel: "Tomorrow 10:30 AM",
      onSecondary: () => void applyLeadFollowUpAction("tomorrow_morning")
    };
  })();

  const escalationAction = (() => {
    if (!selectedLead || currentUserRole === "agent") return null;

    const workflow = selectedLead.workflow;
    const stale = isLeadStale(selectedLead, staleLeadDays);
    const overdueFollowUp = Boolean(
      workflow?.nextFollowUpAt &&
      new Date(workflow.nextFollowUpAt).getTime() <= Date.now() &&
      leadWorkflowDraft.stage !== "won" &&
      leadWorkflowDraft.stage !== "lost"
    );
    const alreadyEscalated = Boolean(workflow?.firstCallEscalationSentAt);
    const repeatedNoAnswer = workflow?.followUpStatus === "no_answer";

    if (!stale && !overdueFollowUp && !alreadyEscalated && !repeatedNoAnswer) {
      return null;
    }

    const reasons = [
      stale ? `No meaningful contact inside the ${staleLeadDays}-day stale window.` : null,
      overdueFollowUp ? "The next follow-up date has already passed." : null,
      alreadyEscalated ? "The first-call SLA has already triggered an escalation." : null,
      repeatedNoAnswer ? "The lead is sitting in a repeated no-answer state." : null
    ].filter(Boolean) as string[];

    return {
      title: alreadyEscalated ? "Manager intervention recommended." : "Escalation mode is active.",
      body: "This lead is showing signs that normal queue handling is no longer enough. Treat the next move as an intervention, not a routine follow-up.",
      reasons,
      primaryLabel: "Tomorrow 10:30 AM",
      onPrimary: () => void applyLeadFollowUpAction("tomorrow_morning"),
      secondaryLabel: "Save workspace",
      onSecondary: () => void saveLeadWorkflow(),
      tertiaryLabel: "Mark no answer",
      onTertiary: () => void applyLeadFollowUpAction("mark_no_answer")
    };
  })();

  function toggleStageFilter(stage: LeadStage) {
    setStageFilters(
      stageFilters.includes(stage)
        ? stageFilters.filter((s) => s !== stage)
        : [...stageFilters, stage]
    );
  }

  const slaOptions = [
    { label: "Overdue", value: "overdue" },
    { label: "Due today", value: "due_today" },
    { label: "Stale", value: "stale" }
  ];

  return (
    <div className="space-y-6">
      {showLeadEditor && selectedLead ? (
        <div className="space-y-6">
          <InternalLeadAssistant
            selectedLead={selectedLead}
            overview={assistantOverview}
            onOpenLead={(leadId) => {
              setSelectedLeadId(leadId);
              setShowLeadEditor(true);
            }}
            onLogCallOutcome={logLeadCallOutcome}
            onScheduleFollowUp={() => {
              setShowLeadEditor(true);
            }}
          />

          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Commercial workspace</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">{selectedLead.lead.name}</h2>
              <p className="mt-2 text-sm leading-6 text-secondary md:text-base">Work the deal end to end from one place: qualification, quotation review, callbacks, objections, and the next commercial move.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant={selectedLead.workflow?.stage === "won" ? "success" : selectedLead.workflow?.stage === "lost" ? "outline" : "secondary"}>{fmtStatus(selectedLead.workflow?.stage ?? "new")}</Badge>
                {selectedLeadMeta ? <Badge variant={selectedLeadMeta.score >= 80 ? "warning" : selectedLeadMeta.score >= 60 ? "secondary" : "outline"}>{selectedLeadMeta.temperature} lead</Badge> : null}
                {selectedLead.workflow?.quotationReference ? <Badge variant="outline">{selectedLead.workflow.quotationReference}</Badge> : <Badge variant="outline">No quotation yet</Badge>}
                <Badge variant={getLeadFirstCallState(selectedLead).tone}>{getLeadFirstCallState(selectedLead).label}</Badge>
                {getLeadHealthBadges(selectedLead, staleLeadDays).map((badge) => {
                  // WF-15: Stale badge gets an explanatory sub-label
                  if (badge.label === "Stale") {
                    const lastTouched = selectedLead.workflow?.lastContactedAt ?? selectedLead.workflow?.lastUpdatedAt ?? selectedLead.workflow?.quotedAt ?? selectedLead.createdAt;
                    const daysStale = Math.floor((Date.now() - new Date(lastTouched).getTime()) / 86_400_000);
                    return (
                      <span key={badge.label} title={`No contact for ${daysStale} day${daysStale !== 1 ? "s" : ""} (last: ${relativeTime(lastTouched)})`}>
                        <Badge variant={badge.tone}>{badge.label} · {daysStale}d</Badge>
                      </span>
                    );
                  }
                  return <Badge key={badge.label} variant={badge.tone}>{badge.label}</Badge>;
                })}
                <Badge variant={getLeadQualityBadge(selectedLead.quality).variant}>{getLeadQualityBadge(selectedLead.quality).label}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 xl:justify-start">
              <Button variant="outline" onClick={() => setShowLeadEditor(false)}>Back to pipeline</Button>
              <Button onClick={() => void saveLeadWorkflow()}>{getSaveButtonLabel("lead-workflow", "Save workspace")}</Button>
            </div>
          </div>

          {currentUserRole === "agent" || pipelineViewMode === "list" ? (
          <Card className="overflow-hidden border border-outline-variant/10 shadow-sm">
            <div className="border-b border-outline-variant/10 bg-gradient-to-r from-primary to-[#173b79] px-6 py-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">Deal workspace</Badge>
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">{selectedLead.workflow?.quotationReference ?? "No quote yet"}</Badge>
              </div>
              <div className="mt-4 text-4xl font-black tracking-tight">{selectedLead.lead.company || selectedLead.lead.name}</div>
              <div className="mt-2 text-sm text-white/80">{selectedLead.recommendation.recommendedCategory ?? "Pending machine match"}</div>
            </div>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Primary contact</div>
                  <div className="mt-3 text-lg font-black text-primary">{selectedLead.lead.name}</div>
                  {/* WF-13: Copy-to-clipboard on email and phone */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-sm text-secondary">{selectedLead.lead.email}</span>
                    <button type="button" title="Copy email" onClick={() => copyToClipboard("email", selectedLead.lead.email)} className="shrink-0 text-[10px] font-bold text-secondary hover:text-primary">
                      {copiedKey === "email" ? "✓" : "⎘"}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-sm text-secondary">{selectedLead.lead.phone}</span>
                    <button type="button" title="Copy phone" onClick={() => copyToClipboard("phone", selectedLead.lead.phone)} className="shrink-0 text-[10px] font-bold text-secondary hover:text-primary">
                      {copiedKey === "phone" ? "✓" : "⎘"}
                    </button>
                    {/* WF-11: WhatsApp click-to-chat */}
                    <a
                      href={`https://wa.me/${selectedLead.lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${selectedLead.lead.name}, following up on your enquiry about the ${selectedLead.recommendation.recommendedCategory ?? "machine"} from Welden Industries.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in WhatsApp"
                      className="shrink-0 text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      WA
                    </a>
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Machine fit</div>
                  <div className="mt-3 text-lg font-black text-primary">{selectedLead.recommendation.recommendedCategory ?? "Needs match"}</div>
                  <div className="mt-1 text-sm text-secondary">{selectedLeadMeta?.nextStep ?? "Qualify machine need"}</div>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Lead score</div>
                  <div className="mt-3 text-lg font-black text-primary">{selectedLeadMeta?.score ?? 0}/100</div>
                  <div className="mt-1 text-sm text-secondary">Owner: {selectedLeadMeta?.owner?.name ?? "Unassigned"}</div>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">First call SLA</div>
                  <div className="mt-3 text-lg font-black text-primary">{selectedLead.workflow?.firstCallDueAt ? fmtDate(selectedLead.workflow.firstCallDueAt) : "Not scheduled"}</div>
                  <div className="mt-1 text-sm text-secondary">{getLeadFirstCallState(selectedLead).label}</div>
                  <div className="mt-2 text-xs text-secondary">Completed: {selectedLead.workflow?.firstCallCompletedAt ? fmtDate(selectedLead.workflow.firstCallCompletedAt) : "Not completed yet"}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-surface-container-low p-4 text-sm leading-7 text-secondary">
                      <div><span className="font-semibold text-on-surface">Company:</span> {selectedLead.lead.company || "Not provided"}</div>
                      <div><span className="font-semibold text-on-surface">Created:</span> {fmtDate(selectedLead.createdAt)}</div>
                      <div><span className="font-semibold text-on-surface">Intent:</span> {selectedLead.diagnostics?.intent ? fmtStatus(selectedLead.diagnostics.intent) : "General inquiry"}</div>
                      <div><span className="font-semibold text-on-surface">Machine need:</span> {selectedLead.answers.machineProblem || "No machine need captured."}</div>
                      <div><span className="font-semibold text-on-surface">Recommendation:</span> {selectedLead.recommendation.explanation}</div>
                    </div>
                    {selectedLead.recommendation.engineeringBrief && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7 text-secondary">
                        <div className="font-semibold text-primary">AI Engineering Feasibility Brief</div>
                        <div className="mt-2 whitespace-pre-wrap">{selectedLead.recommendation.engineeringBrief}</div>
                      </div>
                    )}
                    <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low/30 p-4 text-sm leading-7 text-secondary">
                      <div className="font-semibold text-on-surface">Lead quality</div>
                      <div className="mt-2">{selectedLead.quality?.warnings?.length ? selectedLead.quality.warnings.join(" ") : "No obvious issues found in the submitted details."}</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {nextBestAction && (
                      <div className={cn(
                        "rounded-[1.75rem] border px-5 py-5 shadow-sm lg:px-6",
                        nextBestAction.tone === "danger"
                          ? "border-red-200/80 bg-red-50/90"
                          : nextBestAction.tone === "warning"
                            ? "border-amber-200/80 bg-amber-50/90"
                            : nextBestAction.tone === "success"
                              ? "border-emerald-200/80 bg-emerald-50/90"
                              : nextBestAction.tone === "secondary"
                                ? "border-primary/15 bg-primary-fixed/10"
                                : "border-outline-variant/20 bg-surface-container-low/60"
                      )}>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">{nextBestAction.eyebrow}</div>
                          <div className="mt-2 text-2xl font-black tracking-tight text-on-surface">{nextBestAction.title}</div>
                          <div className="mt-2 text-sm leading-6 text-secondary">{nextBestAction.body}</div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {nextBestAction.due ? (
                              <Badge variant={nextBestAction.tone === "danger" ? "danger" : nextBestAction.tone === "warning" ? "warning" : "secondary"}>
                                {nextBestAction.due}
                              </Badge>
                            ) : null}
                            {selectedLead.workflow?.pendingAssistantPrompt ? (
                              <Badge variant="outline">Assistant cue active</Badge>
                            ) : null}
                            {selectedLead.workflow?.nextSuggestedAction ? (
                              <Badge variant="outline">{fmtStatus(selectedLead.workflow.nextSuggestedAction)}</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                          <Button className="justify-start" onClick={nextBestAction.onPrimary}>
                            {nextBestAction.primaryLabel}
                          </Button>
                          {nextBestAction.secondaryLabel && nextBestAction.onSecondary ? (
                            <Button variant="outline" className="justify-start" onClick={nextBestAction.onSecondary}>
                              {nextBestAction.secondaryLabel}
                            </Button>
                          ) : null}
                        </div>
                        <div className="mt-4 rounded-2xl bg-white/80 px-4 py-4 text-sm leading-6 text-secondary ring-1 ring-black/5">
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Why this move</div>
                          <div className="mt-2">{nextBestAction.context}</div>
                        </div>
                      </div>
                    )}

                    {escalationAction ? (
                      <div className="rounded-[1.75rem] border border-red-200/80 bg-red-50/85 px-5 py-5 shadow-sm lg:px-6">
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">Escalation mode</div>
                        <div className="mt-2 text-2xl font-black tracking-tight text-red-950">{escalationAction.title}</div>
                        <div className="mt-2 text-sm leading-6 text-red-900/80">{escalationAction.body}</div>
                        <div className="mt-4 space-y-2 rounded-2xl bg-white/80 px-4 py-4 text-sm text-red-900/80 ring-1 ring-red-200/70">
                          {escalationAction.reasons.map((reason) => (
                            <div key={reason} className="flex gap-2">
                              <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                          <Button className="justify-start bg-red-600 text-white hover:bg-red-700" onClick={escalationAction.onPrimary}>
                            {escalationAction.primaryLabel}
                          </Button>
                          <Button variant="outline" className="justify-start border-red-200 bg-white text-red-900 hover:bg-red-100" onClick={escalationAction.onSecondary}>
                            {escalationAction.secondaryLabel}
                          </Button>
                          <Button variant="outline" className="justify-start border-red-200 bg-white text-red-900 hover:bg-red-100" onClick={escalationAction.onTertiary}>
                            {escalationAction.tertiaryLabel}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="rounded-2xl bg-primary p-5 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">Preliminary quotation</div>
                      {/* WF-13: Copy quotation reference */}
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">{selectedLead.workflow?.quotationReference ?? "Pending"}</div>
                        {selectedLead.workflow?.quotationReference && (
                          <button type="button" title="Copy reference" onClick={() => copyToClipboard("ref", selectedLead.workflow!.quotationReference!)} className="text-[11px] font-bold text-white/60 hover:text-white">
                            {copiedKey === "ref" ? "✓" : "⎘"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 text-4xl font-black tracking-tight">{selectedLead.workflow?.quoteIssued ? `${selectedLead.workflow?.quotationCurrency ?? "INR"} ${selectedLead.workflow?.quotationPrice ?? "On request"}` : "On request"}</div>
                    <div className="mt-4 text-sm text-white/80">{selectedLead.workflow?.quotationTitle ?? "Stored quotation snapshot available when the chatbot issues a quote."}</div>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-outline-variant/10 bg-white p-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Quotation dispatch</div>
                      <div className="mt-2 text-lg font-black text-primary">Create and send a preliminary quotation from this lead</div>
                      <div className="mt-2 text-sm leading-6 text-secondary">Select the commercial template, then email the quotation directly to {selectedLead.lead.email} through Resend.</div>
                    </div>
                    {leadQuotationTemplates.length ? (
                      <>
                        <label className="grid gap-2 text-sm">
                          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Quotation template</span>
                          <select className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={selectedLeadQuotationTemplate?.id ?? ""} onChange={(e) => setLeadQuotationTemplateId(e.target.value)}>
                            {leadQuotationTemplates.map((template) => <option key={template.id} value={template.id}>{template.machineName}{template.variantLabel ? ` - ${template.variantLabel}` : ""} ({template.currency} {template.basePrice})</option>)}
                          </select>
                        </label>
                        <div className="rounded-xl bg-surface-container-low p-4 text-sm leading-6 text-secondary">
                          <div><span className="font-semibold text-on-surface">Template:</span> {selectedLeadQuotationTemplate?.title ?? "Not selected"}</div>
                          <div><span className="font-semibold text-on-surface">Machine:</span> {selectedLeadQuotationTemplate?.machineName ?? "Needs review"}</div>
                          <div><span className="font-semibold text-on-surface">Price:</span> {selectedLeadQuotationTemplate ? `${selectedLeadQuotationTemplate.currency} ${selectedLeadQuotationTemplate.basePrice}` : "On request"}</div>
                          <div><span className="font-semibold text-on-surface">Customer email:</span> {selectedLead.lead.email}</div>
                          {selectedLead.workflow?.quoteIssued ? <div className="mt-2 text-amber-700">A quotation already exists on this lead. Sending again will create a new quotation version and reference.</div> : null}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" onClick={() => void fetchQuotePreview()} disabled={previewLoading || !selectedLeadQuotationTemplate}>{previewLoading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating preview...</> : "Preview quotation"}</Button>
                          <Button onClick={() => void sendLeadQuotation()} disabled={leadQuoteSending}>{leadQuoteSending ? "Sending quotation..." : selectedLead.workflow?.quoteIssued ? "Send new quotation version" : "Generate and email quotation"}</Button>
                        </div>
                        {/* WF-12: inline delivery status banner */}
                        {leadQuoteDelivery && (
                          <div className={cn(
                            "rounded-xl px-4 py-3 text-sm font-medium",
                            leadQuoteDelivery.provider === "log_only"
                              ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                              : leadQuoteDelivery.delivered
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                                : "bg-red-50 text-red-800 border border-red-200/60"
                          )}>
                            {leadQuoteDelivery.provider === "log_only"
                              ? "Email logging only — customer was not notified. Configure Resend to enable delivery."
                              : leadQuoteDelivery.delivered
                                ? "Quotation emailed to customer via Resend."
                                : "Resend delivery failed — quotation was saved but the customer email was not sent."}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl bg-surface-container-low p-4 text-sm text-secondary">No active quotation templates are available for this lead yet. Add one in the quotation templates section first.</div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-outline-variant/10 bg-white p-4">
                    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Quotation snapshot</div>
                    {selectedLead.workflow?.quotationSnapshot ? (
                      <div className="max-h-[22rem] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-secondary">{selectedLead.workflow.quotationSnapshot}</div>
                    ) : (
                      <div className="text-sm text-secondary">No quotation text stored on this lead yet.</div>
                    )}
                  </div>
                  <div className="space-y-4 rounded-2xl border border-outline-variant/10 bg-white p-4">
                    <div className="rounded-2xl border border-primary/10 bg-primary-fixed/15 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Follow-up engine</div>
                          <div className="mt-2 text-lg font-black text-primary">Keep this lead moving without losing the callback window.</div>
                          <div className="mt-2 text-sm leading-6 text-secondary">Use the quick actions to schedule the next touchpoint, log no-answer retries, or close the loop immediately.</div>
                        </div>
                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-secondary shadow-sm">
                          <div className="font-semibold text-on-surface">Current cue</div>
                          <div className="mt-1">{selectedLeadMeta?.nextStep ?? "Review the lead and schedule the next action."}</div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <Button variant="outline" className="justify-start" onClick={() => void applyLeadFollowUpAction("one_hour")}>Follow up in 1 hour</Button>
                        <Button variant="outline" className="justify-start" onClick={() => void applyLeadFollowUpAction("tomorrow_morning")}>Tomorrow 10:30 AM</Button>
                        <Button variant="outline" className="justify-start" onClick={() => void applyLeadFollowUpAction("align_callback")}>Use callback window</Button>
                        <Button variant="outline" className="justify-start" onClick={() => void applyLeadFollowUpAction("mark_no_answer")}>Log no answer</Button>
                        <Button variant="outline" className="justify-start" onClick={() => void applyLeadFollowUpAction("mark_complete")}>Mark complete</Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Stage</span>
                        <select className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={leadWorkflowDraft.stage} onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, stage: e.target.value as LeadStage }))}>
                          {leadStageOptions.map((stage) => <option key={stage} value={stage}>{fmtStatus(stage)}</option>)}
                        </select>
                      </label>
                      {/* WF-14: Stage nudge — context-aware 1-line suggestion */}
                      {stageNudge && (
                        <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-xs leading-5 text-primary md:col-span-2">
                          {stageNudge}
                        </div>
                      )}
                      {/* WF-10: Close reason — shown when stage is won or lost */}
                      {(leadWorkflowDraft.stage === "won" || leadWorkflowDraft.stage === "lost") && (
                        <>
                          <label className="grid gap-2 text-sm">
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">
                              {leadWorkflowDraft.stage === "won" ? "Won reason" : "Lost reason"}
                            </span>
                            <select
                              className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none"
                              value={leadWorkflowDraft.closeReason}
                              onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, closeReason: e.target.value }))}
                            >
                              <option value="">— select a reason —</option>
                              {leadWorkflowDraft.stage === "won" ? (
                                <>
                                  <option value="Purchase confirmed">Purchase confirmed</option>
                                  <option value="PO received">PO received</option>
                                  <option value="Long-term contract">Long-term contract</option>
                                </>
                              ) : (
                                <>
                                  <option value="Price too high">Price too high</option>
                                  <option value="Went with competitor">Went with competitor</option>
                                  <option value="No budget">No budget</option>
                                  <option value="No response">No response</option>
                                  <option value="Wrong fit">Wrong fit</option>
                                  <option value="other">Other</option>
                                </>
                              )}
                            </select>
                          </label>
                          {(leadWorkflowDraft.closeReason === "other" || leadWorkflowDraft.stage === "won") && (
                            <label className="grid gap-2 text-sm">
                              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Additional note</span>
                              <input
                                type="text"
                                className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none"
                                placeholder={leadWorkflowDraft.stage === "won" ? "PO number, value, or other detail..." : "Describe the reason..."}
                                value={leadWorkflowDraft.closeReasonNote}
                                onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, closeReasonNote: e.target.value }))}
                              />
                            </label>
                          )}
                        </>
                      )}
                      <label className="grid gap-2 text-sm">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Owner</span>
                        <select className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={leadWorkflowDraft.ownerUserId} onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, ownerUserId: e.target.value }))}>
                          <option value="">Unassigned</option>
                          {users.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Follow-up status</span>
                        <select className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={leadWorkflowDraft.followUpStatus} onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, followUpStatus: e.target.value as LeadWorkflowDraft["followUpStatus"] }))}>
                          <option value="pending">Pending</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="due">Due</option>
                          <option value="completed">Completed</option>
                          <option value="no_answer">No answer</option>
                          <option value="call_back_later">Call back later</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Next follow-up</span>
                        <Input type="datetime-local" value={leadWorkflowDraft.nextFollowUpAt} onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, nextFollowUpAt: e.target.value }))} />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Preferred callback</span>
                        <Input type="datetime-local" value={leadWorkflowDraft.preferredCallbackAt} onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, preferredCallbackAt: e.target.value }))} />
                      </label>
                      <label className="grid gap-2 text-sm md:col-span-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Callback note</span>
                        <Textarea rows={3} placeholder="Preferred time, alternate number, buyer context..." value={leadWorkflowDraft.preferredCallbackNote} onChange={(e) => setLeadWorkflowDraft((current) => ({ ...current, preferredCallbackNote: e.target.value }))} />
                      </label>
                      <label className="grid gap-2 text-sm md:col-span-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Add note</span>
                        <Textarea rows={4} placeholder="Buyer objections, promise made, next step, or call summary..." value={leadNoteDraft} onChange={(e) => setLeadNoteDraft(e.target.value)} />
                      </label>
                      <div className="flex flex-wrap gap-3 md:col-span-2">
                        <Button onClick={() => void saveLeadWorkflow()}>{getSaveButtonLabel("lead-workflow", "Save workflow")}</Button>
                        <Button variant="outline" onClick={() => void saveLeadWorkflow({ markContactedNow: true })}>Log contact now</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* WF-07: Activity timeline */}
              {(() => {
                const activity = [...(selectedLead.workflow?.activity ?? [])];
                const notes = [...(selectedLead.workflow?.notes ?? [])];
                if (!activity.length && !notes.length) return null;
                return (
                  <div className="rounded-2xl border border-outline-variant/10 bg-white">
                    <button
                      type="button"
                      onClick={() => setTimelineOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left transition-colors hover:bg-surface-container-low/60"
                    >
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Activity timeline</div>
                        <div className="mt-0.5 text-sm font-semibold text-on-surface">{activity.length} event{activity.length !== 1 ? "s" : ""}{notes.length ? ` · ${notes.length} staff note${notes.length !== 1 ? "s" : ""}` : ""}</div>
                      </div>
                      {timelineOpen ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-secondary" />}
                    </button>
                    {timelineOpen && (
                      <div className="border-t border-outline-variant/10 px-5 pb-5 pt-4 space-y-6">
                        {/* Activity log — newest first */}
                        <div>
                          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Events</div>
                          <div className="space-y-2">
                            {activity.map((entry) => (
                              <div key={entry.id} className="flex items-start gap-3 rounded-xl bg-surface-container-low px-4 py-3">
                                <div className="mt-0.5 shrink-0"><ActivityIcon type={entry.type} /></div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm text-on-surface">{entry.body}</div>
                                  <div className="mt-1 text-[11px] text-secondary">{entry.authorName} · {relativeTime(entry.createdAt)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Staff notes — newest first */}
                        {notes.length > 0 && (
                          <div>
                            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Staff notes</div>
                            <div className="space-y-2">
                              {notes.map((note) => (
                                <div key={note.id} className="rounded-xl border border-outline-variant/12 bg-white px-4 py-3">
                                  <div className="whitespace-pre-wrap text-sm leading-6 text-on-surface">{note.body}</div>
                                  <div className="mt-2 text-[11px] text-secondary">{note.authorName} ({note.authorRole}) · {relativeTime(note.createdAt)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          ) : null}

          {/* WF-09: Quotation preview modal */}
          {previewText && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewText(null)}>
              <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.32)]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Quotation preview</div>
                    <div className="mt-0.5 text-lg font-black text-primary">{selectedLeadQuotationTemplate?.title ?? "Preview"}</div>
                  </div>
                  <button type="button" onClick={() => setPreviewText(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-surface-container-high hover:text-primary">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-on-surface">{previewText}</pre>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-outline-variant/10 px-6 py-4">
                  <Button variant="outline" onClick={() => setPreviewText(null)}>Close preview</Button>
                  <Button onClick={() => { setPreviewText(null); void sendLeadQuotation(); }} disabled={leadQuoteSending}>
                    {selectedLead?.workflow?.quoteIssued ? "Confirm and send new version" : "Confirm and send"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <InternalLeadAssistant
            overview={assistantOverview}
            onOpenLead={(leadId) => {
              setSelectedLeadId(leadId);
              setShowLeadEditor(true);
            }}
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border border-outline-variant/12 bg-white shadow-sm"><CardContent className="p-5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Visible pipeline</div><div className="mt-3 flex items-end justify-between gap-3"><div className="text-4xl font-black tracking-tight text-primary">{filteredLeads.length}</div><Badge variant="outline">Queue</Badge></div><div className="mt-2 text-sm text-secondary">All commercially active leads currently visible in this workspace.</div></CardContent></Card>
            <Card className="overflow-hidden border border-orange-200/80 bg-white shadow-sm"><CardContent className="p-5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Quotes cooling off</div><div className="mt-3 flex items-end justify-between gap-3"><div className="text-4xl font-black tracking-tight text-primary">{quotedAwaitingCallCount}</div><Badge variant="warning">Commercial</Badge></div><div className="mt-2 text-sm text-secondary">Quotes already sent that still need a direct human follow-up.</div></CardContent></Card>
            <Card className="overflow-hidden border border-outline-variant/12 bg-white shadow-sm"><CardContent className="p-5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Callbacks today</div><div className="mt-3 flex items-end justify-between gap-3"><div className="text-4xl font-black tracking-tight text-primary">{callbacksTodayCount}</div><Badge variant="secondary">Scheduled</Badge></div><div className="mt-2 text-sm text-secondary">Buyer conversations already scheduled into today&apos;s operating window.</div></CardContent></Card>
            <Card className="overflow-hidden border border-outline-variant/12 bg-white shadow-sm"><CardContent className="p-5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Retry queue</div><div className="mt-3 flex items-end justify-between gap-3"><div className="text-4xl font-black tracking-tight text-primary">{retryQueueCount}</div><Badge variant={retryQueueCount > 0 ? "warning" : "outline"}>{retryQueueCount > 0 ? "Action" : "Clear"}</Badge></div><div className="mt-2 text-sm text-secondary">No-answer and callback-later leads ready for another attempt.</div></CardContent></Card>
          </section>

          {currentUserRole !== "agent" ? (
            <section className="grid gap-4 xl:grid-cols-4">
              {savedViewCards.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setSavedView(view.id)}
                  className={cn(
                    "rounded-3xl border px-5 py-5 text-left transition-all",
                    savedView === view.id
                      ? "border-primary bg-primary-fixed/12 shadow-[0_18px_38px_-26px_rgba(22,59,121,0.5)]"
                      : "border-outline-variant/12 bg-white hover:border-primary/25 hover:bg-surface-container-low"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Saved view</div>
                      <div className="mt-2 text-lg font-black tracking-tight text-primary">{view.label}</div>
                    </div>
                    <Badge variant={savedView === view.id ? "secondary" : "outline"}>{view.count}</Badge>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-secondary">{view.description}</div>
                </button>
              ))}
            </section>
          ) : null}

          {currentUserRole !== "agent" ? (
            <section className="rounded-3xl border border-outline-variant/12 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Manager view</div>
                  <div className="mt-1 text-xl font-black tracking-tight text-primary">Pipeline board</div>
                  <div className="mt-1 text-sm leading-6 text-secondary">Switch between the execution list and a stage board to spot blocked flow and ownership gaps faster. Drag cards across lanes to update stage instantly.</div>
                </div>
                <div className="inline-flex rounded-full bg-surface-container-low p-1">
                  <button
                    type="button"
                    onClick={() => setPipelineViewMode("list")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      pipelineViewMode === "list" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-on-surface"
                    )}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setPipelineViewMode("board")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      pipelineViewMode === "board" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-on-surface"
                    )}
                  >
                    Board
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {currentUserRole !== "agent" && pipelineViewMode === "board" ? (
            <section className="overflow-hidden rounded-[2rem] border border-outline-variant/12 bg-[radial-gradient(circle_at_top_left,rgba(26,75,140,0.08),transparent_22%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] shadow-[0_28px_80px_-42px_rgba(15,23,42,0.3)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10 px-5 py-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Kanban flow</div>
                  <div className="mt-1 text-base font-black tracking-tight text-primary">Stage lanes with live drag-and-drop</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-outline-variant/15 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {visibleLeadRows.length} active cards
                  </div>
                  <div className="rounded-full border border-outline-variant/15 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {visibleLeadRows.filter((entry) => entry.score >= 80).length} hot
                  </div>
                  <div className="rounded-full border border-outline-variant/15 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    Drag to move stage
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto px-4 py-4">
                <div className="flex min-w-max gap-4 pb-2">
                {boardColumns.map((column) => (
                  <div
                    key={column.stage}
                    onDragOver={(event) => {
                      if (!draggedLeadId) return;
                      event.preventDefault();
                      setDragOverStage(column.stage);
                    }}
                    onDragEnter={(event) => {
                      if (!draggedLeadId) return;
                      event.preventDefault();
                      setDragOverStage(column.stage);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggedLeadId) return;
                      const draggedEntry = visibleLeadRows.find((entry) => entry.session.id === draggedLeadId);
                      if (!draggedEntry) return;
                      const currentStage = ((boardStageOverrides[draggedLeadId] ?? draggedEntry.session.workflow?.stage ?? "new") as LeadStage);
                      void applyBoardStage(draggedLeadId, currentStage, column.stage);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                      setDragOverStage((current) => current === column.stage ? null : current);
                    }}
                    className={cn(
                      "flex min-h-[34rem] w-[320px] shrink-0 flex-col rounded-[1.75rem] border p-3 transition-all duration-200",
                      boardStageThemes[column.stage].lane,
                      dragOverStage === column.stage && draggedLeadId ? boardStageThemes[column.stage].laneActive : ""
                    )}
                  >
                    <div className="sticky top-0 z-10 rounded-[1.2rem] border border-white/60 bg-white/80 px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                            <span className={cn("h-2.5 w-2.5 rounded-full", boardStageThemes[column.stage].dot)} />
                            Stage lane
                          </div>
                          <div className={cn("mt-1 text-base font-black tracking-tight", boardStageThemes[column.stage].accentText)}>{fmtStatus(column.stage)}</div>
                        </div>
                        <Badge variant={column.stage === "won" ? "success" : column.stage === "lost" ? "outline" : "secondary"}>
                          {column.items.length}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                          {column.items.filter((entry) => entry.score >= 80).length} hot
                        </span>
                        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                          {column.items.filter((entry) => !entry.owner).length} unassigned
                        </span>
                        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                          {column.items.filter((entry) => getLeadFirstCallState(entry.session).label === "Call overdue").length} overdue
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex-1 space-y-3">
                      {column.items.length ? column.items.map((entry) => {
                        const lead = entry.session;
                        const attention = getLeadFirstCallState(lead);
                        const currentStage = ((boardStageOverrides[lead.id] ?? lead.workflow?.stage ?? "new") as LeadStage);
                        const draftStage = boardStageDrafts[lead.id] ?? currentStage;
                        const stageDirty = draftStage !== currentStage;
                        const stageUpdating = boardStageLoadingId === lead.id;
                        const qualityBadge = getLeadQualityBadge(lead.quality);
                        const healthBadges = getLeadHealthBadges(lead, staleLeadDays);
                        const isDragging = draggedLeadId === lead.id;
                        return (
                          <div
                            key={lead.id}
                            draggable={!stageUpdating}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", lead.id);
                              setDraggedLeadId(lead.id);
                              setDragOverStage(currentStage);
                            }}
                            onDragEnd={() => {
                              setDraggedLeadId(null);
                              setDragOverStage(null);
                            }}
                            className={cn(
                              "w-full rounded-[1.4rem] border border-white/80 bg-white/95 px-4 py-4 text-left shadow-sm transition-all duration-200",
                              "hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white",
                              boardStageThemes[column.stage].cardGlow,
                              !stageUpdating && "cursor-grab active:cursor-grabbing",
                              isDragging && "scale-[0.985] opacity-60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                                <span className="rounded-full bg-surface-container-low px-2 py-1">{entry.temperature}</span>
                                <span className="flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1">
                                  <GripVertical className="h-3 w-3" />
                                  Drag
                                </span>
                              </div>
                              <Badge variant={entry.score >= 80 ? "warning" : entry.score >= 60 ? "secondary" : "outline"}>
                                {entry.score}
                              </Badge>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedLeadId(lead.id); setShowLeadEditor(true); }}
                              className="mt-3 w-full text-left"
                            >
                              <div className="min-w-0">
                                <div className="text-base font-black tracking-tight text-on-surface">{lead.lead.name}</div>
                                <div className="mt-1 line-clamp-1 text-sm text-secondary">{lead.lead.company || "Direct buyer inquiry"}</div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="outline">{lead.recommendation.recommendedCategory ?? "Needs match"}</Badge>
                                <Badge variant={attention.tone}>{attention.label}</Badge>
                                <Badge variant={qualityBadge.variant}>{qualityBadge.label}</Badge>
                                {healthBadges.map((badge) => (
                                  <Badge key={`${lead.id}-${badge.label}`} variant={badge.tone}>
                                    {badge.label}
                                  </Badge>
                                ))}
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <div className="rounded-2xl bg-surface-container-low/80 px-3 py-2">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Owner</div>
                                  <div className="mt-1 text-sm font-semibold text-on-surface">{entry.owner?.name ?? "Unassigned"}</div>
                                </div>
                                <div className="rounded-2xl bg-surface-container-low/80 px-3 py-2">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Last touch</div>
                                  <div className="mt-1 text-sm font-semibold text-on-surface">{lead.workflow?.lastContactedAt ? relativeTime(lead.workflow.lastContactedAt) : "Not logged"}</div>
                                </div>
                              </div>
                              <div className="mt-4 rounded-2xl border border-outline-variant/10 bg-surface-container-low/55 px-3 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Next move</div>
                                <div className="mt-1 text-sm leading-6 text-on-surface">{entry.nextStep}</div>
                              </div>
                            </button>
                            <div className="mt-4 border-t border-outline-variant/10 pt-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Move stage</div>
                                {stageUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" /> : null}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <select
                                  value={draftStage}
                                  disabled={stageUpdating}
                                  onChange={(e) => setBoardStageDrafts((current) => ({ ...current, [lead.id]: e.target.value as LeadStage }))}
                                  className="h-10 flex-1 rounded-xl border border-outline-variant/10 bg-surface-container-low/80 px-3 text-sm text-on-surface outline-none"
                                >
                                  {boardStages.map((stage) => (
                                    <option key={stage} value={stage}>{fmtStatus(stage)}</option>
                                  ))}
                                </select>
                                <Button
                                  variant="outline"
                                  className="h-10 px-3 text-[11px]"
                                  disabled={!stageDirty || stageUpdating}
                                  onClick={() => void applyBoardStage(lead.id, currentStage, draftStage)}
                                >
                                  Move
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className={cn(
                          "flex min-h-[12rem] items-center justify-center rounded-[1.4rem] border border-dashed px-4 py-8 text-center text-sm text-secondary",
                          dragOverStage === column.stage && draggedLeadId ? "border-primary/35 bg-white/90 text-on-surface" : "border-outline-variant/20 bg-white/60"
                        )}>
                          {dragOverStage === column.stage && draggedLeadId ? "Drop here to move this deal." : "No deals in this stage yet."}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </section>
          ) : null}

          <Card className="overflow-hidden border border-outline-variant/10 shadow-sm">
            <CardHeader className="border-b border-outline-variant/10 bg-white/80 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Pipeline command center</div>
                  <CardTitle className="mt-2 text-[1.9rem] tracking-tight text-primary">Commercial lead pipeline</CardTitle>
                  <CardDescription className="mt-1 text-sm leading-6">Scan machine fit, quote state, ownership, and next move without leaving the queue.</CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full min-w-[280px] max-w-md">
                    {/* FEAT-10: show spinner while debounced server search is in-flight */}
                    {serverSearchLoading
                      ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                      : <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    }
                    <Input className="h-11 rounded-xl border-none bg-surface-container-low pl-10 shadow-none" placeholder="Search the commercial pipeline..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  {/* Refresh leads — pulls latest from server */}
                  {onRefresh && (
                    <button
                      type="button"
                      disabled={refreshing}
                      onClick={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }}
                      className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-outline-variant/20 bg-white px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  )}
                  {/* WF-06: Export CSV — admin/manager only */}
                  {currentUserRole !== "agent" && (
                    <a
                      href={buildExportUrl()}
                      download
                      className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-outline-variant/20 bg-white px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface"
                    >
                      Export CSV
                    </a>
                  )}
                  <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                    <span>{visibleLeadRows.length} visible</span>
                    <span className="text-outline-variant">/</span>
                    <span>{firstCallDueCount} due</span>
                    {activeFilterCount > 0 ? (
                      <>
                        <span className="text-outline-variant">/</span>
                        <span className="text-primary">{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* ── WF-01: Filter bar ─────────────────────────── */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/10 pt-4">
                {/* Stage chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"] as LeadStage[]).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => toggleStageFilter(stage)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                        stageFilters.includes(stage)
                          ? "bg-primary text-white"
                          : "bg-surface-container-low text-secondary hover:bg-surface-container-high hover:text-on-surface"
                      )}
                    >
                      {fmtStatus(stage)}
                    </button>
                  ))}
                </div>

                {/* SLA chips */}
                <div className="flex flex-wrap gap-1.5">
                  {slaOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSlaFilter(slaFilter === option.value ? "" : option.value)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                        slaFilter === option.value
                          ? "bg-amber-500 text-white"
                          : "bg-surface-container-low text-secondary hover:bg-surface-container-high hover:text-on-surface"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Owner dropdown — admin and manager only */}
                {currentUserRole !== "agent" && (
                  <select
                    className="h-8 rounded-lg bg-surface-container-low px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary outline-none transition-colors hover:bg-surface-container-high"
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                  >
                    <option value="">All owners</option>
                    <option value="mine">Mine</option>
                    <option value="unassigned">Unassigned</option>
                    {users.filter((u) => u.active).map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                )}

                {/* Machine category dropdown */}
                {machineCategories.length > 0 && (
                  <select
                    className="h-8 rounded-lg bg-surface-container-low px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary outline-none transition-colors hover:bg-surface-container-high"
                    value={machineFilter}
                    onChange={(e) => setMachineFilter(e.target.value)}
                  >
                    <option value="">All machines</option>
                    {machineCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}

                {/* Clear filters */}
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/15"
                  >
                    <X className="h-3 w-3" />
                    Clear {activeFilterCount}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* WF-08: Bulk actions toolbar — appears when ≥1 row is checked */}
              {selectedIds.size > 0 && currentUserRole !== "agent" && (
                <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/10 bg-primary/5 px-6 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-8 rounded-lg bg-white px-3 text-[11px] font-bold text-on-surface outline-none ring-1 ring-outline-variant/20"
                      value={bulkStage}
                      onChange={(e) => setBulkStage(e.target.value as LeadStage | "")}
                    >
                      <option value="">Change stage…</option>
                      {leadStageOptions.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
                    </select>
                    <Button variant="outline" className="h-8 text-[11px]" disabled={!bulkStage || bulkLoading} onClick={() => void applyBulkStage()}>
                      {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply stage"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-8 rounded-lg bg-white px-3 text-[11px] font-bold text-on-surface outline-none ring-1 ring-outline-variant/20"
                      value={bulkOwner}
                      onChange={(e) => setBulkOwner(e.target.value)}
                    >
                      <option value="">Reassign to…</option>
                      <option value="">Unassigned</option>
                      {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <Button variant="outline" className="h-8 text-[11px]" disabled={bulkLoading} onClick={() => void applyBulkOwner()}>
                      {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reassign"}
                    </Button>
                  </div>
                  <button type="button" onClick={clearSelection} className="ml-auto text-[11px] font-bold text-secondary hover:text-primary">
                    Clear
                  </button>
                </div>
              )}
              {/* Column headers — action column added */}
              <div className={cn(
                "hidden gap-4 border-b border-outline-variant/10 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-secondary lg:grid",
                currentUserRole !== "agent" ? "grid-cols-[2rem_1.75fr_0.95fr_0.7fr_1fr_0.8fr_5rem]" : "grid-cols-[1.75fr_0.95fr_0.7fr_1fr_0.8fr_5rem]"
              )}>
                {currentUserRole !== "agent" && <div />}
                <div>Lead name</div>
                <div>Machine fit</div>
                <div>Score</div>
                <div>Interaction</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {visibleLeadRows.length ? visibleLeadRows.map((entry) => {
                  const lead = entry.session;
                  const stage = lead.workflow?.stage ?? "new";
                  const qualityBadge = getLeadQualityBadge(lead.quality);
                  const interactionLabel = lead.workflow?.lastContactedAt ? `${fmtDate(lead.workflow.lastContactedAt)} via call` : `${fmtDate(lead.createdAt)} via chatbot`;
                  // WF-05: contacted-today indicator
                  const contactedToday = lead.workflow?.lastContactedAt ? isSameLocalDay(lead.workflow.lastContactedAt) : false;
                  const isLoadingAction = rowQuickActionLoading === lead.id;
                  return (
                    <div key={lead.id} className={cn("relative flex w-full items-stretch bg-white transition-colors hover:bg-surface-container-low/50", contactedToday && "bg-emerald-50/30", selectedIds.has(lead.id) && "bg-primary/4")}>
                      {/* WF-05: contacted-today left border accent */}
                      {contactedToday && <div className="absolute left-0 top-0 h-full w-1 rounded-r bg-emerald-400" aria-hidden="true" />}

                      {/* WF-08: row checkbox — admin/manager only */}
                      {currentUserRole !== "agent" && (
                        <div className="flex items-center px-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.lead.name}`}
                            checked={selectedIds.has(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            className="h-4 w-4 cursor-pointer rounded accent-primary"
                          />
                        </div>
                      )}

                      {/* Main clickable row area */}
                      <button
                        type="button"
                        onClick={() => { setSelectedLeadId(lead.id); setShowLeadEditor(true); }}
                        className="grid min-w-0 flex-1 gap-4 px-6 py-5 text-left lg:grid-cols-[1.75fr_0.95fr_0.7fr_1fr_0.8fr] lg:items-center"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-sm font-black uppercase text-primary">
                            {lead.lead.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-black leading-6 text-primary">{lead.lead.name}</div>
                              {lead.workflow?.quotationReference ? <Badge variant="outline">{lead.workflow.quotationReference}</Badge> : null}
                              {/* WF-05: contacted-today badge */}
                              {contactedToday ? <Badge variant="success" className="text-[9px]">Called today</Badge> : null}
                            </div>
                            <div className="mt-1 text-sm text-secondary">{lead.lead.company || "Direct buyer inquiry"}</div>
                            <div className="mt-2 text-sm text-secondary">{lead.lead.email} | {lead.lead.phone}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
                          <Badge variant="secondary">{lead.recommendation.recommendedCategory ?? "Needs machine match"}</Badge>
                          <Badge variant={qualityBadge.variant}>{qualityBadge.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-container-high">
                            <div className={cn("h-full rounded-full", entry.score >= 80 ? "bg-emerald-500" : entry.score >= 60 ? "bg-amber-500" : "bg-slate-400")} style={{ width: `${Math.min(entry.score, 100)}%` }} />
                          </div>
                          <div className="text-lg font-black text-primary">{entry.score}</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-on-surface">{interactionLabel}</div>
                          <div className="mt-1 text-sm text-secondary">
                            {lead.workflow?.firstCallCompletedAt || lead.workflow?.lastContactedAt
                              ? (lead.workflow?.nextFollowUpAt ? `Follow-up ${fmtDate(lead.workflow.nextFollowUpAt)}` : entry.nextStep)
                              : (lead.workflow?.firstCallDueAt ? `First call due ${fmtDate(lead.workflow.firstCallDueAt)}` : entry.nextStep)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Badge variant={stage === "won" ? "success" : stage === "lost" ? "outline" : stage === "proposal_sent" ? "warning" : "secondary"}>{fmtStatus(stage)}</Badge>
                          <Badge variant={getLeadFirstCallState(lead).tone}>{getLeadFirstCallState(lead).label}</Badge>
                          {getLeadHealthBadges(lead, staleLeadDays).map((badge) => <Badge key={badge.label} variant={badge.tone}>{badge.label}</Badge>)}
                          {lead.workflow?.quoteIssued ? <Badge variant="success">Quoted</Badge> : null}
                        </div>
                      </button>

                      {/* WF-02 + WF-05: action column */}
                      <div className="flex flex-col items-center justify-center gap-1.5 border-l border-outline-variant/10 px-3 py-4">
                        {/* WF-05: one-click contact log */}
                        <button
                          type="button"
                          title="Log called now"
                          onClick={() => void applyRowQuickAction(lead.id, "mark_contacted")}
                          disabled={isLoadingAction}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                            contactedToday
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-secondary hover:bg-surface-container-high hover:text-primary"
                          )}
                        >
                          {isLoadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
                        </button>
                        {/* WF-02: more actions menu */}
                        <RowActionMenu
                          sessionId={lead.id}
                          loading={isLoadingAction}
                          onNoAnswer={() => void applyRowQuickAction(lead.id, "no_answer")}
                          onMarkContacted={() => void applyRowQuickAction(lead.id, "mark_contacted")}
                          onFollowUpTomorrow={() => void applyRowQuickAction(lead.id, "follow_up_tomorrow")}
                        />
                      </div>
                    </div>
                  );
                }) : <div className="px-6 py-12 text-center text-sm text-secondary">No leads match the current saved view{activeFilterCount > 0 || searchTerm ? ", search, or active filters" : ""}.</div>}
              </div>

              {/* PERF-01: Load more button — shown when there are more sessions server-side than currently loaded */}
              {leadsTotal !== undefined && filteredLeads.length < leadsTotal && !activeFilterCount && !searchTerm && (
                <div className="flex items-center justify-between border-t border-outline-variant/10 px-6 py-4">
                  <span className="text-sm text-secondary">Showing {filteredLeads.length} of {leadsTotal} leads</span>
                  <button
                    type="button"
                    onClick={() => void loadMoreLeads?.()}
                    disabled={loadingMoreLeads}
                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
                  >
                    {loadingMoreLeads ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Load more
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
