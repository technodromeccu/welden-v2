"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, BrainCircuit, Loader2, MessageSquareWarning, PhoneCall, Radar, SendHorizontal, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [callOutcome, setCallOutcome] = useState<LeadCallOutcome>("no_answer");
  const [callSummary, setCallSummary] = useState("");

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
    const openingText = selectedLead?.workflow?.pendingAssistantPrompt
      ? selectedLead.workflow.pendingAssistantPrompt
      : selectedLead
        ? "I know this lead's recent history, reminders, quotation state, and next suggested action. Ask me what should happen next or log the phone call outcome below."
        : attentionCount > 0
          ? `I found ${overview.leadsNeedingCallUpdate} leads needing call updates, ${overview.callbacksDueNow} callbacks due now, ${overview.quotationsNeedingFollowUp} quoted leads waiting for follow-up, and ${overview.leadsWaitingOnAssets} brochure or detail follow-ups. Which existing lead should we update first?`
          : "I know the existing leads in your dashboard. Ask me about due calls, stale leads, callbacks, quoted leads, or the next step for any lead.";

    setMessages([{ role: "assistant", text: openingText }]);
  }, [
    attentionCount,
    overview.callbacksDueNow,
    overview.leadsNeedingCallUpdate,
    overview.leadsWaitingOnAssets,
    overview.quotationsNeedingFollowUp,
    selectedLead,
    selectedLead?.id,
    selectedLead?.workflow?.pendingAssistantPrompt
  ]);

  async function askAssistant(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/internal-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, selectedLeadId: selectedLead?.id ?? null })
      });
      const payload = await response.json() as InternalAssistantResponse & { error?: string };

      setMessages((current) => [...current, {
        role: "assistant",
        text: payload.reply ?? payload.error ?? "I couldn't answer that right now.",
        actions: payload.actions
      }]);
      // Note: do NOT auto-open a lead here. The reply must stay in the chat window.
      // open_lead proposals are rendered as explicit action buttons the user can click
      // (auto-navigating used to switch to the lead page and reset the conversation).
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
      setMessages((current) => [...current, { role: "assistant", text: payload.reply ?? payload.error ?? "I couldn't save that action right now." }]);
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
      setMessages((current) => [...current, { role: "assistant", text: `Saved call outcome as ${callOutcome.replaceAll("_", " ")} for ${selectedLead.lead.name}.` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3">
      {isOpen ? (
        <Card className="flex max-h-[min(78vh,52rem)] w-[min(32rem,calc(100vw-1.5rem))] flex-col overflow-hidden border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_26px_90px_-30px_rgba(15,23,42,0.48)] backdrop-blur">
          <CardHeader className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(26,75,140,0.18),transparent_42%),linear-gradient(135deg,#f8fbff,#eef4fb)] pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="border border-sky-200/70 bg-white/80 text-sky-900">
                    <BrainCircuit className="mr-1 h-3 w-3" /> Lead memory AI
                  </Badge>
                  {selectedLead ? <Badge variant="outline" className="bg-white/70">Lead context</Badge> : <Badge variant="outline" className="bg-white/70">Dashboard context</Badge>}
                  {attentionCount > 0 ? <Badge variant="warning">{attentionCount} active prompts</Badge> : null}
                </div>
                <CardTitle className="mt-3 flex items-center gap-2 text-[1.45rem] tracking-tight text-slate-950">
                  <Sparkles className="h-5 w-5 text-sky-700" />
                  {selectedLead ? "Lead Copilot" : "Queue Copilot"}
                </CardTitle>
                <CardDescription className="mt-2 max-w-[24rem] text-sm leading-6 text-slate-600">
                  {selectedLead
                    ? "A sharper workspace for remembered call history, missing follow-up prompts, and guided next actions."
                    : "A floating lead chatbot that watches the current pipeline, spots follow-up gaps, and helps update existing leads fast."}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-slate-500 transition hover:border-slate-200 hover:text-slate-900"
                aria-label="Close lead chatbot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusCards.map((item) => (
                <div key={item.label} className={cn("rounded-2xl border px-3 py-3", item.tone)}>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] opacity-75">{item.label}</div>
                  <div className="mt-1 text-2xl font-black leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
            {selectedLead?.workflow?.assistantMemory ? (
              <div className="rounded-[1.35rem] border border-sky-200/80 bg-[linear-gradient(135deg,rgba(237,246,255,0.95),rgba(248,251,255,0.95))] px-4 py-4 text-sm leading-6 text-slate-800">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-sky-800">
                  <Radar className="h-3.5 w-3.5" /> Remembered context
                </div>
                <div className="mt-2">{selectedLead.workflow.assistantMemory}</div>
              </div>
            ) : null}

            {!selectedLead && attentionCount > 0 ? (
              <div className="rounded-[1.35rem] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,248,228,0.98),rgba(255,252,243,0.96))] px-4 py-4 text-sm leading-6 text-amber-950">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                  <MessageSquareWarning className="h-3.5 w-3.5" /> Existing leads need updates
                </div>
                <div className="mt-2">
                  Ask me which leads need calls today, which quoted leads still need a human update, or which callback commitments are due right now.
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void askAssistant(prompt)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(244,247,251,0.95),rgba(250,251,253,0.98))]">
              <div className="flex h-full min-h-[16rem] flex-col gap-3 overflow-y-auto px-4 py-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={message.role === "assistant"
                      ? "rounded-[1.35rem] rounded-tl-md border border-white bg-white px-4 py-3 text-sm leading-6 text-slate-800 shadow-[0_12px_25px_-18px_rgba(15,23,42,0.35)]"
                      : "ml-8 rounded-[1.35rem] rounded-br-md bg-[linear-gradient(135deg,#0f3d78,#1b5aa5)] px-4 py-3 text-sm leading-6 text-white shadow-[0_14px_32px_-18px_rgba(15,61,120,0.65)]"}
                  >
                    {message.role === "assistant"
                      ? <ChatMarkdown content={message.text} tone="light" />
                      : message.text}
                    {message.role === "assistant" && message.actions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action, actionIndex) => (
                          <button
                            key={`${action.type}-${action.leadId}-${actionIndex}`}
                            type="button"
                            onClick={() => void applyProposal(action)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                              action.requiresConfirmation
                                ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                : "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                            )}
                          >
                            {action.requiresConfirmation ? `Confirm: ${action.label}` : action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {loading ? (
                  <div className="flex items-center gap-2 rounded-[1.35rem] border border-white bg-white px-4 py-3 text-sm text-slate-500 shadow-[0_12px_25px_-18px_rgba(15,23,42,0.35)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                  </div>
                ) : null}
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void askAssistant(input);
              }}
              className="rounded-[1.5rem] border border-slate-200/80 bg-white p-2 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]"
            >
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
            </form>

            {selectedLead ? (
              <div className="rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white"><PhoneCall className="mr-1 h-3 w-3" /> Log phone call outcome</Badge>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(10.5rem,12rem)_minmax(0,1fr)]">
                  <select
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
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
            ) : null}
          </CardContent>
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
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/80">Lead AI</span>
          <span className="block text-sm font-semibold leading-none">{attentionCount > 0 ? "Updates waiting" : "Open copilot"}</span>
        </span>
        {attentionCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-black text-white">
            {attentionCount > 99 ? "99+" : attentionCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
