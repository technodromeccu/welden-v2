/**
 * Shared lead-scoring and lead-health utilities.
 *
 * These functions are used by both the server-side dashboard builder
 * (lib/dashboard.ts) and the client-side admin helpers
 * (components/admin/shared/admin-panel-helpers.ts).
 *
 * Consolidating them here avoids code duplication and ensures consistent
 * scoring/attention logic across the codebase.
 */
import type { AdvisorSession } from "./types";

export function isSameLocalDay(value: string, compare = new Date()) {
  const date = new Date(value);
  return date.getFullYear() === compare.getFullYear() && date.getMonth() === compare.getMonth() && date.getDate() === compare.getDate();
}

export function getLeadFirstCallState(session: Pick<AdvisorSession, "workflow">) {
  const workflow = session.workflow;
  if (workflow?.firstCallCompletedAt || workflow?.lastContactedAt) {
    return { label: "First call complete" as const, tone: "success" as const };
  }

  const dueAt = workflow?.firstCallDueAt ?? workflow?.nextFollowUpAt;
  if (!dueAt) {
    return { label: "Call deadline not set" as const, tone: "outline" as const };
  }

  const dueDate = new Date(dueAt);
  if (dueDate.getTime() <= Date.now()) {
    return isSameLocalDay(dueAt)
      ? { label: "Call due today" as const, tone: "warning" as const }
      : { label: "Call overdue" as const, tone: "danger" as const };
  }

  return { label: "Call pending" as const, tone: "secondary" as const };
}

export function isLeadStale(session: Pick<AdvisorSession, "workflow" | "createdAt">, staleLeadDays = 5) {
  if (["won", "lost"].includes(session.workflow?.stage ?? "new")) return false;
  const lastTouchedAt = session.workflow?.lastContactedAt ?? session.workflow?.lastUpdatedAt ?? session.workflow?.quotedAt ?? session.createdAt;
  return Date.now() - new Date(lastTouchedAt).getTime() >= staleLeadDays * 24 * 60 * 60 * 1000;
}

export function getLeadAttentionState(session: Pick<AdvisorSession, "workflow" | "createdAt">, staleLeadDays = 5) {
  const firstCallState = getLeadFirstCallState(session);
  if (firstCallState.label === "Call overdue") {
    return firstCallState;
  }
  if (isLeadStale(session, staleLeadDays)) {
    return { label: "Stale lead" as const, tone: "warning" as const };
  }
  return firstCallState;
}

export function getLeadScore(session: Pick<AdvisorSession, "lead" | "recommendation" | "diagnostics" | "escalated" | "createdAt" | "workflow" | "quality">) {
  let score = 20;
  if (session.quality?.riskLevel === "suspicious") score -= 15;
  if (session.lead.company?.trim()) score += 15;
  if (session.recommendation.recommendedProductId) score += 15;
  if (session.diagnostics?.found) score += 10;
  if (session.escalated) score += 20;

  if (["quote", "human", "custom_requirement"].includes(session.diagnostics?.intent ?? "")) score += 20;
  if (Date.now() - new Date(session.createdAt).getTime() < 1000 * 60 * 60 * 48) score += 10;
  if (session.workflow?.stage === "proposal_sent") score += 10;
  if (session.workflow?.nextFollowUpAt && new Date(session.workflow.nextFollowUpAt).getTime() <= Date.now()) score += 5;
  return Math.min(score, 100);
}
