"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, SendHorizontal, X } from "lucide-react";
import { assessLeadQuality, isPlaceholderName, isValidEmail, isValidPhone } from "@/lib/request-validation";
import { spring, springBounce, staggerFast } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AdvisorCitation, AiResponseMetadata, Lead, LeadQuality, Product, Role } from "@/lib/types";

// Which step of the info-collection we're on before full chat unlocks
type ChatPhase = "collecting_name" | "collecting_email" | "collecting_phone" | "chatting";

type ChatAction = { label: string; href?: string; isPrompt?: boolean };
type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  tone?: "default" | "system" | "result";
  citations?: AdvisorCitation[];
  actions?: ChatAction[];
};
interface ChatResponse {
  intent: "quote" | "human" | "custom_requirement" | "answer";
  answer: string;
  found: boolean;
  highlights: string[];
  citations: AdvisorCitation[];
  recommendedCategory: string | null;
  quotationReference?: string | null;
  quality: LeadQuality;
  sessionId?: string | null;
  ai?: AiResponseMetadata;
}

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const ADVISOR_SESSION_STORAGE_KEY = "welden-advisor-session-v1";

function makeMessage(
  role: ChatMessage["role"],
  text: string,
  tone: ChatMessage["tone"] = "default",
  citations?: AdvisorCitation[],
  actions?: ChatAction[]
): ChatMessage {
  return { id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, role, text, tone, citations, actions };
}

function buildTranscript(messages: ChatMessage[]) {
  return messages.map((m) => `${m.role === "bot" ? "Advisor" : "Visitor"}: ${m.text}`).join("\n");
}

function splitLines(text: string) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function isWithinWhatsappHours() {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", hour12: false
    }).formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday) && hour >= 10 && hour < 18;
  } catch {
    return false;
  }
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-5 py-4">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-[var(--color-on-dark-dim)]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Opening message — bot greets and immediately asks for the user's name
function makeWelcomeMessages(productCount: number): ChatMessage[] {
  return [
    makeMessage("bot", `Hello! I'm the Welden AI Assistant.\n\nI can help you with machine specs, pricing, applications, and quotations across ${productCount || 0} machines.\n\nTo get started — what's your full name?`)
  ];
}

export function AdvisorWidget({ products, whatsappHref, whatsappLabel, quickActionQuestions }: {
  products: Product[];
  whatsappHref?: string | null;
  whatsappLabel?: string;
  quickActionQuestions?: string[];
}) {
  const reduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<ChatPhase>("collecting_name");
  const [lead, setLead] = useState<Lead>({ name: "", email: "", phone: "" });
  const [messages, setMessages] = useState<ChatMessage[]>(() => makeWelcomeMessages(products.length));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const restoredSessionRef = useRef(false);

  // Keep a ref to current lead so askBot always reads the latest values
  // (avoids stale closure when transitioning phase and submitting in the same tick)
  const leadRef = useRef(lead);
  useEffect(() => { leadRef.current = lead; }, [lead]);

  const whatsappAvailableNow = Boolean(whatsappHref && isWithinWhatsappHours());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen, loading]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        if (!res.ok) return;
        const payload = await res.json() as { user?: SessionUser | null };
        if (!cancelled) {
          setSessionUser(payload.user ?? null);
        }
      } catch {
        // Ignore session lookup failures; the widget should stay usable for public visitors.
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (restoredSessionRef.current || typeof window === "undefined") return;
    restoredSessionRef.current = true;
    const saved = window.sessionStorage.getItem(ADVISOR_SESSION_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        phase?: ChatPhase;
        lead?: Lead;
        messages?: ChatMessage[];
      };
      if (parsed.phase) setPhase(parsed.phase);
      if (parsed.lead) {
        setLead(parsed.lead);
        leadRef.current = parsed.lead;
      }
      if (parsed.messages?.length) {
        setMessages(parsed.messages);
      }
    } catch {
      window.sessionStorage.removeItem(ADVISOR_SESSION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!restoredSessionRef.current || typeof window === "undefined") return;
    window.sessionStorage.setItem(ADVISOR_SESSION_STORAGE_KEY, JSON.stringify({ phase, lead, messages }));
  }, [lead, messages, phase]);

  useEffect(() => {
    function openFromCta() { if (window.location.hash === "#advisor") setIsOpen(true); }
    function handleAnchorClick(e: MouseEvent) {
      const link = (e.target as HTMLElement | null)?.closest('a[href="#advisor"]');
      if (link) setIsOpen(true);
    }
    openFromCta();
    window.addEventListener("hashchange", openFromCta);
    document.addEventListener("click", handleAnchorClick);
    return () => {
      window.removeEventListener("hashchange", openFromCta);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  function append(newMessages: ChatMessage[]) {
    setMessages((c) => [...c, ...newMessages]);
  }

  function resetChat() {
    const fresh = makeWelcomeMessages(products.length);
    setPhase("collecting_name");
    setLead({ name: "", email: "", phone: "" });
    leadRef.current = { name: "", email: "", phone: "" };
    setMessages(fresh);
    setInput("");
    setLoading(false);
    setLastResponse(null);
    setIsOpen(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ADVISOR_SESSION_STORAGE_KEY);
    }
  }

  function getEscalationActions(data: ChatResponse): ChatAction[] | undefined {
    if (!whatsappAvailableNow || !(data.intent === "human" || data.intent === "quote" || data.intent === "custom_requirement" || !data.found)) return undefined;
    return [{ label: whatsappLabel ?? "WhatsApp Welden", href: whatsappHref! }];
  }

  const showDebugLabel = process.env.NODE_ENV !== "production" || Boolean(sessionUser);
  const debugLabel = lastResponse?.ai
    ? `${lastResponse.ai.provider === "gemini" ? "Gemini" : "Fallback"}${lastResponse.ai.groundedContextSummary ? " | grounded" : " | ungrounded"}`
    : null;

  async function askBot(question: string, transcriptMessages: ChatMessage[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/advisor/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Use ref so we always send the current lead even if state hasn't flushed yet
        body: JSON.stringify({ lead: leadRef.current, question, transcriptSummary: buildTranscript(transcriptMessages) })
      });
      const payload = await res.json() as ChatResponse & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "The advisor is unavailable right now.");

      const data = payload as ChatResponse;
      setLastResponse(data);

      const botMessages: ChatMessage[] = [makeMessage("bot", data.answer, data.found ? "result" : "system", data.citations)];
      if (data.highlights.length) botMessages.push(makeMessage("bot", `Highlights:\n- ${data.highlights.join("\n- ")}`, "result"));
      if (data.quality.riskLevel === "suspicious") botMessages.push(makeMessage("bot", `Lead quality check: ${data.quality.warnings.join(" ")}`, "system"));

      const escalationActions = getEscalationActions(data);
      if (escalationActions?.length) {
        botMessages.push(makeMessage("bot",
          "A Welden team member is available on WhatsApp right now. If you want a faster human handoff, use the button below during working hours: Mon–Fri, 10:00–18:00.",
          "system", undefined, escalationActions
        ));
      }
      append(botMessages);
    } catch (error) {
      append([makeMessage("bot", error instanceof Error ? error.message : "The advisor is unavailable right now.", "system")]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = input.trim();
    if (!value || loading) return;

    const userMessage = makeMessage("user", value);
    append([userMessage]);
    setInput("");

    // ── Info collection phases ──────────────────────────────────────
    if (phase === "collecting_name") {
      // Basic length check — at least two parts (first + last name)
      const nameParts = value.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) {
        append([makeMessage("bot", "Please share your full name (first and last) so our team knows who to follow up with.", "system")]);
        return;
      }
      if (isPlaceholderName(value)) {
        append([makeMessage("bot", "That looks like a test or placeholder name. Please use your real name so our team can reach you.", "system")]);
        return;
      }
      const firstName = nameParts[0];
      const updatedLead = { ...leadRef.current, name: value };
      setLead(updatedLead);
      leadRef.current = updatedLead;
      setPhase("collecting_email");
      append([makeMessage("bot", `Nice to meet you, ${firstName}! What's your email address? We'll use it to send any quotations or follow-ups.`)]);
      return;
    }

    if (phase === "collecting_email") {
      if (!isValidEmail(value)) {
        append([makeMessage("bot", "That doesn't look like a valid email address. Please try again — we need this to send you quotations.", "system")]);
        return;
      }
      const updatedLead = { ...leadRef.current, email: value };
      setLead(updatedLead);
      leadRef.current = updatedLead;
      setPhase("collecting_phone");
      append([makeMessage("bot", "Got it. Last one — what's your phone number? Include your country code if you can, e.g. +91 98765 43210.")]);
      return;
    }

    if (phase === "collecting_phone") {
      if (!isValidPhone(value)) {
        append([makeMessage("bot", "That doesn't look like a valid phone number. Please include your country code if possible (e.g. +91 98765 43210).", "system")]);
        return;
      }
      const updatedLead = { ...leadRef.current, phone: value };
      setLead(updatedLead);
      leadRef.current = updatedLead;
      setPhase("chatting");
      const firstName = updatedLead.name.split(/\s+/)[0];
      const quickActions = quickActionQuestions?.length
        ? quickActionQuestions.map((q) => ({ label: q, isPrompt: true }))
        : undefined;
      append([makeMessage("bot", `You're all set, ${firstName}. Go ahead — ask me anything about Welden machines, specs, pricing, or quotations.`, "system", undefined, quickActions)]);
      return;
    }

    // ── Chatting phase — normal bot query ──────────────────────────
    const nextMessages = [...messages, userMessage];
    await askBot(value, nextMessages);
  }

  // Placeholder text guides the user at each step
  const inputPlaceholder =
    phase === "collecting_name" ? "Your full name…" :
    phase === "collecting_email" ? "Your email address…" :
    phase === "collecting_phone" ? "Phone number (e.g. +91 98765 43210)…" :
    "Ask about machine specs, pricing…";

  return (
    <>
      <div id="advisor" aria-hidden="true" />

      <div className="fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">

        {/* ── Chat panel ─────────────────────────────────── */}
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              key="advisor-panel"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: 16 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
              transition={{ ...spring }}
              style={{ transformOrigin: "bottom right" }}
              className="w-full overflow-hidden rounded-[var(--radius-modal)] bg-[var(--color-forge)] shadow-[var(--shadow-modal)] ring-1 ring-white/8 sm:w-[420px]"
            >
              {/* Header */}
              <div className="border-b border-white/8 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-[var(--color-arc)] text-[var(--color-forge)]">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-display text-[1rem] font-black uppercase tracking-tight text-white">Welden AI Assistant</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-dark-dim)]">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]" />
                        Online & active
                        {showDebugLabel && debugLabel ? (
                          <span className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-[var(--color-arc)]">
                            Debug: {debugLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      type="button"
                      onClick={resetChat}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                      whileTap={{ scale: 0.96 }}
                      transition={spring}
                      className="rounded-[var(--radius-btn)] bg-white/6 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 transition"
                    >
                      Reset
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                      whileTap={{ scale: 0.96 }}
                      transition={spring}
                      className="rounded-[var(--radius-btn)] p-2 text-white/70 transition"
                      aria-label="Close assistant"
                    >
                      <X className="h-4.5 w-4.5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="max-h-[62vh] space-y-3 overflow-y-auto hide-scrollbar px-4 py-4">
                <motion.div
                  variants={reduced ? {} : staggerFast}
                  initial="initial"
                  animate="animate"
                  className="space-y-3"
                >
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const lines = splitLines(message.text);
                      const isUser = message.role === "user";
                      const isSystem = message.tone === "system";

                      return (
                        <motion.div
                          key={message.id}
                          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ ...spring }}
                          className={isUser ? "flex justify-end" : "flex items-start gap-2.5"}
                        >
                          {isUser ? (
                            <div className="max-w-[84%] rounded-[var(--radius-card)] rounded-br-[var(--radius-chip)] bg-[var(--color-arc)] px-4 py-3 text-sm font-medium leading-7 text-[var(--color-forge)] shadow-sm">
                              {message.text}
                            </div>
                          ) : (
                            <>
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-steel)] ring-1 ring-white/10">
                                <Bot className="h-3.5 w-3.5 text-[var(--color-on-dark-dim)]" />
                              </div>
                              <div className="min-w-0 max-w-[88%] overflow-hidden rounded-[var(--radius-card)] rounded-tl-[var(--radius-chip)] bg-[var(--color-steel)] ring-1 ring-white/8">
                                {isSystem ? (
                                  <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-on-dark-dim)]">
                                    {message.text}
                                  </div>
                                ) : lines.length > 1 ? (
                                  <div className="space-y-2.5 px-4 py-3.5">
                                    {lines.map((line, li) => (
                                      <div
                                        key={`${message.id}-line-${li}`}
                                        className={cn(
                                          "whitespace-pre-wrap break-words text-sm leading-7 text-[var(--color-on-dark)]",
                                          li === 0 && "font-bold text-white",
                                          line.startsWith("-") && "text-[var(--color-on-dark-dim)] font-medium"
                                        )}
                                      >
                                        {line.replace(/^-\s*/, "")}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-4 py-3.5 text-sm leading-7 text-[var(--color-on-dark)]">
                                    {message.text}
                                  </div>
                                )}

                                {/* Action buttons */}
                                {message.actions?.length ? (
                                  <div className="flex flex-wrap gap-2 border-t border-white/8 px-4 py-3">
                                    {message.actions.map((action) => {
                                      if (action.isPrompt) {
                                        return (
                                          <motion.button
                                            key={`${message.id}-${action.label}`}
                                            onClick={() => {
                                              const nextMessages = [...messages, makeMessage("user", action.label)];
                                              append([makeMessage("user", action.label)]);
                                              void askBot(action.label, nextMessages);
                                            }}
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.97 }}
                                            transition={spring}
                                            className="rounded-[var(--radius-btn)] bg-[var(--color-arc)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-forge)]"
                                          >
                                            {action.label}
                                          </motion.button>
                                        );
                                      }
                                      return (
                                        <motion.a
                                          key={`${message.id}-${action.href}`}
                                          href={action.href}
                                          target="_blank"
                                          rel="noreferrer"
                                          whileHover={{ y: -1 }}
                                          whileTap={{ scale: 0.97 }}
                                          transition={spring}
                                          className="rounded-[var(--radius-btn)] bg-[var(--color-arc)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-forge)]"
                                        >
                                          {action.label}
                                        </motion.a>
                                      );
                                    })}
                                  </div>
                                ) : null}

                                {/* Citations */}
                                {message.citations && message.citations.length > 0 ? (
                                  <div className="border-t border-white/8">
                                    {message.citations.map((c) => (
                                      <div key={`${c.sourceType}-${c.sourceId}`} className="border-b border-white/6 px-4 py-3 last:border-b-0">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-arc)]/80">{c.sourceTitle}</div>
                                        <div className="mt-1.5 text-xs leading-5 text-[var(--color-on-dark-dim)]">{c.snippet}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

                {/* Typing indicator */}
                <AnimatePresence>
                  {loading ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ ...spring }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-steel)] ring-1 ring-white/10">
                        <Bot className="h-3.5 w-3.5 text-[var(--color-on-dark-dim)]" />
                      </div>
                      <div className="rounded-[var(--radius-card)] rounded-tl-[var(--radius-chip)] bg-[var(--color-steel)] ring-1 ring-white/8">
                        <TypingDots />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <form onSubmit={handleSubmit} className="border-t border-white/8 bg-[var(--color-steel)] px-4 py-3.5">
                <div className="flex items-center gap-2.5 rounded-[var(--radius-card)] bg-white/8 px-3.5 py-1.5 ring-1 ring-white/10 transition focus-within:ring-[var(--color-arc)]/40">
                  <input
                    className="h-10 flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/36"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={inputPlaceholder}
                    disabled={loading}
                    autoFocus={isOpen}
                  />
                  <motion.button
                    type="submit"
                    disabled={!input.trim() || loading}
                    whileHover={input.trim() && !loading ? { scale: 1.06 } : {}}
                    whileTap={input.trim() && !loading ? { scale: 0.93 } : {}}
                    transition={springBounce}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-[var(--color-arc)] text-[var(--color-forge)] shadow-[var(--shadow-arc)] transition disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <SendHorizontal className="h-4 w-4" />
                    }
                  </motion.button>
                </div>
              </form>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── FAB trigger button ──────────────────────────── */}
        <AnimatePresence>
          {!isOpen ? (
            <motion.button
              key="fab"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              transition={{ ...springBounce }}
              onClick={() => setIsOpen(true)}
              whileHover={{ scale: reduced ? 1 : 1.08, boxShadow: "0 12px 36px rgba(245,158,11,0.5)" }}
              whileTap={{ scale: 0.94 }}
              aria-expanded={false}
              aria-controls="advisor"
              className="flex h-15 w-15 items-center justify-center rounded-full bg-[var(--color-arc)] text-[var(--color-forge)] shadow-[var(--shadow-arc)]"
            >
              <MessageCircle className="h-7 w-7 fill-current stroke-[1.8]" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
