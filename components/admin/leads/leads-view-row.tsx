"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Phone,
  UserCheck
} from "lucide-react";

// Row-level UI bits for the leads table — extracted verbatim from LeadsView.tsx.
// Behavior-preserving "Move" refactor — no logic changes.

// Self-contained row action dropdown — manages its own open/close with click-outside.
export function RowActionMenu({
  sessionId,
  loading,
  onNoAnswer,
  onMarkContacted,
  onFollowUpTomorrow
}: {
  sessionId: string;
  loading: boolean;
  onNoAnswer: () => void;
  onMarkContacted: () => void;
  onFollowUpTomorrow: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Quick actions"
        onClick={(e) => { e.stopPropagation(); setOpen((current) => !current); }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container-high hover:text-primary"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-outline-variant/15 bg-white shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            onClick={() => { onNoAnswer(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Log no answer
            <span className="ml-auto text-xs text-secondary">+1 day</span>
          </button>
          <button
            type="button"
            onClick={() => { onMarkContacted(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Mark called now
          </button>
          <button
            type="button"
            onClick={() => { onFollowUpTomorrow(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Follow up tomorrow
            <span className="ml-auto text-xs text-secondary">10:30</span>
          </button>
        </div>
      )}
    </div>
  );
}

// WF-07: Icon and label per activity type for the timeline.
export function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "quote_issued": return <FileText className="h-3.5 w-3.5 text-primary" />;
    case "call_logged": return <Phone className="h-3.5 w-3.5 text-emerald-600" />;
    case "note_added": return <MessageSquare className="h-3.5 w-3.5 text-secondary" />;
    case "status_changed": return <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />;
    case "owner_changed": return <UserCheck className="h-3.5 w-3.5 text-secondary" />;
    case "follow_up_scheduled": return <Clock className="h-3.5 w-3.5 text-secondary" />;
    case "escalation_sent": return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    case "duplicate_merged": return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    case "close_reason_set": return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    case "email_delivery_failed": return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    case "assistant_prompted": return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
    case "call_outcome_logged": return <Phone className="h-3.5 w-3.5 text-primary" />;
    case "brochure_requested": return <FileText className="h-3.5 w-3.5 text-amber-600" />;
    case "details_requested": return <MessageSquare className="h-3.5 w-3.5 text-amber-600" />;
    default: return <Clock className="h-3.5 w-3.5 text-secondary" />;
  }
}
