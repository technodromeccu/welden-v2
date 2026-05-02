import { NextResponse } from "next/server";
import { getAdvisorSessions, saveAdvisorSessions } from "@/lib/leads";
import { readCollection, writeCollection, nowIso, makeId } from "@/lib/store";
import type { LeadActivity } from "@/lib/types";

// Resend webhook event shape (we only care about bounce/complaint types)
interface ResendWebhookEvent {
  type: string; // "email.bounced" | "email.complained" | "email.delivered" | etc.
  data: {
    email_id: string;  // Resend message ID — matches providerMessageId in email-log
    to: string[];      // recipient email(s)
    subject?: string;
    bounce?: {
      type?: string;   // "hard" | "soft"
      message?: string;
    };
  };
  created_at: string;
}

function makeLeadActivity(
  type: "email_delivery_failed",
  body: string
): LeadActivity {
  return {
    id: makeId("act"),
    type,
    body,
    createdAt: nowIso(),
    authorName: "System",
    authorRole: "system" as const
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Resend uses Svix for webhook signing. The svix-signature header contains
  // comma-separated v1,<base64-hmac> values. We verify by computing our own HMAC
  // and comparing. If no secret is configured we skip verification (not recommended for prod).
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("[resend-webhook] Missing svix headers");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Svix signing: HMAC-SHA256 of "<svix-id>.<svix-timestamp>.<body>"
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const secretBytes = Buffer.from(webhookSecret.replace(/^whsec_/, ""), "base64");
    const { createHmac, timingSafeEqual } = await import("crypto");
    const computedSignature = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

    // svix-signature may contain multiple space-separated "v1,<sig>" values
    const signatures = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
    const isValid = signatures.some((sig) => {
      const received = Buffer.from(sig);
      const expected = Buffer.from(computedSignature);
      return received.length === expected.length && timingSafeEqual(received, expected);
    });

    if (!isValid) {
      console.error("[resend-webhook] Signature mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (err) {
    console.error("[resend-webhook] Signature verification error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[resend-webhook] Received event type:", event.type);

  // Only handle bounce and complaint events
  const isBounce = event.type === "email.bounced";
  const isComplaint = event.type === "email.complained";
  if (!isBounce && !isComplaint) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const bouncedEmails = (event.data.to ?? []).map((e) => e.trim().toLowerCase());
  if (!bouncedEmails.length) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const eventLabel = isBounce
    ? `Email bounced (${event.data.bounce?.type ?? "unknown"}) for ${bouncedEmails.join(", ")} — follow up manually.`
    : `Email marked as spam/complaint by ${bouncedEmails.join(", ")} — review and follow up.`;

  try {
    // Flag all open leads whose email matches the bounced address
    const sessions = await getAdvisorSessions();
    console.log("[resend-webhook] Processing bounce/complaint for recipients:", bouncedEmails.length);
    let flaggedCount = 0;

    const updated = sessions.map((session) => {
      const leadEmail = session.lead.email?.trim().toLowerCase() ?? "";
      if (!bouncedEmails.includes(leadEmail)) return session;

      // Skip already-closed leads
      const stage = session.workflow?.stage ?? "new";
      if (stage === "won" || stage === "lost") return session;

      flaggedCount++;
      return {
        ...session,
        workflow: {
          ...session.workflow!,
          lastUpdatedAt: nowIso(),
          activity: [
            makeLeadActivity("email_delivery_failed", eventLabel),
            ...(session.workflow?.activity ?? [])
          ]
        }
      };
    });

    console.log("[resend-webhook] flaggedCount:", flaggedCount);
    if (flaggedCount > 0) {
      await saveAdvisorSessions(updated);
      console.log("[resend-webhook] Sessions saved successfully");
    }

    // Also update the email log entry to mark it as bounced
    interface EmailEntry {
      id: string;
      to: string[];
      subject: string;
      body: string;
      createdAt: string;
      provider: string;
      status: string;
      providerMessageId?: string;
      error?: string;
    }
    const emailLog = await readCollection<EmailEntry[]>("email-log");
    const updatedLog = emailLog.map((entry) => {
      if (entry.providerMessageId !== event.data.email_id) return entry;
      return { ...entry, status: isBounce ? "bounced" : "complained", error: eventLabel };
    });
    await writeCollection("email-log", updatedLog);

    return NextResponse.json({ ok: true, flagged: flaggedCount });
  } catch (error) {
    console.error("[resend-webhook] Error processing bounce:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
