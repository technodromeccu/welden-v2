import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { createLeadFromInquiry } from "@/lib/leads";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readCollection } from "@/lib/store";
import { validateContactRequest } from "@/lib/request-validation";
import type { Settings } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const rateLimited = enforceRateLimit("contact-lead", request.headers, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (rateLimited) {
      return rateLimited;
    }

    const body = validateContactRequest(await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      machineInterest?: string;
      message?: string;
    });

    const settings = await readCollection<Settings>("settings");
    const session = await createLeadFromInquiry({
      lead: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company
      },
      source: "website_form",
      question: body.message,
      machineInterest: body.machineInterest ?? null,
      ownerUserId: settings.advisorDefaultAssigneeId ?? null,
      transcriptSummary: body.message
    });

    return NextResponse.json({ leadId: session.id });
  } catch (error) {
    if (error instanceof Error && !error.message.includes("ENOENT") && !error.message.includes("EACCES")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Unable to submit your consultation request right now.", 500, {
      route: "/api/contact-lead",
      method: "POST"
    });
  }
}
