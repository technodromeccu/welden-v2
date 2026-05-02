import { makeId, nowIso, readCollection, writeCollection } from "./store.ts";
import type { Lead, PreliminaryQuotation, PreliminaryQuotationStatus, Product, QuotationTemplate, Settings } from "./types.ts";

const DEFAULT_COMPANY_NAME = "Welden Industries";
const DEFAULT_COMPANY_ADDRESS = "Mahamayatala (Garia), Laskarpur\nKolkata - 700153, West Bengal";
const DEFAULT_COMPANY_PHONE = "033-24359094/5694/9830060993";
const DEFAULT_WEBSITE = "www.welden.in";
const DEFAULT_COMPANY_PROFILE = "Manufacturer of complete range of standard and special purpose Arc Welding Machines, CNC, Plasma & Oxy-Acetylene Profile Cutting Machines, Welding Aids such as Rotators, Manipulators etc., Machinery for Idler Manufacturing.";

type QuotationOverride = {
  quoteTitle?: string;
  quoteBody?: string;
  basePrice?: string;
  scopeItems?: string[];
  exclusions?: string[];
  termsAndConditions?: string[];
  validityNote?: string;
  deliveryNote?: string;
  installationNote?: string;
  warrantyNote?: string;
  footerNote?: string;
};

function normalizeTemplate(template: QuotationTemplate): QuotationTemplate {
  return {
    ...template,
    productId: template.productId ?? null,
    productSlug: template.productSlug ?? null,
    variantLabel: template.variantLabel ?? null,
    active: template.active ?? true,
    currency: template.currency?.trim() || "INR",
    basePrice: template.basePrice?.trim() || "On request",
    intro: template.intro?.trim() || "Thank you for your interest in Welden Industries. Based on the requirement shared through our Guided Machine Advisor, please find the preliminary quotation summary below.",
    scopeItems: template.scopeItems ?? [],
    technicalSpecifications: template.technicalSpecifications ?? [],
    generalNotes: template.generalNotes ?? [],
    bankDetails: template.bankDetails ?? [],
    exclusions: template.exclusions ?? [],
    deliveryNote: template.deliveryNote?.trim() || "Delivery schedule will be confirmed after technical and commercial alignment.",
    installationNote: template.installationNote?.trim() || "Installation and commissioning support can be scoped separately if required.",
    warrantyNote: template.warrantyNote?.trim() || "Warranty scope will be confirmed in the formal commercial offer.",
    paymentTerms: template.paymentTerms?.trim() || "Payment terms will be finalized during commercial discussion.",
    validityNote: template.validityNote?.trim() || "This preliminary quotation is subject to technical and commercial confirmation.",
    validityDays: template.validityDays ?? null,
    termsAndConditions: template.termsAndConditions ?? [],
    footerNote: template.footerNote?.trim() || `${DEFAULT_COMPANY_PROFILE} For detailed engineering, delivery commitment, and final commercials, please continue the conversation on this same request thread.`,
    sampleDocumentUrl: template.sampleDocumentUrl ?? "",
    companyName: template.companyName?.trim() || DEFAULT_COMPANY_NAME,
    companyAddress: template.companyAddress?.trim() || DEFAULT_COMPANY_ADDRESS,
    companyPhone: template.companyPhone?.trim() || DEFAULT_COMPANY_PHONE,
    companyWebsite: template.companyWebsite?.trim() || DEFAULT_WEBSITE,
    createdAt: template.createdAt ?? nowIso(),
    updatedAt: template.updatedAt ?? template.createdAt ?? nowIso()
  };
}

function normalizeQuotation(quotation: PreliminaryQuotation): PreliminaryQuotation {
  return {
    ...quotation,
    advisorSessionId: quotation.advisorSessionId ?? null,
    status: quotation.status ?? "issued",
    technicalSpecifications: quotation.technicalSpecifications ?? [],
    generalNotes: quotation.generalNotes ?? [],
    bankDetails: quotation.bankDetails ?? [],
    paymentTerms: quotation.paymentTerms ?? "Payment terms will be finalized during commercial discussion.",
    sampleDocumentUrl: quotation.sampleDocumentUrl ?? "",
    companyName: quotation.companyName ?? DEFAULT_COMPANY_NAME,
    companyAddress: quotation.companyAddress ?? DEFAULT_COMPANY_ADDRESS,
    companyPhone: quotation.companyPhone ?? DEFAULT_COMPANY_PHONE,
    companyWebsite: quotation.companyWebsite ?? DEFAULT_WEBSITE,
    validUntilDate: quotation.validUntilDate ?? null,
    updatedAt: quotation.updatedAt ?? quotation.createdAt
  };
}

export async function getQuotationTemplates() {
  const templates = await readCollection<QuotationTemplate[]>("quotation-templates");
  return templates.map(normalizeTemplate);
}

export async function saveQuotationTemplates(templates: QuotationTemplate[]) {
  await writeCollection("quotation-templates", templates.map(normalizeTemplate));
}

export async function getPreliminaryQuotations() {
  const quotations = await readCollection<PreliminaryQuotation[]>("preliminary-quotations");
  return quotations.map(normalizeQuotation).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function savePreliminaryQuotations(quotations: PreliminaryQuotation[]) {
  await writeCollection("preliminary-quotations", quotations.map(normalizeQuotation));
}

export function getActiveQuotationTemplatesForProduct(product: Product | null, templates: QuotationTemplate[]) {
  if (!product) return [];
  return templates.filter((template) => template.active && (template.productId === product.id || template.productSlug === product.slug));
}

export function buildDefaultQuotationTemplate(product: Product): QuotationTemplate {
  const stamp = nowIso();
  return normalizeTemplate({
    id: makeId("qtpl"),
    title: `${product.title} preliminary quotation`,
    productId: product.id,
    productSlug: product.slug,
    machineName: product.title,
    variantLabel: null,
    active: true,
    currency: "INR",
    basePrice: "On request",
    intro: `Thank you for your interest in the ${product.title}. Based on your requirement summary, Welden Industries is pleased to share the following preliminary quotation for review.`,
    scopeItems: [
      `${product.title}`,
      "Standard machine supply as per approved Welden configuration",
      "Commercial and technical review on confirmation"
    ],
    technicalSpecifications: [],
    generalNotes: [],
    bankDetails: [],
    exclusions: [
      "GST and statutory duties, if applicable",
      "Freight, unloading, and civil work unless agreed separately",
      "Final scope changes after technical confirmation"
    ],
    deliveryNote: "Delivery timeline will be confirmed after technical approval and commercial acceptance.",
    installationNote: "Installation, commissioning, and operator training can be included as a separate commercial line if required.",
    warrantyNote: "Warranty terms will follow the final formal quotation and accepted scope of supply.",
    paymentTerms: "Payment terms to be finalized during commercial discussion.",
    validityNote: "This preliminary quotation is budgetary in nature and subject to technical and commercial confirmation.",
    termsAndConditions: [
      "This is a preliminary quotation and not a final commercial offer.",
      "Final price and scope may change after engineering and commercial validation.",
      "Machine suitability will be confirmed against the final application details shared by the customer."
    ],
    footerNote: "Please reply on the same Welden thread to continue with detailed technical review, commercial discussion, or a formal quotation request.",
    sampleDocumentUrl: product.brochureUrl ?? "",
    companyName: DEFAULT_COMPANY_NAME,
    companyAddress: DEFAULT_COMPANY_ADDRESS,
    companyPhone: DEFAULT_COMPANY_PHONE,
    companyWebsite: DEFAULT_WEBSITE,
    createdAt: stamp,
    updatedAt: stamp
  });
}

export function buildTemplateVersionStamp(template: QuotationTemplate) {
  return `${template.id}:${template.updatedAt}`;
}

function extractReferenceSequence(referenceNumber: string | null | undefined, year: number) {
  if (!referenceNumber) return 0;
  const match = referenceNumber.match(/^WEL-PQ-(\d{4})-(\d{4,})$/);
  if (!match) return 0;
  if (Number(match[1]) !== year) return 0;
  return Number(match[2]) || 0;
}

export function generatePreliminaryQuotationReference(existingCount: number, issuedAt: Date = new Date()) {
  return `WEL-PQ-${issuedAt.getUTCFullYear()}-${String(existingCount + 1).padStart(4, "0")}`;
}

export function renderPreliminaryQuotation(input: {
  template: QuotationTemplate;
  requester: Lead;
  productTitle: string;
  referenceNumber: string;
  validUntilDate?: string | null;
}) {
  const { template, requester, productTitle, referenceNumber, validUntilDate } = input;
  const technicalSpecifications = template.technicalSpecifications ?? [];
  const generalNotes = template.generalNotes ?? [];
  const bankDetails = template.bankDetails ?? [];
  const lines = [
    "Preliminary quotation",
    `Reference number: ${referenceNumber}`,
    "",
    `Issued to: ${requester.name}`,
    requester.company?.trim() ? `Company: ${requester.company.trim()}` : null,
    requester.email?.trim() ? `Email: ${requester.email.trim()}` : null,
    requester.phone?.trim() ? `Phone: ${requester.phone.trim()}` : null,
    "",
    `Machine: ${productTitle}`,
    template.intro,
    "",
    `${template.currency} ${template.basePrice}`,
    "",
    "Included scope:",
    ...(template.scopeItems.length ? template.scopeItems.map((item) => `- ${item}`) : ["- Standard machine scope as discussed with Welden Industries"]),
    "",
    ...(technicalSpecifications.length ? ["Technical specification:", ...technicalSpecifications.map((item) => `- ${item}`), ""] : []),
    ...(generalNotes.length ? ["General notes:", ...generalNotes.map((item) => `- ${item}`), ""] : []),
    "Exclusions:",
    ...(template.exclusions.length ? template.exclusions.map((item) => `- ${item}`) : ["- Any items not explicitly stated in the scope above"]),
    "",
    `Delivery: ${template.deliveryNote}`,
    `Installation: ${template.installationNote}`,
    `Warranty: ${template.warrantyNote}`,
    `Payment terms: ${template.paymentTerms}`,
    `Validity: ${template.validityNote}`,
    // FEAT-06: append human-readable expiry date when available
    validUntilDate
      ? `Valid until: ${new Date(validUntilDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
      : null,
    "",
    "Terms and conditions:",
    ...(template.termsAndConditions.length ? template.termsAndConditions.map((item) => `- ${item}`) : ["- Subject to technical and commercial confirmation by Welden Industries."]),
    "",
    ...(bankDetails.length ? ["Bank details:", ...bankDetails.map((item) => `- ${item}`), ""] : []),
    template.footerNote,
    "",
    template.companyName,
    template.companyAddress?.trim() || null,
    template.companyPhone?.trim() ? `Phone: ${template.companyPhone.trim()}` : null,
    template.companyWebsite?.trim() || DEFAULT_WEBSITE
  ].filter(Boolean);

  return lines.join("\n");
}

export function renderPreliminaryQuotationVariants(input: {
  templates: QuotationTemplate[];
  requester: Lead;
  productTitle: string;
  referenceNumber: string;
}) {
  const { templates, requester, productTitle, referenceNumber } = input;
  const baseTemplate = templates[0];
  const baseGeneralNotes = baseTemplate.generalNotes ?? [];
  const baseBankDetails = baseTemplate.bankDetails ?? [];
  const lines = [
    "Preliminary quotation",
    `Reference number: ${referenceNumber}`,
    "",
    `Issued to: ${requester.name}`,
    requester.company?.trim() ? `Company: ${requester.company.trim()}` : null,
    requester.email?.trim() ? `Email: ${requester.email.trim()}` : null,
    requester.phone?.trim() ? `Phone: ${requester.phone.trim()}` : null,
    "",
    `Machine family: ${productTitle}`,
    baseTemplate.intro,
    "",
    "Available variants and prices:",
    ...templates.map((template, index) => `${index + 1}. ${template.variantLabel || template.machineName} - ${template.currency} ${template.basePrice} Ex. Works Kolkata`),
    "",
    "Variant scope highlights:",
    ...templates.flatMap((template) => [
      `${template.variantLabel || template.machineName}:`,
      ...(template.scopeItems.length ? template.scopeItems.map((item) => `- ${item}`) : ["- Standard machine scope as configured by Welden Industries"])
    ]),
    "",
    ...(baseGeneralNotes.length ? ["General notes:", ...baseGeneralNotes.map((item) => `- ${item}`), ""] : []),
    `Delivery: ${baseTemplate.deliveryNote}`,
    `Installation: ${baseTemplate.installationNote}`,
    `Warranty: ${baseTemplate.warrantyNote}`,
    `Payment terms: ${baseTemplate.paymentTerms}`,
    `Validity: ${baseTemplate.validityNote}`,
    "",
    "Terms and conditions:",
    ...(baseTemplate.termsAndConditions.length ? baseTemplate.termsAndConditions.map((item) => `- ${item}`) : ["- Subject to technical and commercial confirmation by Welden Industries."]),
    "",
    ...(baseBankDetails.length ? ["Bank details:", ...baseBankDetails.map((item) => `- ${item}`), ""] : []),
    "Please confirm the required version so Welden Industries can continue with the correct commercial and technical follow-up.",
    "",
    baseTemplate.footerNote,
    "",
    baseTemplate.companyName,
    baseTemplate.companyAddress?.trim() || null,
    baseTemplate.companyPhone?.trim() ? `Phone: ${baseTemplate.companyPhone.trim()}` : null,
    baseTemplate.companyWebsite?.trim() || DEFAULT_WEBSITE
  ].filter(Boolean);

  return lines.join("\n");
}

export async function issuePreliminaryQuotation(input: {
  template: QuotationTemplate;
  requester: Lead;
  productTitle: string;  advisorSessionId?: string | null;
  overrides?: QuotationOverride;
}) {
  const [quotations, settings] = await Promise.all([
    getPreliminaryQuotations(),
    readCollection<Settings>("settings")
  ]);
  const createdAt = nowIso();
  const issuedAt = new Date(createdAt);
  const issuedYear = issuedAt.getUTCFullYear();
  const maxExistingReference = quotations.reduce((max, quotation) => {
    return Math.max(max, extractReferenceSequence(quotation.referenceNumber, issuedYear));
  }, 0);

  // FEAT-06: Compute expiry date from template's validityDays, if set
  const validUntilDate = input.template.validityDays
    ? (() => {
        const d = new Date(createdAt);
        d.setDate(d.getDate() + input.template.validityDays!);
        return d.toISOString();
      })()
    : null;

  // CODE-05: Use the higher of the persisted counter and the current collection length,
  // so deleting old quotations can never cause reference number collisions.
  const sequenceBase = Math.max(settings.lastQuotationNumber ?? 0, quotations.length, maxExistingReference);
  const referenceNumber = generatePreliminaryQuotationReference(sequenceBase, issuedAt);

  // Persist the updated counter before writing the quotation so a crash between the two
  // writes wastes a number (a gap) rather than repeating one.
  await writeCollection<Settings>("settings", { ...settings, lastQuotationNumber: sequenceBase + 1 });
  const quoteBody = input.overrides?.quoteBody
    ? input.overrides.quoteBody.replaceAll("WEL-PQ-PENDING", referenceNumber)
    : renderPreliminaryQuotation({
        template: input.template,
        requester: input.requester,
        productTitle: input.productTitle,
        referenceNumber,
        validUntilDate
      });

  const quotation: PreliminaryQuotation = normalizeQuotation({
    id: makeId("pquote"),
    referenceNumber,
    templateId: input.template.id,
    templateTitle: input.template.title,
    templateVersionStamp: buildTemplateVersionStamp(input.template),
    productId: input.template.productId ?? null,
    productTitle: input.productTitle,
    requester: input.requester,
    advisorSessionId: input.advisorSessionId ?? null,
    status: "issued",
    currency: input.template.currency,
    basePrice: input.overrides?.basePrice ?? input.template.basePrice,
    quoteTitle: input.overrides?.quoteTitle ?? `${input.productTitle} Preliminary quotation`,
    quoteBody,
    scopeItems: input.overrides?.scopeItems ?? input.template.scopeItems,
    technicalSpecifications: input.template.technicalSpecifications,
    generalNotes: input.template.generalNotes,
    bankDetails: input.template.bankDetails,
    exclusions: input.overrides?.exclusions ?? input.template.exclusions,
    termsAndConditions: input.overrides?.termsAndConditions ?? input.template.termsAndConditions,
    validityNote: input.overrides?.validityNote ?? input.template.validityNote,
    paymentTerms: input.template.paymentTerms,
    deliveryNote: input.overrides?.deliveryNote ?? input.template.deliveryNote,
    installationNote: input.overrides?.installationNote ?? input.template.installationNote,
    warrantyNote: input.overrides?.warrantyNote ?? input.template.warrantyNote,
    footerNote: input.overrides?.footerNote ?? input.template.footerNote,
    sampleDocumentUrl: input.template.sampleDocumentUrl,
    companyName: input.template.companyName,
    companyAddress: input.template.companyAddress,
    companyPhone: input.template.companyPhone,
    companyWebsite: input.template.companyWebsite,
    validUntilDate,
    createdAt,
    updatedAt: createdAt
  });

  quotations.unshift(quotation);
  await savePreliminaryQuotations(quotations);
  return quotation;
}

export async function issueVariantPreliminaryQuotation(input: {
  templates: QuotationTemplate[];
  requester: Lead;
  productTitle: string;  advisorSessionId?: string | null;
}) {
  const [primaryTemplate] = input.templates;
  if (!primaryTemplate) {
    throw new Error("At least one quotation template is required.");
  }

  const quoteBody = renderPreliminaryQuotationVariants({
    templates: input.templates,
    requester: input.requester,
    productTitle: input.productTitle,
    referenceNumber: "WEL-PQ-PENDING"
  });

  return issuePreliminaryQuotation({
    template: primaryTemplate,
    requester: input.requester,
    productTitle: input.productTitle,
    advisorSessionId: input.advisorSessionId,
    overrides: {
      quoteTitle: `${input.productTitle} Preliminary quotation (variant options)`,
      quoteBody,
      basePrice: "Multiple variants quoted",
      scopeItems: input.templates.map((template) => `${template.variantLabel || template.machineName}: ${template.currency} ${template.basePrice}`),
      exclusions: primaryTemplate.exclusions,
      termsAndConditions: primaryTemplate.termsAndConditions,
      validityNote: primaryTemplate.validityNote,
      deliveryNote: primaryTemplate.deliveryNote,
      installationNote: primaryTemplate.installationNote,
      warrantyNote: primaryTemplate.warrantyNote,
      footerNote: primaryTemplate.footerNote
    }
  });
}

export async function updatePreliminaryQuotationStatus(id: string, status: PreliminaryQuotationStatus) {
  const quotations = await getPreliminaryQuotations();
  const quotation = quotations.find((entry) => entry.id === id);
  if (!quotation) {
    throw new Error("Preliminary quotation not found.");
  }
  quotation.status = status;
  quotation.updatedAt = nowIso();
  await savePreliminaryQuotations(quotations);
  return quotation;
}



