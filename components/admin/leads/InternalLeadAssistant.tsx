"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, BrainCircuit, ChevronDown, ChevronUp, Loader2, Maximize2, MessageSquare, MessageSquareWarning, Minimize2, PhoneCall, SendHorizontal, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChatMarkdown } from "@/components/ui/chat-markdown";
import { cn } from "@/lib/utils";
import type { AdvisorSession, AssistantProposal, InternalAssistantResponse, LeadCallOutcome } from "@/lib/types";

type AssistantMessage = {
  role: "assistant" | "user";
  text: string;
  actions?: AssistantProposal[];
};

const outcomeOptions: Array<{ value: LeadCallOutcome; label: string }> = [
  { value: "no_answer", label: "No answer" },
  { value: "call_back_requested", label: "Call back requested" },
  { value: "send_brochure", label: "Send brochure" },
  { value: "send_quotation", label: "Send quotation" },
  { value: "needs_more_details", label: "Need more details" },
  { value: "technical_discussion_needed", label: "Technical discussion needed" },
  { value: "budget_not_clear", label: "Budget not clear" },
  { value: "wrong_contact", label: "Wrong contact" },
  { value: "not_interested", label: "Not interested" },
  { value: "follow_up_later", label: "Follow up later" },
  { value: "meeting_scheduled", label: "Meeting scheduled" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" }
];

export function InternalLeadAssistant({
  selectedLead,
  overview,
  onOpenLead,
  onLogCallOutcome,
  onScheduleFollowUp
}: {
  selectedLead?: AdvisorSession | null;
  overview: {
    leadsNeedingCallUpdate: number;
    callbacksDueNow: number;
    quotationsNeedingFollowUp: number;
    leadsWaitingOnAssets: number;
  };
  onOpenLead?: (leadId: string) => void;
  onLogCallOutcome?: (callOutcome: LeadCallOutcome, callSummary: string) => Promise<void>;
  onScheduleFollowUp?: () => void;
}) {
  // Phase 4 Option A: conversations are now keyed by lead id (or "__queue__"
  // when no lead is selected). Switching leads no longer resets the chat —
  // the prior conversation is restored when you come back to that lead.
  // In-memory only for now; cross-session persistence would require Firestore.
  const [conversations, setConversations] = useState<Record<string, AssistantMessage[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  // Phase 4 usability overhaul: power-user expand mode for long conversations.
  const [isExpanded, setIsExpanded] = useState(false);
  // Phase 4 Option A: tab state for chat vs call-log (only meaningful when a
  // lead is selected; "chat" is the only tab in Queue Copilot mode).
  const [activeTab, setActiveTab] = useState<"chat" | "call-log">("chat");
  // Two-step confirmation tracking for destructive proposal actions.
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  // Header expansion override — once the conversation is active the header
  // auto-collapses to compact. User can click the chevron to force-expand
  // and see the status grid + description again mid-conversation.
  const [forceFullHeader, setForceFullHeader] = useState(false);
  const [callOutcome, setCallOutcome] = useState<LeadCallOutcome>("no_answer");
  const [callSummary, setCallSummary] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const conversationKey = selectedLead?.id ?? "__queue__";
  // Stable reference so the scroll-to-bottom useEffect doesn't re-fire on every
  // unrelated render (the `?? []` fallback would create a fresh array each time).
  const messages = useMemo(
    () => conversations[conversationKey] ?? [],
    [conversations, conversationKey]
  );

  function updateMessages(updater: (prev: AssistantMessage[]) => AssistantMessage[]) {
    setConversations((prev) => ({
      ...prev,
      [conversationKey]: updater(prev[conversationKey] ?? [])
    }));
  }

  // Active conversation = any user message has been sent. Used to collapse the
  // header chrome (badges + description + 2x2 status grid) once the user is
  // actually chatting — those 320px belong to the conversation, not the
  // welcome scaffolding.
  const isConversationActive = messages.length > 1;
  // Final header decision combines auto-collapse with the user's explicit
  // override (so "show details" mid-chat works).
  const showFullHeader = !isConversationActive || forceFullHeader;

  const attentionCount = overview.leadsNeedingCallUpdate + overview.callbacksDueNow + overview.quotationsNeedingFollowUp + overview.leadsWaitingOnAssets;
  const quickPrompts = useMemo(() => selectedLead
    ? ["What happened last time with this customer?", "What should I do next?", "Which reminder is pending here?"]
    : ["Which leads need calls today?", "Which quoted leads have not been called?", "Which leads are stale?"], [selectedLead]);
  const statusCards = [
    { label: "Call updates", value: overview.leadsNeedingCallUpdate, tone: "bg-amber-100 text-amber-900 border-amber-200/80" },
    { label: "Callbacks", value: overview.callbacksDueNow, tone: "bg-sky-100 text-sky-900 border-sky-200/80" },
    { label: "Quoted follow-up", value: overview.quotationsNeedingFollowUp, tone: "bg-emerald-100 text-emerald-900 border-emerald-200/80" },
    { label: "Assets pending", value: overview.leadsWaitingOnAssets, tone: "bg-violet-100 text-violet-900 border-violet-200/80" }
  ];

  useEffect(() => {
    // Phase 4 Option A: only seed the greeting if this conversation thread
    // doesn't exist yet. Switching to a previously-chatted lead now restores
    // the prior thread instead of wiping it back to the welcome message.
    if (conversations[conversationKey]?.length) return;

    // Phase 4 usability overhaul: fold "Remembered context" into the opening
    // assistant message instead of rendering it as a separate callout — saves
    // ~120px of vertical real estate and reads more naturally (the AI is
    // telling you what it remembers, not the chrome).
    const memoryPrefix = selectedLead?.workflow?.assistantMemory
      ? `**Remembered context:** ${selectedLead.workflow.assistantMemory}\n\n`
      : "";

    const openingText = selectedLead?.workflow?.pendingAssistantPrompt
      ? selectedLead.workflow.pendingAssistantPrompt
      : selectedLead
        ? `${memoryPrefix}I know this lead's recent history, reminders, quotation state, and next suggested action. Ask me what should happen next or log the phone call outcome below.`
        : attentionCount > 0
          ? `I found ${overview.leadsNeedingCallUpdate} leads needing call updates, ${overview.callbacksDueNow} callbacks due now, ${overview.quotationsNeedingFollowUp} quoted leads waiting for follow-up, and ${overview.leadsWaitingOnAssets} brochure or detail follow-ups. Which existing lead should we update first?`
          : "I know the existing leads in your dashboard. Ask me about due calls, stale leads, callbacks, quoted leads, or the next step for any lead.";

    setConversations((prev) => ({
      ...prev,
      [conversationKey]: [{ role: "assistant", text: openingText }]
    }));
  }, [
    conversationKey,
    conversations,
    attentionCount,
    overview.callbacksDueNow,
    overview.leadsNeedingCallUpdate,
    overview.leadsWaitingOnAssets,
    overview.quotationsNeedingFollowUp,
    selectedLead,
    selectedLead?.id,
    selectedLead?.workflow?.pendingAssistantPrompt
  ]);

  // Reset tab to chat when switching leads so the user always lands on chat
  // first; their explicit click into "Call log" is per-lead.
  useEffect(() => {
    setActiveTab("chat");
  }, [selectedLead?.id]);

  // Keep the newest message (and the "Thinking..." indicator) in view — without this the
  // small chat window leaves new replies below the fold and appears stuck.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Close the copilot when clicking outside the panel or pressing Escape.
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  async function askAssistant(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;

    updateMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/internal-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, selectedLeadId: selectedLead?.id ?? null })
      });
      // Parse defensively: a serverless timeout returns an HTML page, not JSON.
      const rawText = await response.text();
      let payload: (InternalAssistantResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as InternalAssistantResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "unavailable");
      }

      updateMessages((current) => [...current, {
        role: "assistant",
        text: payload.reply ?? payload.error ?? "I couldn't answer that right now.",
        actions: payload.actions
      }]);
      // Note: do NOT auto-open a lead here. The reply must stay in the chat window.
      // open_lead proposals are rendered as explicit action buttons the user can click
      // (auto-navigating used to switch to the lead page and reset the conversation).
    } catch {
      updateMessages((current) => [...current, {
        role: "assistant",
        text: "I couldn't reach the assistant just now. Please try again in a moment."
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function applyProposal(proposal: AssistantProposal) {
    if (proposal.type === "open_lead") {
      onOpenLead?.(proposal.leadId);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/internal-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_proposal", proposal })
      });
      const payload = await response.json() as { reply?: string; error?: string; session?: AdvisorSession };
      updateMessages((current) => [...current, { role: "assistant", text: payload.reply ?? payload.error ?? "I couldn't save that action right now." }]);
      if (payload.session && onOpenLead) {
        onOpenLead(payload.session.id);
      }
      if (proposal.type === "schedule_follow_up" && onScheduleFollowUp) {
        onScheduleFollowUp();
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitOutcome() {
    if (!selectedLead || !onLogCallOutcome) return;

    setLoading(true);
    try {
      await onLogCallOutcome(callOutcome, callSummary);
      setCallSummary("");
      updateMessages((current) => [...current, { role: "assistant", text: `Saved call outcome as ${callOutcome.replaceAll("_", " ")} for ${selectedLead.lead.name}.` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-[80] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3">
      {isOpen ? (
        <Card className={cn(
          "flex flex-col overflow-hidden border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-2xl backdrop-blur transition-[width,max-height] duration-200",
          // Phase 4 — power-user expand toggle. Default panel is bigger than
          // before (40rem / 85vh, up from 32rem / 78vh) so default chats feel
          // roomier; expand mode bumps to 56rem / 92vh for long threads.
          isExpanded
            ? "max-h-[min(92vh,64rem)] w-[min(56rem,calc(100vw-3rem))]"
            : "max-h-[min(85vh,56rem)] w-[min(40rem,calc(100vw-1.5rem))]"
        )}>
          {!showFullHeader ? (
            // Compact header — title + window controls only. Saves ~250px once
            // the conversation is active. Status cards + description belong
            // to the welcome state, not the working state. Chevron-down button
            // restores the full header on demand for mid-conversation peeks.
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-[linear-gradient(135deg,#f8fbff,#eef4fb)] px-5 py-3">
              <div className="flex min-w-0 items-center gap-2 text-on-surface">
                <Sparkles className="h-4 w-4 shrink-0 text-sky-700" />
                <div className="truncate text-sm font-semibold">{selectedLead ? "Lead Copilot" : "Queue Copilot"}</div>
                {selectedLead ? (
                  <Badge variant="outline" className="ml-1 bg-white/70 shrink-0">Lead</Badge>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setForceFullHeader(true)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/80 bg-white/80 text-secondary transition hover:border-slate-200 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  aria-label="Show details"
                  title="Show details"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((current) => !current)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/80 bg-white/80 text-secondary transition hover:border-slate-200 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  aria-label={isExpanded ? "Shrink copilot" : "Expand copilot"}
                  title={isExpanded ? "Shrink" : "Expand"}
                >
                  {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/80 bg-white/80 text-secondary transition hover:border-slate-200 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  aria-label="Close lead chatbot"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            // Full header — welcome chrome OR user-forced details view mid-conversation.
            <CardHeader className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(26,75,140,0.18),transparent_42%),linear-gradient(135deg,#f8fbff,#eef4fb)] pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">
                      <BrainCircuit className="mr-1 h-3 w-3" /> Lead memory AI
                    </Badge>
                    {selectedLead ? <Badge variant="outline" className="bg-white/70">Lead context</Badge> : <Badge variant="outline" className="bg-white/70">Dashboard context</Badge>}
                    {attentionCount > 0 ? <Badge variant="warning">{attentionCount} active prompts</Badge> : null}
                  </div>
                  <CardTitle className="mt-3 flex items-center gap-2 text-2xl tracking-tight text-on-surface">
                    <Sparkles className="h-5 w-5 text-sky-700" />
                    {selectedLead ? "Lead Copilot" : "Queue Copilot"}
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-[24rem] text-sm leading-6 text-secondary">
                    {selectedLead
                      ? "A sharper workspace for remembered call history, missing follow-up prompts, and guided next actions."
                      : "A floating lead chatbot that watches the current pipeline, spots follow-up gaps, and helps update existing leads fast."}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* Collapse-to-compact chevron only shown when we're in a forced-
                      open state mid-conversation. In welcome state, you want the
                      whole header by default — no need to offer collapse there. */}
                  {isConversationActive ? (
                    <button
                      type="button"
                      onClick={() => setForceFullHeader(false)}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-secondary transition hover:border-slate-200 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      aria-label="Hide details"
                      title="Hide details"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsExpanded((current) => !current)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-secondary transition hover:border-slate-200 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    aria-label={isExpanded ? "Shrink copilot" : "Expand copilot"}
                    title={isExpanded ? "Shrink" : "Expand"}
                  >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-secondary transition hover:border-slate-200 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    aria-label="Close lead chatbot"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {statusCards.map((item) => (
                  <div key={item.label} className={cn("rounded-2xl border px-3 py-3", item.tone)}>
                    <div className="text-xs font-black uppercase tracking-[0.16em] opacity-75">{item.label}</div>
                    <div className="mt-1 text-2xl font-black leading-none">{item.value}</div>
                  </div>
                ))}
              </div>
            </CardHeader>
          )}
          {/*
            Layout fix: previously CardContent stacked 6 fixed-height regions in a flex column,
            with only the messages region having overflow-y-auto AND a min-h-[16rem] floor. When
            the call-log panel + status cards + callouts pushed total content past 78vh, the
            messages area got squeezed below 16rem; its min-h then forced overflow into the
            parent's overflow-hidden, clipping the scroll handles. Bottom sections became
            unreachable.

            New structure: header (fixed) + scrollable body (callouts, prompts, messages,
            call-log all flow together) + sticky input bar. Everything is always reachable
            via the body scroll, and the input never moves.
          */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Phase 4 Option A: tab strip only shows when a lead is selected.
                In Queue Copilot mode there's nothing to log against, so chat is
                the only meaningful surface.

                Tab affordance: underlined-tab pattern (universal "I am a tab"
                signal). Active tab carries text-primary + bottom-border-2 in
                primary; inactive is text-secondary with hover lift. Icons on
                both tabs reinforce recognition. */}
            {selectedLead ? (
              <div role="tablist" aria-label="Copilot sections" className="flex items-center gap-1 border-b border-slate-200/80 bg-white/60 px-2 backdrop-blur">
                {([
                  { id: "chat" as const, label: "Chat", icon: MessageSquare },
                  { id: "call-log" as const, label: "Call log", icon: PhoneCall }
                ]).map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative inline-flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60",
                        // Underline via after-pseudo so it tucks into the bottom border
                        "after:absolute after:inset-x-3 after:bottom-[-1px] after:h-[2px] after:rounded-full after:transition-colors",
                        active
                          ? "text-primary after:bg-primary"
                          : "text-secondary hover:text-on-surface after:bg-transparent hover:after:bg-slate-300"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {(activeTab === "chat" || !selectedLead) ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                  {/* Phase 4 — "Remembered context" callout removed (folded into the
                      opening assistant message via memoryPrefix in the useEffect). */}
                  {!isConversationActive && !selectedLead && attentionCount > 0 ? (
                    <div className="rounded-3xl border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,248,228,0.98),rgba(255,252,243,0.96))] px-4 py-4 text-sm leading-6 text-amber-950">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                        <MessageSquareWarning className="h-3.5 w-3.5" /> Existing leads need updates
                      </div>
                      <div className="mt-2">
                        Ask me which leads need calls today, which quoted leads still need a human update, or which callback commitments are due right now.
                      </div>
                    </div>
                  ) : null}

                  {/* Phase 4 — quick prompts visible only during the welcome state
                      (no user messages sent yet). After the first turn they become
                      noise and just steal vertical space from the conversation. */}
                  {!isConversationActive ? (
                    <div className="flex flex-wrap gap-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void askAssistant(prompt)}
                          className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-secondary transition hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(244,247,251,0.95),rgba(250,251,253,0.98))] p-4">
                    <div className="flex flex-col gap-3">
                      {messages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={message.role === "assistant"
                            ? "rounded-3xl rounded-tl-md border border-white bg-white px-4 py-3 text-sm leading-6 text-on-surface shadow-md"
                            : "ml-8 rounded-3xl rounded-br-md bg-[linear-gradient(135deg,#0f3d78,#1b5aa5)] px-4 py-3 text-sm leading-6 text-white shadow-[0_14px_32px_-18px_rgba(15,61,120,0.65)]"}
                        >
                          {message.role === "assistant"
                            ? <ChatMarkdown content={message.text} tone="light" />
                            : message.text}
                          {message.role === "assistant" && message.actions?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.actions.map((action, actionIndex) => {
                                // Phase 4 Option A: two-step confirmation for destructive
                                // proposals. First click arms the action with a 3.5s
                                // window; second click within that window applies it.
                                const actionKey = `${index}-${actionIndex}-${action.type}-${action.leadId}`;
                                const isPending = pendingConfirm === actionKey;
                                return (
                                  <button
                                    key={actionKey}
                                    type="button"
                                    onClick={() => {
                                      if (action.requiresConfirmation && !isPending) {
                                        setPendingConfirm(actionKey);
                                        setTimeout(() => {
                                          setPendingConfirm((curr) => curr === actionKey ? null : curr);
                                        }, 3500);
                                        return;
                                      }
                                      setPendingConfirm(null);
                                      void applyProposal(action);
                                    }}
                                    className={cn(
                                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                      action.requiresConfirmation
                                        ? isPending
                                          ? "border-red-300 bg-red-100 text-red-900 ring-2 ring-red-200 hover:bg-red-200"
                                          : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                        : "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                                    )}
                                  >
                                    {action.requiresConfirmation
                                      ? (isPending ? "Click again to confirm" : action.label)
                                      : action.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {loading ? (
                        <div className="flex items-center gap-2 rounded-3xl border border-white bg-white px-4 py-3 text-sm text-secondary shadow-md">
                          <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                        </div>
                      ) : null}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void askAssistant(input);
                  }}
                  className="border-t border-slate-200/80 bg-white px-6 py-3"
                >
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-2 shadow-md">
                    <div className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder={selectedLead ? "Ask about this lead..." : "Ask about existing leads..."}
                        className="border-none bg-slate-50 shadow-none"
                      />
                      <Button type="submit" disabled={loading} className="rounded-2xl px-4">
                        <SendHorizontal className="mr-1.5 h-4 w-4" /> Ask
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              /* Call log tab — same form, just moved out of the scroll body so
                 chat has the full panel height when active. */
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="rounded-3xl border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white"><PhoneCall className="mr-1 h-3 w-3" /> Log phone call outcome</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(10.5rem,12rem)_minmax(0,1fr)]">
                    <select
                      className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-on-surface outline-none"
                      value={callOutcome}
                      onChange={(event) => setCallOutcome(event.target.value as LeadCallOutcome)}
                    >
                      {outcomeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <Textarea
                      rows={5}
                      value={callSummary}
                      onChange={(event) => setCallSummary(event.target.value)}
                      placeholder="What happened on the call, what was promised, and what should happen next?"
                      className="rounded-2xl border-slate-200 bg-slate-50"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button onClick={() => void submitOutcome()} disabled={loading} className="rounded-2xl">Save call outcome</Button>
                    {onScheduleFollowUp ? <Button variant="outline" onClick={() => onScheduleFollowUp()} className="rounded-2xl">Open follow-up scheduler</Button> : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group relative flex items-center gap-3 rounded-full border border-sky-200/70 bg-[linear-gradient(135deg,#0f3d78,#1a58a2)] px-4 py-3 text-white shadow-[0_18px_46px_-18px_rgba(23,59,121,0.72)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_56px_-18px_rgba(23,59,121,0.78)]"
        aria-label="Open lead chatbot"
      >
        <span className="absolute inset-0 rounded-full bg-white/0 transition group-hover:bg-white/[0.04]" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/14 ring-1 ring-white/20">
          <Bot className="h-5 w-5" />
        </span>
        <span className="relative hidden pr-2 text-left sm:block">
          <span className="block text-xs font-black uppercase tracking-[0.18em] text-sky-100/80">Lead AI</span>
          <span className="block text-sm font-semibold leading-none">{attentionCount > 0 ? "Updates waiting" : "Open copilot"}</span>
        </span>
        {attentionCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-black text-white">
            {attentionCount > 99 ? "99+" : attentionCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
