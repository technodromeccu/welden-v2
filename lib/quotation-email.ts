import type { PreliminaryQuotation } from "./types";

export const DEFAULT_QUOTATION_BRAND_NAME = "Welden Industries";
export const DEFAULT_QUOTATION_LOGO_PATH = "/images/branding/welden-placeholder-logo.svg";

type QuotationBranding = {
  logoUrl?: string | null;
  brandName?: string | null;
};

type QuotationEmailInput = {
  quotation: PreliminaryQuotation;
  variantLabel?: string | null;
  branding?: QuotationBranding;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveAssetUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? process.env.DEPLOY_URL ?? "").replace(/\/$/, "");
  if (!siteUrl) return trimmed;
  return `${siteUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function renderList(title: string, items: string[]) {
  if (!items.length) return "";
  return `
    <tr>
      <td style="padding:0 0 18px;">
        <div style="border:1px solid #dbe6f1;border-radius:18px;background:#ffffff;padding:20px 22px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5b6a7d;">${escapeHtml(title)}</div>
          <ul style="margin:14px 0 0;padding-left:18px;color:#243447;font-size:14px;line-height:1.8;">
            ${items.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </td>
    </tr>
  `;
}

function renderFact(label: string, value?: string | null) {
  if (!value?.trim()) return "";
  return `
    <tr>
      <td style="padding:0 0 10px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#66768a;">${escapeHtml(label)}</div>
        <div style="margin-top:4px;font-size:15px;line-height:1.6;color:#182334;">${escapeHtml(value.trim())}</div>
      </td>
    </tr>
  `;
}

export function renderQuotationEmailText(input: QuotationEmailInput) {
  const { quotation, variantLabel } = input;
  const lines = [
    `${quotation.quoteTitle} - ${quotation.referenceNumber}`,
    "",
    `Machine: ${quotation.productTitle}`,
    variantLabel?.trim() ? `Variant: ${variantLabel.trim()}` : null,
    `Price: ${quotation.currency} ${quotation.basePrice}`,
    `Issued to: ${quotation.requester.name}`,
    quotation.requester.company?.trim() ? `Company: ${quotation.requester.company.trim()}` : null,
    quotation.requester.email?.trim() ? `Email: ${quotation.requester.email.trim()}` : null,
    quotation.requester.phone?.trim() ? `Phone: ${quotation.requester.phone.trim()}` : null,
    "",
    quotation.quoteBody,
    "",
    "Reply to this email or contact Welden Industries to continue with technical review, commercial discussion, or a formal quotation."
  ].filter(Boolean);

  return lines.join("\n");
}

export function renderQuotationEmailHtml(input: QuotationEmailInput) {
  const { quotation, variantLabel, branding } = input;
  const brandName = branding?.brandName?.trim() || DEFAULT_QUOTATION_BRAND_NAME;
  const logoUrl = resolveAssetUrl(branding?.logoUrl || DEFAULT_QUOTATION_LOGO_PATH);
  const validUntil = quotation.validUntilDate
    ? new Date(quotation.validUntilDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 620px) {
        .shell { padding: 14px !important; }
        .hero { padding: 22px 20px !important; border-radius: 22px !important; }
        .card { padding: 18px !important; border-radius: 18px !important; }
        .title { font-size: 24px !important; }
        .price { font-size: 28px !important; }
        .stack-gap { height: 12px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#182334;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#eef3f8;">
      <tr>
        <td class="shell" align="center" style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:collapse;">
            <tr>
              <td class="hero" style="padding:28px 32px;background:#0d1b2f;border-radius:28px;">
                ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" style="display:block;width:240px;max-width:100%;height:auto;border:0;">` : ""}
                <div style="margin-top:18px;display:inline-block;border:1px solid rgba(255,255,255,0.16);border-radius:999px;padding:8px 14px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cbd5e1;">Preliminary quotation</div>
                <div class="title" style="margin-top:20px;font-size:30px;font-weight:700;line-height:1.25;color:#f8fafc;">${escapeHtml(quotation.quoteTitle)}</div>
                <div style="margin-top:10px;font-size:14px;line-height:1.8;color:#cbd5e1;">${escapeHtml(quotation.quoteBody.split("\n").find((line) => line.trim() && !line.startsWith("Preliminary quotation") && !line.startsWith("Reference number:") && !line.startsWith("Issued to:") && !line.startsWith("Machine:")) || quotation.validityNote)}</div>
              </td>
            </tr>

            <tr><td class="stack-gap" style="height:18px;"></td></tr>

            <tr>
              <td class="card" style="padding:22px 24px;border:1px solid #dbe6f1;border-radius:22px;background:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5b6a7d;">Quotation reference</div>
                <div style="margin-top:12px;font-size:28px;font-weight:700;line-height:1.2;color:#0f2745;">${escapeHtml(quotation.referenceNumber)}</div>
                <div style="margin-top:18px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5b6a7d;">Quoted machine</div>
                <div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.35;color:#182334;">${escapeHtml(quotation.productTitle)}</div>
                ${variantLabel?.trim() ? `<div style="margin-top:8px;font-size:14px;font-weight:600;line-height:1.6;color:#536476;">${escapeHtml(variantLabel.trim())}</div>` : ""}
                <div style="margin-top:20px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5b6a7d;">Price</div>
                <div class="price" style="margin-top:10px;display:inline-block;border-radius:18px;background:#f59e0b;padding:14px 18px;font-size:34px;font-weight:700;line-height:1;color:#0d1b2f;">${escapeHtml(`${quotation.currency} ${quotation.basePrice}`)}</div>
                <div style="margin-top:14px;font-size:14px;line-height:1.75;color:#425264;">${escapeHtml(quotation.validityNote)}</div>
                ${validUntil ? `<div style="margin-top:10px;font-size:13px;font-weight:700;color:#0f2745;">Valid until ${escapeHtml(validUntil)}</div>` : ""}
              </td>
            </tr>

            <tr><td class="stack-gap" style="height:18px;"></td></tr>

            <tr>
              <td class="card" style="padding:22px 24px;border:1px solid #dbe6f1;border-radius:22px;background:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5b6a7d;">Issued to</div>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;border-collapse:collapse;">
                  ${renderFact("Customer", quotation.requester.name)}
                  ${renderFact("Company", quotation.requester.company ?? null)}
                  ${renderFact("Email", quotation.requester.email)}
                  ${renderFact("Phone", quotation.requester.phone)}
                </table>
              </td>
            </tr>

            <tr><td class="stack-gap" style="height:18px;"></td></tr>

            ${renderList("Included scope", quotation.scopeItems)}
            ${renderList("Technical specifications", quotation.technicalSpecifications)}
            ${renderList("General notes", quotation.generalNotes)}
            ${renderList("Exclusions", quotation.exclusions)}
            ${renderList("Terms and conditions", quotation.termsAndConditions)}
            ${renderList("Bank details", quotation.bankDetails)}

            <tr>
              <td style="padding:0 0 18px;">
                <div class="card" style="border:1px solid #dbe6f1;border-radius:22px;background:#ffffff;padding:22px 24px;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5b6a7d;">Commercial terms</div>
                  <div style="margin-top:16px;font-size:14px;line-height:1.85;color:#243447;">
                    <div><strong>Delivery:</strong> ${escapeHtml(quotation.deliveryNote)}</div>
                    <div style="margin-top:10px;"><strong>Installation:</strong> ${escapeHtml(quotation.installationNote)}</div>
                    <div style="margin-top:10px;"><strong>Warranty:</strong> ${escapeHtml(quotation.warrantyNote)}</div>
                    <div style="margin-top:10px;"><strong>Validity:</strong> ${escapeHtml(quotation.validityNote)}</div>
                    <div style="margin-top:10px;"><strong>Payment terms:</strong> ${escapeHtml(quotation.paymentTerms)}</div>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 0 18px;">
                <div class="card" style="border:1px solid #dbe6f1;border-radius:22px;background:#ffffff;padding:22px 24px;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5b6a7d;">Next step</div>
                  <div style="margin-top:16px;font-size:14px;line-height:1.85;color:#243447;">${escapeHtml(quotation.footerNote)}</div>
                  <div style="margin-top:14px;padding:14px 16px;border-radius:16px;background:#eef5ff;color:#17324d;font-weight:600;line-height:1.7;">
                    Reply to this email to continue with technical review, commercial discussion, or a formal quotation.
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td class="card" style="border-radius:22px;background:#ffffff;border:1px solid #dbe6f1;padding:22px 24px;font-size:13px;line-height:1.8;color:#526273;">
                <div style="font-size:15px;font-weight:700;color:#182334;">${escapeHtml(quotation.companyName || brandName)}</div>
                ${quotation.companyAddress?.trim() ? `<div style="margin-top:8px;">${escapeHtml(quotation.companyAddress.trim())}</div>` : ""}
                ${quotation.companyPhone?.trim() ? `<div style="margin-top:4px;">Phone: ${escapeHtml(quotation.companyPhone.trim())}</div>` : ""}
                ${quotation.companyWebsite?.trim() ? `<div style="margin-top:4px;">${escapeHtml(quotation.companyWebsite.trim())}</div>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
