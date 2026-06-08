import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Phase 3 polish — replaces bare "No items yet" text with a centered visual
// pattern: dashed-ring icon + heading + optional subtitle/action. Tone is quiet
// neutral; if a state needs to signal warning/error (e.g. backup unconfigured),
// use a toast or a tinted callout instead.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/25 bg-surface-container-low/30 px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-outline-variant/40 bg-white text-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-on-surface">{title}</div>
        {description ? <div className="max-w-md text-sm leading-6 text-secondary">{description}</div> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
