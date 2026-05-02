import { BadgeAlert, Bot, Eye, FileText, LayoutDashboard, Library, MessageSquare, PencilLine, Settings2, ClipboardList, Users } from "lucide-react";
import { isSameLocalDay as _isSameLocalDay, getLeadScore as _getLeadScore, getLeadFirstCallState as _getLeadFirstCallState, isLeadStale as _isLeadStale, getLeadAttentionState as _getLeadAttentionState } from "@/lib/lead-scoring";
import type { DashboardSnapshot, LeadQuality, LeadStage, Product, QuotationTemplate } from "@/lib/types";

export type DashboardView = "dashboard" | "leads" | "machines" | "site content" | "quotation templates" | "knowledge base" | "users" | "settings" | "full";
export type AdminTab = Exclude<DashboardView, "full">;
export type LeadWorkflowDraft = {
  stage: LeadStage;
  ownerUserId: string;
  nextFollowUpAt: string;
  preferredCallbackAt: string;
  preferredCallbackNote: string;
  followUpStatus: "pending" | "scheduled" | "due" | "completed" | "no_answer" | "call_back_later";
  lastContactedAt: string;
  // WF-10: close reason fields, shown when stage is won or lost
  closeReason: string;
  closeReasonNote: string;
};

export const tabsByRole = {
  admin: ["dashboard", "leads", "machines", "site content", "quotation templates", "knowledge base", "users", "settings"],
  manager: ["dashboard", "leads"],
  agent: ["leads"]
} as const;

export const adminTabGroups = [
  { label: "Operate", tabs: ["dashboard", "leads"] },
  { label: "Commercial", tabs: ["quotation templates"] },
  { label: "Catalog", tabs: ["machines"] },
  { label: "Content", tabs: ["site content", "knowledge base"] },
  { label: "Control", tabs: ["users", "settings"] }
] as const;

export const tabMeta: Record<AdminTab, { label: string; shortLabel: string; mobileLabel?: string }> = {
  dashboard: { label: "Today", shortLabel: "Today" },
  leads: { label: "Pipeline", shortLabel: "Pipeline" },
  machines: { label: "Machines", shortLabel: "Machines" },
  "site content": { label: "Content", shortLabel: "Content" },
  "quotation templates": { label: "Quotes", shortLabel: "Quotes" },
  "knowledge base": { label: "Knowledge", shortLabel: "Knowledge" },
  users: { label: "Team", shortLabel: "Team" },
  settings: { label: "Settings", shortLabel: "Settings" }
};

export function getTabLabel(tab: string) {
  return tabMeta[tab as AdminTab]?.label ?? tab;
}

export function getTabShortLabel(tab: string) {
  return tabMeta[tab as AdminTab]?.shortLabel ?? getTabLabel(tab);
}

export const leadStageOptions: LeadStage[] = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"];

export function getDashboardViewForTab(tab: string): DashboardView {
  switch (tab) {
    case "dashboard":
    case "leads":
    case "machines":
    case "site content":
    case "quotation templates":
    case "knowledge base":
    case "users":
    case "settings":
      return tab;
    default:
      return "full";
  }
}

export function hasDataForTab(snapshot: DashboardSnapshot, tab: string) {
  switch (tab) {
    case "dashboard":
      return Boolean(snapshot.dashboardSummary) || snapshot.advisorSessions.length > 0 || snapshot.products.length > 0 || snapshot.siteSections.length > 0 || snapshot.knowledgeDocuments.length > 0;
    case "leads":
      return snapshot.advisorSessions.length > 0;
    case "machines":
      return snapshot.products.length > 0;
    case "site content":
      return snapshot.siteSections.length > 0;
    case "quotation templates":
      return snapshot.quotationTemplates.length > 0 || snapshot.products.length > 0;
    case "knowledge base":
      return snapshot.knowledgeDocuments.length > 0;
    case "users":
      return snapshot.users.length > 0;
    case "settings":
      return snapshot.users.length > 0;
    default:
      return true;
  }
}

export const iconForTab = (tab: string) => tab === "dashboard" ? LayoutDashboard : tab === "leads" ? Bot : tab === "machines" ? PencilLine : tab === "site content" ? FileText : tab === "quotation templates" ? ClipboardList : tab === "knowledge base" ? MessageSquare : tab === "users" ? Users : Settings2;
export const iconForSiteSection = (key: string) => key === "hero"
  ? LayoutDashboard
  : key === "about"
    ? FileText
    : key === "machine_cards"
      ? Eye
    : key === "advisor"
      ? Bot
      : key === "benefits"
        ? BadgeAlert
        : key === "industry"
          ? Library
          : key === "media"
            ? Eye
            : key === "contact"
              ? Users
              : key === "footer"
                ? MessageSquare
                : key === "machine_details"
                  ? PencilLine
                  : FileText;

export const fmtStatus = (v: string) => v.replaceAll("_", " ");
export const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleString() : "Not logged";
export const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};
export const fromDateTimeInputValue = (value: string) => value ? new Date(value).toISOString() : null;
export const splitCsv = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
export const linesToText = (values?: string[]) => (values ?? []).join("\n");
export const textToLines = (value: string | string[]) => (Array.isArray(value) ? value : value.split(/\r?\n/)).map((entry) => entry.trim()).filter(Boolean);
// howItWorks: one step per line as "Title|Body text" — step numbers are assigned by position
export const howItWorksToText = (p?: Product | null) => (p?.howItWorks ?? []).map((s) => `${s.title}|${s.body}`).join("\n");
export const textToHowItWorks = (v: string) => v.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, i) => { const [title, ...rest] = line.split("|"); return { step: i + 1, title: title.trim(), body: rest.join("|").trim() }; }).filter((x) => x.title && x.body);
// faqs: one Q&A per line as "Question|Answer"
export const faqsToText = (p?: Product | null) => (p?.faqs ?? []).map((f) => `${f.question}|${f.answer}`).join("\n");
export const textToFaqs = (v: string) => v.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => { const [question, ...rest] = line.split("|"); return { question: question.trim(), answer: rest.join("|").trim() }; }).filter((x) => x.question && x.answer);
export const parsePipeItem = (value: string) => { const [primary, ...rest] = value.split("|"); return { primary: primary?.trim() ?? "", secondary: rest.join("|").trim() }; };
export const formatPipeItem = (primary: string, secondary: string) => [primary.trim(), secondary.trim()].filter(Boolean).join("|");
export const parseNamedItems = (items?: string[]): Record<string, string> => Object.fromEntries((items ?? []).map((item) => { const [key, ...rest] = item.split("|"); return [key?.trim() ?? "", rest.join("|").trim()]; }).filter(([key, value]) => key && value)) as Record<string, string>;
export const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const buildPresetDateTimeInput = (daysAhead: number, hour: number, minute: number) => {
  const next = new Date();
  next.setDate(next.getDate() + daysAhead);
  next.setHours(hour, minute, 0, 0);
  return toDateTimeInputValue(next.toISOString());
};
export const buildOffsetDateTimeInput = (hoursAhead: number) => {
  const next = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  return toDateTimeInputValue(next.toISOString());
};
export const isSameLocalDay = _isSameLocalDay;

export const machineDetailFieldGroups = [
  {
    title: "Navigation and CTA",
    fields: [["back_link", "Back link label"], ["primary_cta", "Primary CTA"], ["secondary_cta", "Secondary CTA"], ["video_cta", "Video CTA"]]
  },
  {
    title: "Section labels",
    fields: [["overview_eyebrow", "Overview label"], ["capabilities_eyebrow", "Capabilities label"], ["use_cases_eyebrow", "Use cases label"], ["industries_eyebrow", "Industries label"], ["specs_eyebrow", "Specs label"], ["media_eyebrow", "Media label"], ["resource_eyebrow", "Resource label"], ["related_eyebrow", "Related machines label"]]
  },
  {
    title: "Section headings and body",
    fields: [["specs_title", "Specs heading"], ["media_title", "Media heading"], ["resource_title", "Resource heading"], ["resource_body", "Resource body"], ["resource_video_note", "Video note"], ["related_title", "Related machines heading"], ["related_cta", "Related CTA"]]
  },
  {
    title: "Consultation section",
    fields: [["contact_eyebrow", "Consultation eyebrow"], ["contact_title", "Consultation heading"], ["contact_body", "Consultation body"], ["contact_point_one", "Consultation point one"], ["contact_point_two", "Consultation point two"], ["consultation_eyebrow", "Form eyebrow"], ["consultation_title", "Form heading"], ["consultation_body", "Form body"], ["current_machine_label", "Current machine label"]]
  }
] as const;

export const emptyQuotationTemplateDraft = {
  title: "",
  productId: "",
  machineName: "",
  variantLabel: "",
  active: true,
  currency: "INR",
  basePrice: "On request",
  intro: "",
  scopeItems: "",
  technicalSpecifications: "",
  generalNotes: "",
  bankDetails: "",
  exclusions: "",
  deliveryNote: "",
  installationNote: "",
  warrantyNote: "",
  paymentTerms: "",
  validityNote: "",
  termsAndConditions: "",
  footerNote: "",
  companyName: "Welden Industries",
  companyAddress: "Mahamayatala (Garia), Laskarpur,\nKolkata - 700153, West Bengal",
  companyPhone: "033-24359094/5694/9830060993",
  companyWebsite: "www.welden.in"
};

export const emptyProductDraft = {
  title: "",
  slug: "",
  category: "",
  summary: "",
  detailedDescription: "",
  brochureUrl: "",
  featuredImage: "",
  heroImage: "",
  heroTitle: "",
  usp: "",
  heroImagePosition: "center center",
  videoUrl: "",
  media: "",
  capabilities: "",
  idealUseCases: "",
  industries: "",
  heroPoints: "",
  landingCardLayout: [] as Product["landingCardLayout"],
  machinePageLayout: [] as Product["machinePageLayout"],
  specs: [] as Array<{ label: string; value: string }>,
  howItWorks: [] as Array<{ step: number; title: string; body: string }>,
  faqs: [] as Array<{ question: string; answer: string }>,
  machinePageSectionOrder: [] as string[],
  published: true,
  accent: "#3b49a8"
};

export function templateToDraft(template: QuotationTemplate) {
  return {
    title: template.title,
    productId: template.productId ?? "",
    machineName: template.machineName,
    variantLabel: template.variantLabel ?? "",
    active: template.active,
    currency: template.currency,
    basePrice: template.basePrice,
    intro: template.intro,
    scopeItems: linesToText(template.scopeItems),
    technicalSpecifications: linesToText(template.technicalSpecifications),
    generalNotes: linesToText(template.generalNotes),
    bankDetails: linesToText(template.bankDetails),
    exclusions: linesToText(template.exclusions),
    deliveryNote: template.deliveryNote,
    installationNote: template.installationNote,
    warrantyNote: template.warrantyNote,
    paymentTerms: template.paymentTerms,
    validityNote: template.validityNote,
    termsAndConditions: linesToText(template.termsAndConditions),
    footerNote: template.footerNote,
    companyName: template.companyName,
    companyAddress: template.companyAddress,
    companyPhone: template.companyPhone,
    companyWebsite: template.companyWebsite
  };
}

export function buildProductPayload(draft: typeof emptyProductDraft) {
  return {
    ...draft,
    media: Array.from(new Set([draft.featuredImage.trim(), ...splitCsv(draft.media)].filter(Boolean))),
    capabilities: splitCsv(draft.capabilities),
    idealUseCases: splitCsv(draft.idealUseCases),
    industries: splitCsv(draft.industries),
    heroPoints: splitCsv(draft.heroPoints),
    landingCardLayout: draft.landingCardLayout,
    machinePageLayout: draft.machinePageLayout,
    specs: draft.specs,
    howItWorks: draft.howItWorks.map((s, i) => ({ ...s, step: i + 1 })),
    faqs: draft.faqs,
    machinePageSectionOrder: draft.machinePageSectionOrder
  };
}

export function buildQuotationTemplatePayload(draft: typeof emptyQuotationTemplateDraft, products: Product[]) {
  const linkedProduct = products.find((product) => product.id === draft.productId) ?? null;
  return {
    title: draft.title,
    productId: draft.productId || null,
    productSlug: linkedProduct?.slug ?? null,
    machineName: draft.machineName || linkedProduct?.title || "",
    variantLabel: draft.variantLabel || null,
    active: draft.active,
    currency: draft.currency,
    basePrice: draft.basePrice,
    intro: draft.intro,
    scopeItems: textToLines(draft.scopeItems),
    technicalSpecifications: textToLines(draft.technicalSpecifications),
    generalNotes: textToLines(draft.generalNotes),
    bankDetails: textToLines(draft.bankDetails),
    exclusions: textToLines(draft.exclusions),
    deliveryNote: draft.deliveryNote,
    installationNote: draft.installationNote,
    warrantyNote: draft.warrantyNote,
    paymentTerms: draft.paymentTerms,
    validityNote: draft.validityNote,
    termsAndConditions: textToLines(draft.termsAndConditions),
    footerNote: draft.footerNote,
    companyName: draft.companyName,
    companyAddress: draft.companyAddress,
    companyPhone: draft.companyPhone,
    companyWebsite: draft.companyWebsite
  };
}

export const getLeadScore = _getLeadScore;

export function getLeadNextStep(session: DashboardSnapshot["advisorSessions"][number]) {
  const stage = session.workflow?.stage ?? "new";
  if (session.quality?.riskLevel === "suspicious") return "Verify contact details";
  if (stage === "proposal_sent") return "Follow up on proposal";
  if (stage === "qualified") return "Prepare proposal";
  if (stage === "contacted") return "Advance qualification call";
  if (stage === "won") return "Handover to delivery";
  if (stage === "lost") return "Archive or re-engage later";
  if (session.diagnostics?.intent === "quote") return "Send commercial follow-up";
  if (session.escalated) return "Create engineering follow-up";
  if (!session.diagnostics?.found) return "Review manually";
  if (session.recommendation.recommendedCategory) return "Send brochure and specs";
  return "Qualify machine need";
}

export function getLeadTemperature(score: number) {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  return "Open";
}

export function getLeadQualityBadge(quality?: LeadQuality) {
  return quality?.riskLevel === "suspicious"
    ? { label: "Suspicious details", variant: "warning" as const }
    : { label: "Contact details clear", variant: "success" as const };
}

export const getLeadFirstCallState = _getLeadFirstCallState;

export const isLeadStale = _isLeadStale;

export const getLeadAttentionState = _getLeadAttentionState;

export function getLeadHealthBadges(session: DashboardSnapshot["advisorSessions"][number], staleLeadDays = 5) {
  const badges: Array<{ label: string; tone: "warning" | "danger" }> = [];
  if (session.workflow?.firstCallEscalationSentAt) {
    badges.push({ label: "Escalated", tone: "danger" });
  }
  if (isLeadStale(session, staleLeadDays)) {
    badges.push({ label: "Stale", tone: "warning" });
  }
  return badges;
}
