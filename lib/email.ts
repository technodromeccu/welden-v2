import crypto from "crypto";
import { DEFAULT_QUOTATION_BRAND_NAME, renderQuotationEmailHtml, renderQuotationEmailText } from "./quotation-email.ts";
import { nowIso, readCollection, writeCollection } from "./store.ts";
import type { PreliminaryQuotation, Settings } from "./types.ts";

interface EmailEntry {
  id: string;
  to: string[];
  subject: string;
  bodyPreview: string;
  createdAt: string;
  provider: "log_only" | "resend";
  status: "logged" | "sent" | "failed";
  providerMessageId?: string;
  error?: string;
}

function maskEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const [local = "", domain = ""] = trimmed.split("@");
  if (!domain) {
    return "[redacted]";
  }
  const localPrefix = local.slice(0, Math.min(2, local.length)) || "*";
  return `${localPrefix}***@${domain}`;
}

function buildBodyPreview(body: string) {
  const normalized = body.trim();
  if (!normalized) {
    return "";
  }
  return `${normalized.slice(0, 160)}${normalized.length > 160 ? "..." : ""}`;
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL;
  const senderName = process.env.RESEND_SENDER_NAME ?? "Welden Industries";
  const replyToEmail = process.env.RESEND_REPLY_TO_EMAIL;

  return {
    apiKey,
    senderEmail,
    senderName,
    replyToEmail,
    ready: Boolean(apiKey && senderEmail)
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toHtml(body: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#253246;background:#f7fbfe;"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid rgba(126,145,167,0.18);border-radius:16px;padding:32px;"><h2 style="margin:0 0 16px;color:#182334;">Welden Industries</h2>${body
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;line-height:1.7;color:#5b6a7d;">${escapeHtml(line)}</p>`)
    .join("")}</div></body></html>`;
}

async function appendLog(entry: EmailEntry) {
  const emailLog = await readCollection<EmailEntry[]>("email-log");
  emailLog.unshift(entry);
  // FEAT-07: Cap at 500 entries — oldest are dropped; recent history is preserved for debugging.
  await writeCollection("email-log", emailLog.slice(0, 500));
}

export async function sendEmail(to: string[], subject: string, body: string, options?: { html?: string }) {
  const recipients = to.filter(Boolean).map((email) => email.trim()).filter(Boolean);
  const maskedRecipients = recipients.map(maskEmail);
  const bodyPreview = buildBodyPreview(body);
  const createdAt = nowIso();
  const id = `email_${Date.now()}`;

  if (!recipients.length) {
    await appendLog({
      id,
      to: [],
      subject,
      bodyPreview,
      createdAt,
      provider: "log_only",
      status: "failed",
      error: "No recipients provided"
    });
    return { delivered: false, provider: "log_only" as const, error: "No recipients provided" };
  }

  const config = getResendConfig();

  if (!config.ready) {
    await appendLog({
      id,
      to: maskedRecipients,
      subject,
      bodyPreview,
      createdAt,
      provider: "log_only",
      status: "logged"
    });
    return { delivered: false, provider: "log_only" as const };
  }

  const payload: Record<string, unknown> = {
    from: `${config.senderName} <${config.senderEmail}>`,
    to: recipients,
    subject,
    text: body,
    html: options?.html ?? toHtml(body),
    headers: {
      "X-Entity-Ref-ID": crypto.randomUUID()
    }
  };

  if (config.replyToEmail) {
    payload.reply_to = config.replyToEmail;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const raw = (await response.text()).trim();
    const parsed = raw ? (JSON.parse(raw) as { id?: string; message?: string; name?: string }) : {};

    if (!response.ok) {
      const errorMessage = parsed.message ?? `Resend request failed with status ${response.status}`;
      await appendLog({
        id,
        to: maskedRecipients,
        subject,
        bodyPreview,
        createdAt,
        provider: "resend",
        status: "failed",
        error: errorMessage
      });
      return { delivered: false, provider: "resend" as const, error: errorMessage };
    }

    await appendLog({
      id,
      to: maskedRecipients,
      subject,
      bodyPreview,
      createdAt,
      provider: "resend",
      status: "sent",
      providerMessageId: parsed.id
    });

    return { delivered: true, provider: "resend" as const, messageId: parsed.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Resend error";
    await appendLog({
      id,
      to: maskedRecipients,
      subject,
      bodyPreview,
      createdAt,
      provider: "resend",
      status: "failed",
      error: message
    });
    return { delivered: false, provider: "resend" as const, error: message };
  }
}

export async function sendQuotationEmail(input: {
  to: string[];
  quotation: PreliminaryQuotation;
  variantLabel?: string | null;
}) {
  const settings = await readCollection<Settings>("settings");
  const subject = `${input.quotation.quoteTitle} - ${input.quotation.referenceNumber}`;
  const text = renderQuotationEmailText({
    quotation: input.quotation,
    variantLabel: input.variantLabel,
    branding: {
      logoUrl: settings.quotationLogoUrl,
      brandName: settings.quotationBrandName || DEFAULT_QUOTATION_BRAND_NAME
    }
  });
  const html = renderQuotationEmailHtml({
    quotation: input.quotation,
    variantLabel: input.variantLabel,
    branding: {
      logoUrl: settings.quotationLogoUrl,
      brandName: settings.quotationBrandName || DEFAULT_QUOTATION_BRAND_NAME
    }
  });

  return sendEmail(input.to, subject, text, { html });
}
