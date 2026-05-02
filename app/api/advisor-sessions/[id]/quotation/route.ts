import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getVisibleLeadSessionById } from "@/lib/lead-assistant-core";
import { requireSameOrigin } from "@/lib/origin-check";
import { getAdvisorSessions, issueLeadQuotationFromTemplate } from "@/lib/leads";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin", "manager", "agent"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const body = await request.json() as { templateId?: string };
  if (!body.templateId || !body.templateId.trim()) {
    return NextResponse.json({ error: "An active quotation template is required." }, { status: 400 });
  }

  const { id } = await context.params;
  const visibleSession = getVisibleLeadSessionById(auth.user, await getAdvisorSessions(), id);
  if (!visibleSession) {
    return NextResponse.json({ error: "Lead session not found." }, { status: 404 });
  }

  try {
    const result = await issueLeadQuotationFromTemplate({
      sessionId: id,
      templateId: body.templateId.trim(),
      actorName: auth.user.name,
      actorRole: auth.user.role
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to issue quotation." }, { status: 400 });
  }
}
