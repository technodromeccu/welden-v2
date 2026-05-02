import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-surface-container-highest text-on-surface-variant",
  secondary: "bg-secondary-container text-on-secondary-container",
  outline: "bg-surface-container-lowest text-on-surface-variant ring-1 ring-outline-variant/20",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800"
} as const;

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", variants[variant], className)} {...props} />;
}
