import type { AdvisorSession, LeadStage, User } from "@/lib/types";

// Pure helpers + types + theme map extracted verbatim from LeadsView.tsx
// Behavior-preserving "Move" refactor — no logic changes.

export type LeadMeta = {
  session: AdvisorSession;
  score: number;
  nextStep: string;
  temperature: string;
  owner: User | null;
};

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const boardStageThemes: Record<LeadStage, {
  lane: string;
  laneActive: string;
  dot: string;
  accentText: string;
  cardGlow: string;
}> = {
  new: {
    lane: "border-sky-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))]",
    laneActive: "border-sky-400/80 shadow-[0_22px_60px_-34px_rgba(14,116,144,0.5)] ring-2 ring-sky-300/40",
    dot: "bg-sky-500",
    accentText: "text-sky-700",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(14,116,144,0.35)]"
  },
  quoted: {
    lane: "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))]",
    laneActive: "border-amber-400/80 shadow-[0_22px_60px_-34px_rgba(217,119,6,0.45)] ring-2 ring-amber-300/40",
    dot: "bg-amber-500",
    accentText: "text-amber-700",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(217,119,6,0.3)]"
  },
  contact_scheduled: {
    lane: "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(236,254,255,0.96),rgba(255,255,255,0.98))]",
    laneActive: "border-cyan-400/80 shadow-[0_22px_60px_-34px_rgba(8,145,178,0.45)] ring-2 ring-cyan-300/40",
    dot: "bg-cyan-500",
    accentText: "text-cyan-700",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(8,145,178,0.28)]"
  },
  contacted: {
    lane: "border-indigo-200/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.96),rgba(255,255,255,0.98))]",
    laneActive: "border-indigo-400/80 shadow-[0_22px_60px_-34px_rgba(79,70,229,0.4)] ring-2 ring-indigo-300/40",
    dot: "bg-indigo-500",
    accentText: "text-indigo-700",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(79,70,229,0.28)]"
  },
  qualified: {
    lane: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))]",
    laneActive: "border-emerald-400/80 shadow-[0_22px_60px_-34px_rgba(5,150,105,0.4)] ring-2 ring-emerald-300/40",
    dot: "bg-emerald-500",
    accentText: "text-emerald-700",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(5,150,105,0.26)]"
  },
  proposal_sent: {
    lane: "border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))]",
    laneActive: "border-orange-400/80 shadow-[0_22px_60px_-34px_rgba(234,88,12,0.42)] ring-2 ring-orange-300/40",
    dot: "bg-orange-500",
    accentText: "text-orange-700",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(234,88,12,0.28)]"
  },
  won: {
    lane: "border-emerald-300/80 bg-[linear-gradient(180deg,rgba(220,252,231,0.98),rgba(255,255,255,0.98))]",
    laneActive: "border-emerald-500/80 shadow-[0_22px_60px_-34px_rgba(22,163,74,0.45)] ring-2 ring-emerald-300/40",
    dot: "bg-emerald-600",
    accentText: "text-emerald-800",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(22,163,74,0.28)]"
  },
  lost: {
    lane: "border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))]",
    laneActive: "border-slate-400/80 shadow-[0_22px_60px_-34px_rgba(71,85,105,0.35)] ring-2 ring-slate-300/40",
    dot: "bg-slate-500",
    accentText: "text-slate-700",
    cardGlow: "shadow-[0_18px_44px_-30px_rgba(71,85,105,0.22)]"
  }
};
