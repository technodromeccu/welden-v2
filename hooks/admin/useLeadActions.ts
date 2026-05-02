"use client";

import { useCallback, useState } from "react";
import type { AdvisorSession, LeadCallOutcome, QuotationTemplate } from "@/lib/types";
import { buildOffsetDateTimeInput, buildPresetDateTimeInput, fromDateTimeInputValue, type LeadWorkflowDraft } from "@/components/admin/shared/admin-panel-helpers";

export function useLeadActions(options: {
  api: (url: string, options?: RequestInit) => Promise<Response>;
  refresh: (targetTab?: string, force?: boolean) => Promise<void>;
  markSaved: (key: string) => void;
  setNotice: (value: string | null) => void;
  setError: (value: string | null) => void;
  selectedLead: AdvisorSession | null;
  selectedLeadQuotationTemplate: QuotationTemplate | null;
  leadWorkflowDraft: LeadWorkflowDraft;
  leadNoteDraft: string;
  setLeadNoteDraft: (value: string) => void;
}) {
  const { api, refresh, markSaved, setNotice, setError, selectedLead, selectedLeadQuotationTemplate, leadWorkflowDraft, leadNoteDraft, setLeadNoteDraft } = options;
  const [leadQuoteSending, setLeadQuoteSending] = useState(false);
  // WF-12: surface delivery provider/status for inline feedback banners
  const [leadQuoteDelivery, setLeadQuoteDelivery] = useState<{ delivered: boolean; provider: string } | null>(null);

  const saveLeadWorkflow = useCallback(async (requestOptions?: { markContactedNow?: boolean }) => {
    if (!selectedLead) return;
    try {
      await api(`/api/advisor-sessions/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: leadWorkflowDraft.stage,
          ownerUserId: leadWorkflowDraft.ownerUserId || null,
          nextFollowUpAt: fromDateTimeInputValue(leadWorkflowDraft.nextFollowUpAt),
          lastContactedAt: requestOptions?.markContactedNow ? new Date().toISOString() : fromDateTimeInputValue(leadWorkflowDraft.lastContactedAt),
          note: leadNoteDraft.trim() || undefined,
          closeReason: leadWorkflowDraft.closeReason.trim() || null,
          closeReasonNote: leadWorkflowDraft.closeReasonNote.trim() || null
        })
      });
      setNotice(requestOptions?.markContactedNow ? "Lead contact logged." : "Lead workflow updated.");
      if (!requestOptions?.markContactedNow) markSaved("lead-workflow");
      setError(null);
      setLeadNoteDraft("");
      await refresh("leads", true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update lead.");
    }
  }, [api, leadNoteDraft, leadWorkflowDraft, markSaved, refresh, selectedLead, setError, setLeadNoteDraft, setNotice]);

  const applyLeadFollowUpAction = useCallback(async (action: "one_hour" | "tomorrow_morning" | "align_callback" | "mark_no_answer" | "mark_complete") => {
    if (!selectedLead) return;
    const payload: Record<string, string | null> = {};
    if (action === "one_hour") {
      payload.nextFollowUpAt = fromDateTimeInputValue(buildOffsetDateTimeInput(1));
      payload.followUpStatus = "scheduled";
    }
    if (action === "tomorrow_morning") {
      payload.nextFollowUpAt = fromDateTimeInputValue(buildPresetDateTimeInput(1, 10, 30));
      payload.followUpStatus = "scheduled";
    }
    if (action === "align_callback") {
      if (!leadWorkflowDraft.preferredCallbackAt) {
        setError("Set a preferred callback time before using the callback window shortcut.");
        return;
      }
      payload.nextFollowUpAt = fromDateTimeInputValue(leadWorkflowDraft.preferredCallbackAt);
      payload.preferredCallbackAt = fromDateTimeInputValue(leadWorkflowDraft.preferredCallbackAt);
      payload.preferredCallbackNote = leadWorkflowDraft.preferredCallbackNote.trim() || null;
      payload.followUpStatus = "scheduled";
    }
    if (action === "mark_no_answer") {
      payload.followUpStatus = "no_answer";
      payload.nextFollowUpAt = fromDateTimeInputValue(buildPresetDateTimeInput(1, 11, 0));
      payload.lastContactedAt = new Date().toISOString();
      payload.note = "Call attempted. No answer from the lead.";
    }
    if (action === "mark_complete") {
      payload.followUpStatus = "completed";
      payload.nextFollowUpAt = null;
      payload.lastContactedAt = new Date().toISOString();
      payload.note = "Follow-up loop marked complete.";
    }

    try {
      await api(`/api/advisor-sessions/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setNotice(action === "mark_no_answer" ? "Call attempt logged." : action === "mark_complete" ? "Follow-up marked complete." : "Lead follow-up updated.");
      markSaved("lead-workflow");
      setError(null);
      await refresh("leads", true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update lead follow-up.");
    }
  }, [api, leadWorkflowDraft.preferredCallbackAt, leadWorkflowDraft.preferredCallbackNote, markSaved, refresh, selectedLead, setError, setNotice]);

  const sendLeadQuotation = useCallback(async () => {
    if (!selectedLead || !selectedLeadQuotationTemplate) return;
    if (selectedLead.workflow?.quoteIssued) {
      const confirmed = window.confirm("This lead already has a quotation. Sending again will create a new quotation reference. Continue?");
      if (!confirmed) return;
    }

    try {
      setLeadQuoteSending(true);
      const response = await api(`/api/advisor-sessions/${selectedLead.id}/quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedLeadQuotationTemplate.id })
      });
      const payload = await response.json() as { quotation: { referenceNumber: string }; delivery: { delivered: boolean; provider: string } };
      setLeadQuoteDelivery({ delivered: payload.delivery.delivered, provider: payload.delivery.provider });
      setNotice(payload.delivery.delivered && payload.delivery.provider !== "log_only"
        ? `Quotation ${payload.quotation.referenceNumber} emailed to ${selectedLead.lead.email}.`
        : payload.delivery.provider === "log_only"
          ? `Quotation ${payload.quotation.referenceNumber} created (email logging only — customer was not notified).`
          : `Quotation ${payload.quotation.referenceNumber} created, but email delivery failed.`);
      setError(null);
      await refresh("leads", true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to send quotation.");
    } finally {
      setLeadQuoteSending(false);
    }
  }, [api, refresh, selectedLead, selectedLeadQuotationTemplate, setError, setNotice]);

  const logLeadCallOutcome = useCallback(async (callOutcome: LeadCallOutcome, callSummary: string) => {
    if (!selectedLead) return;

    try {
      await api(`/api/advisor-sessions/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastContactedAt: new Date().toISOString(),
          callOutcome,
          callSummary: callSummary.trim() || null
        })
      });
      setNotice(`Call outcome saved for ${selectedLead.lead.name}.`);
      setError(null);
      await refresh("leads", true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save call outcome.");
    }
  }, [api, refresh, selectedLead, setError, setNotice]);

  return {
    leadQuoteSending,
    leadQuoteDelivery,
    saveLeadWorkflow,
    applyLeadFollowUpAction,
    sendLeadQuotation,
    logLeadCallOutcome
  };
}
