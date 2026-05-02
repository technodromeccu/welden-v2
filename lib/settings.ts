import type { Settings } from "@/lib/types";

const DEFAULT_BUSINESS_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_BUSINESS_HOURS = { start: 9, end: 18 };
const DEFAULT_SLA_WORKING_DAYS = 2;
const DEFAULT_REMINDER_LEAD_HOURS = 4;
const DEFAULT_ESCALATION_LEAD_HOURS = 24;
// CODE-04: staleLeadDays now persisted in settings — this is the fallback only
export const DEFAULT_STALE_LEAD_DAYS = 5;

function uniqueEmails(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

function trimOptional(value?: string | null) {
  return value?.trim() || "";
}

export function normalizeSettings(settings: Settings): Settings {
  return {
    advisorDefaultAssigneeId: settings.advisorDefaultAssigneeId,
    businessDays: [...(settings.businessDays?.length ? settings.businessDays : DEFAULT_BUSINESS_DAYS)].sort((a, b) => a - b),
    businessHours: {
      start: settings.businessHours?.start ?? DEFAULT_BUSINESS_HOURS.start,
      end: settings.businessHours?.end ?? DEFAULT_BUSINESS_HOURS.end
    },
    internalNotificationEmails: uniqueEmails(settings.internalNotificationEmails ?? []),
    firstResponseSlaWorkingDays: settings.firstResponseSlaWorkingDays ?? DEFAULT_SLA_WORKING_DAYS,
    slaReminderLeadHours: settings.slaReminderLeadHours ?? DEFAULT_REMINDER_LEAD_HOURS,
    slaEscalationLeadHours: settings.slaEscalationLeadHours ?? DEFAULT_ESCALATION_LEAD_HOURS,
    slaEscalationEmails: uniqueEmails(settings.slaEscalationEmails ?? settings.internalNotificationEmails ?? []),
    staleLeadDays: settings.staleLeadDays ?? DEFAULT_STALE_LEAD_DAYS,
    quotationLogoUrl: trimOptional(settings.quotationLogoUrl),
    quotationBrandName: trimOptional(settings.quotationBrandName),
    lastQuotationNumber: settings.lastQuotationNumber
  };
}

export function validateSettings(input: Settings): Settings {
  const normalized = normalizeSettings(input);

  if (!normalized.advisorDefaultAssigneeId.trim()) {
    throw new Error("Default assignee is required.");
  }

  if (!normalized.businessDays.length || normalized.businessDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("Business days must be numbers between 0 and 6.");
  }

  if (!Number.isInteger(normalized.businessHours.start) || !Number.isInteger(normalized.businessHours.end) || normalized.businessHours.start < 0 || normalized.businessHours.start > 23 || normalized.businessHours.end < 1 || normalized.businessHours.end > 24 || normalized.businessHours.start >= normalized.businessHours.end) {
    throw new Error("Business hours must be whole hours with start earlier than end.");
  }

  if ((normalized.firstResponseSlaWorkingDays ?? 0) < 1) {
    throw new Error("First-response SLA must be at least 1 working day.");
  }

  if ((normalized.slaReminderLeadHours ?? 0) < 1) {
    throw new Error("Reminder lead time must be at least 1 hour.");
  }

  if ((normalized.slaEscalationLeadHours ?? 0) < 1) {
    throw new Error("Escalation lead time must be at least 1 hour.");
  }

  if ((normalized.staleLeadDays ?? 1) < 1) {
    throw new Error("Stale lead threshold must be at least 1 day.");
  }

  return normalized;
}
