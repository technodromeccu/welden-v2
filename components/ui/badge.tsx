import * as React from "react";
import { cn } from "@/lib/utils";

// Seven canonical status tones — neutral surfaces first, then sentiment.
// `info` (sky) was previously achieved via inline className overrides; lifting
// it into a variant kills the off-system uses (see InternalLeadAssistant).
const variants = {
  default: "bg-surface-container-highest text-on-surface-variant",
  secondary: "bg-secondary-container text-on-secondary-container",
  outline: "bg-surface-container-lowest text-on-surface-variant ring-1 ring-outline-variant/20",
  info: "bg-sky-100 text-sky-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800"
} as const;

// text-xs (12px) — Welden admin floor. Previously text-[11px] violated the
// "no sub-12px" rule established in Phase 1.2.
export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]", variants[variant], className)} {...props} />;
}
