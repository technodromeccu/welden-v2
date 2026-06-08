"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

// Phase 3 polish: replaces the inline `notice` banner that lived in AdminPanel.
// Same single-toast-at-a-time semantics for now; ToastProvider/useToast can layer
// on later without changing consumers.
//
// Variants follow the same four tones as <Badge>: success, info, warning, danger.
// Default is success (the previous behaviour — emerald "Saved" pill).

type ToastTone = "success" | "info" | "warning" | "danger";

const toneClasses: Record<ToastTone, { ring: string; iconBg: string; iconText: string; eyebrow: string }> = {
  success: {
    ring: "ring-emerald-100 border-emerald-200/70",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    eyebrow: "text-emerald-700"
  },
  info: {
    ring: "ring-sky-100 border-sky-200/70",
    iconBg: "bg-sky-100",
    iconText: "text-sky-700",
    eyebrow: "text-sky-700"
  },
  warning: {
    ring: "ring-amber-100 border-amber-200/70",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    eyebrow: "text-amber-700"
  },
  danger: {
    ring: "ring-rose-100 border-rose-200/70",
    iconBg: "bg-rose-100",
    iconText: "text-rose-700",
    eyebrow: "text-rose-700"
  }
};

const toneIcon: Record<ToastTone, ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle
};

const toneEyebrow: Record<ToastTone, string> = {
  success: "Saved",
  info: "Heads up",
  warning: "Attention",
  danger: "Failed"
};

export function Toast({
  message,
  tone = "success",
  eyebrow,
  onDismiss
}: {
  message: string | null;
  tone?: ToastTone;
  eyebrow?: string;
  onDismiss?: () => void;
}) {
  const t = toneClasses[tone];
  const Icon = toneIcon[tone];
  const label = eyebrow ?? toneEyebrow[tone];
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed right-6 top-24 z-[70] max-w-md">
      <AnimatePresence>
        {message ? (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-xl ring-1 backdrop-blur",
              t.ring
            )}
            role="status"
            aria-live="polite"
          >
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.iconBg, t.iconText)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-xs font-bold uppercase tracking-[0.18em]", t.eyebrow)}>{label}</div>
              <div className="mt-1 text-sm font-medium leading-6 text-slate-800">{message}</div>
            </div>
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss notification"
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
