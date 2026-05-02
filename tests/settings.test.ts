import test from "node:test";
import assert from "node:assert/strict";
import { validateSettings } from "../lib/settings.ts";

test("validateSettings normalizes emails and default timings", () => {
  const settings = validateSettings({
    advisorDefaultAssigneeId: "user_agent",
    businessDays: [5, 1, 3],
    businessHours: { start: 9, end: 18 },
    internalNotificationEmails: [" SALES@welden.example ", "sales@welden.example", "service@welden.example"],
    slaEscalationEmails: ["manager@welden.example", "MANAGER@welden.example"]
  });

  assert.deepEqual(settings.businessDays, [1, 3, 5]);
  assert.deepEqual(settings.internalNotificationEmails, ["sales@welden.example", "service@welden.example"]);
  assert.deepEqual(settings.slaEscalationEmails, ["manager@welden.example"]);
  assert.equal(settings.firstResponseSlaWorkingDays, 2);
  assert.equal(settings.slaReminderLeadHours, 4);
  assert.equal(settings.slaEscalationLeadHours, 24);
  assert.equal(settings.quotationLogoUrl, "");
  assert.equal(settings.quotationBrandName, "");
});

test("validateSettings rejects invalid business hours", () => {
  assert.throws(() => validateSettings({
    advisorDefaultAssigneeId: "user_agent",
    businessDays: [1, 2, 3, 4, 5],
    businessHours: { start: 18, end: 9 },
    internalNotificationEmails: ["ops@welden.example"]
  }), /Business hours/);
});

test("validateSettings rejects empty default assignee", () => {
  assert.throws(() => validateSettings({
    advisorDefaultAssigneeId: "",
    businessDays: [1, 2, 3, 4, 5],
    businessHours: { start: 9, end: 18 },
    internalNotificationEmails: ["ops@welden.example"]
  }), /Default assignee/);
});
