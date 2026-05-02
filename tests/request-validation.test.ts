import test from "node:test";
import assert from "node:assert/strict";
import { validateAdvisorRequest, validateContactRequest } from "../lib/request-validation.ts";

test("validateContactRequest trims and returns normalized values", () => {
  const result = validateContactRequest({
    name: "  Priya  ",
    email: "  priya@example.com ",
    phone: " +91 98765 43210 ",
    company: "  Welden Buyer  ",
    machineInterest: "  Pipe Cutting  ",
    message: "  Need a quote.  "
  });

  assert.equal(result.name, "Priya");
  assert.equal(result.email, "priya@example.com");
  assert.equal(result.machineInterest, "Pipe Cutting");
  assert.equal(result.message, "Need a quote.");
});

test("validateContactRequest rejects bad email", () => {
  assert.throws(() => validateContactRequest({
    name: "Priya",
    email: "not-an-email",
    phone: "+919876543210",
    message: "Need help"
  }), /valid email/);
});

test("validateAdvisorRequest rejects missing question", () => {
  assert.throws(() => validateAdvisorRequest({
    lead: { name: "Priya", email: "priya@example.com", phone: "+919876543210" },
    question: "   "
  }), /question is required/i);
});

test("validateAdvisorRequest trims lead data", () => {
  const result = validateAdvisorRequest({
    lead: { name: "  Priya  ", email: " priya@example.com ", phone: " +919876543210 ", company: "  Buyer Co  " },
    question: "  Do you support bearing pushing?  ",
    transcriptSummary: "  Prior chat  "
  });

  assert.equal(result.lead.name, "Priya");
  assert.equal(result.lead.company, "Buyer Co");
  assert.equal(result.question, "Do you support bearing pushing?");
  assert.equal(result.transcriptSummary, "Prior chat");
});
