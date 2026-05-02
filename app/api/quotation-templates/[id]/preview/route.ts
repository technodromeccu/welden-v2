import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getVisibleLeadSessionById } from "@/lib/lead-assistant-core";
import { getAdvisorSessions } from "@/lib/leads";
import { getQuotationTemplates, renderPreliminaryQuotation } from "@/lib/quotations";

// WF-09: Render a quotation preview for a given template + session without saving or emailing.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin", "manager", "agent"]);
  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json();
  const params = await context.params;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : null;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const [templates, sessions] = await Promise.all([
    getQuotationTemplates(),
    getAdvisorSessions()
  ]);

  const template = templates.find((t) => t.id === params.id);
  if (!template) {
    return NextResponse.json({ error: "Quotation template not found." }, { status: 404 });
  }

  const session = getVisibleLeadSessionById(auth.user, sessions, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Lead session not found." }, { status: 404 });
  }

  const text = renderPreliminaryQuotation({
    template,
    requester: session.lead,
    productTitle: template.machineName,
    referenceNumber: "WEL-PQ-PREVIEW"
  });

  return NextResponse.json({ text });
}
