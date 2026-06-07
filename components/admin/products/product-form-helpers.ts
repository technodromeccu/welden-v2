import { buildProductPayload, emptyProductDraft } from "@/components/admin/shared/admin-panel-helpers";
import { mergeProductWithDraft, normalizeProduct } from "@/lib/products";
import type {
  LandingCardBlockType,
  MachineBlock,
  MachinePageBlockType,
  Product,
  ProductDraftRecord
} from "@/lib/types";

// Pure helpers + label maps extracted verbatim from ProductsMachinePagesView.tsx
// (behavior-preserving "Move" refactor — no logic changes).

export type ProductFormDraft = typeof emptyProductDraft;

export const LANDING_BLOCK_LABELS: Record<LandingCardBlockType, string> = {
  cardMedia: "Card media",
  categoryBadge: "Category badge",
  title: "Headline",
  summary: "Summary",
  usp: "Positioning statement",
  capabilityChips: "Capability chips",
  primaryCta: "Primary actions"
};

export const MACHINE_PAGE_BLOCK_LABELS: Record<MachinePageBlockType, string> = {
  hero: "Hero",
  overview: "Overview",
  quickSpecs: "Quick specs",
  capabilities: "Capabilities",
  useCases: "Use cases",
  industries: "Industries",
  howItWorks: "How it works",
  specTable: "Specification table",
  gallery: "Gallery",
  resourcePanel: "Resource panel",
  faq: "FAQ",
  consultation: "Consultation",
  relatedMachines: "Related machines"
};

export function getBlockLabel(block: MachineBlock | null) {
  if (!block) return "Canvas";
  return block.surface === "landing_card"
    ? LANDING_BLOCK_LABELS[block.type]
    : MACHINE_PAGE_BLOCK_LABELS[block.type];
}

export function getBlockSupportText(block: MachineBlock) {
  switch (block.type) {
    case "cardMedia":
      return "Main machine image shown on the homepage card.";
    case "categoryBadge":
      return "Small category chip above the machine title.";
    case "title":
      return "Primary machine name on the landing page.";
    case "summary":
      return "Short card summary for fast scanning.";
    case "usp":
      return "Short positioning statement or commercial angle.";
    case "capabilityChips":
      return "Compact highlights used on the landing page card.";
    case "primaryCta":
      return "Buttons for details, brochure, and advisor entry.";
    case "hero":
      return "Top hero section on the machine detail page.";
    case "overview":
      return "Main explanatory body for the machine.";
    case "quickSpecs":
      return "Short spec tiles near the top of the page.";
    case "capabilities":
      return "Advantage cards and buyer-facing differentiators.";
    case "useCases":
      return "Application-fit section for the machine.";
    case "industries":
      return "Industry chips and market relevance.";
    case "howItWorks":
      return "Ordered process or workflow steps.";
    case "specTable":
      return "Full technical specification table.";
    case "gallery":
      return "Supporting machine images and visuals.";
    case "resourcePanel":
      return "Brochure and video access block.";
    case "faq":
      return "Questions and answers for objections or details.";
    case "consultation":
      return "Consultation handoff and CTA section.";
    case "relatedMachines":
      return "Cross-links to other published machines.";
  }
}

export function isSimpleQuickEditBlock(block: MachineBlock | null) {
  if (!block) return false;
  return ["categoryBadge", "title", "summary", "usp", "overview"].includes(block.type);
}

export function normalizeProductDraftForm(draft?: ProductFormDraft | null): ProductFormDraft {
  return {
    ...emptyProductDraft,
    ...draft,
    title: typeof draft?.title === "string" ? draft.title : "",
    slug: typeof draft?.slug === "string" ? draft.slug : "",
    category: typeof draft?.category === "string" ? draft.category : "",
    summary: typeof draft?.summary === "string" ? draft.summary : "",
    detailedDescription: typeof draft?.detailedDescription === "string" ? draft.detailedDescription : "",
    brochureUrl: typeof draft?.brochureUrl === "string" ? draft.brochureUrl : "",
    featuredImage: typeof draft?.featuredImage === "string" ? draft.featuredImage : "",
    heroImage: typeof draft?.heroImage === "string" ? draft.heroImage : "",
    heroTitle: typeof draft?.heroTitle === "string" ? draft.heroTitle : "",
    usp: typeof draft?.usp === "string" ? draft.usp : "",
    heroImagePosition: typeof draft?.heroImagePosition === "string" ? draft.heroImagePosition : "center center",
    videoUrl: typeof draft?.videoUrl === "string" ? draft.videoUrl : "",
    media: typeof draft?.media === "string" ? draft.media : "",
    capabilities: typeof draft?.capabilities === "string" ? draft.capabilities : "",
    idealUseCases: typeof draft?.idealUseCases === "string" ? draft.idealUseCases : "",
    industries: typeof draft?.industries === "string" ? draft.industries : "",
    heroPoints: typeof draft?.heroPoints === "string" ? draft.heroPoints : "",
    landingCardLayout: Array.isArray(draft?.landingCardLayout) ? draft.landingCardLayout : [],
    machinePageLayout: Array.isArray(draft?.machinePageLayout) ? draft.machinePageLayout : [],
    specs: Array.isArray(draft?.specs) ? draft.specs : [],
    howItWorks: Array.isArray(draft?.howItWorks) ? draft.howItWorks : [],
    faqs: Array.isArray(draft?.faqs) ? draft.faqs : [],
    machinePageSectionOrder: Array.isArray(draft?.machinePageSectionOrder) ? draft.machinePageSectionOrder : [],
    published: typeof draft?.published === "boolean" ? draft.published : false,
    accent: typeof draft?.accent === "string" ? draft.accent : "#3b49a8"
  };
}

export function toPreviewProduct(draft: ProductFormDraft, baseProduct?: Product | null) {
  const payload = buildProductPayload(normalizeProductDraftForm(draft));
  if (baseProduct) {
    return mergeProductWithDraft(baseProduct, {
      productId: baseProduct.id,
      draft: payload,
      updatedAt: new Date().toISOString(),
      updatedByUserId: "preview",
      publishedSnapshotHash: null
    });
  }

  return normalizeProduct({
    id: "preview-product",
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export function getMachineStatus(product: Product, draftRecord?: ProductDraftRecord | null) {
  if (draftRecord && product.published) {
    return { label: "Needs publish", tone: "bg-amber-100 text-amber-800" };
  }
  if (draftRecord && !product.published) {
    return { label: "Draft", tone: "bg-sky-100 text-sky-800" };
  }
  if (product.published) {
    return { label: "Live", tone: "bg-emerald-100 text-emerald-800" };
  }
  return { label: "Unpublished", tone: "bg-slate-100 text-slate-600" };
}

export function getCompleteness(product: Product) {
  const checks = [
    Boolean(product.title.trim()),
    Boolean(product.slug.trim()),
    Boolean(product.summary.trim()),
    Boolean((product.heroImage ?? product.featuredImage ?? product.media?.[0])?.trim()),
    Boolean(product.detailedDescription?.trim()),
    Boolean((product.specs ?? []).length),
    Boolean((product.faqs ?? []).length)
  ];
  const complete = checks.filter(Boolean).length;
  return {
    complete,
    total: checks.length,
    percent: Math.round((complete / checks.length) * 100)
  };
}

export function getChangedFields(product: Product | null, draft: ProductFormDraft) {
  if (!product) return [];
  const published = buildProductPayload(normalizeProductDraftForm({
    ...emptyProductDraft,
    ...product,
    media: (product.media ?? []).filter((item) => item !== product.featuredImage).join(", "),
    capabilities: (product.capabilities ?? []).join(", "),
    idealUseCases: (product.idealUseCases ?? []).join(", "),
    industries: (product.industries ?? []).join(", "),
    heroPoints: (product.heroPoints ?? []).join(", ")
  }));
  const current = buildProductPayload(normalizeProductDraftForm(draft));
  const fields: Array<[keyof typeof current, string]> = [
    ["title", "Title"],
    ["slug", "Slug"],
    ["category", "Category"],
    ["summary", "Summary"],
    ["usp", "USP"],
    ["heroTitle", "Hero headline"],
    ["detailedDescription", "Detail body"],
    ["heroPoints", "Hero points"],
    ["capabilities", "Capabilities"],
    ["idealUseCases", "Use cases"],
    ["industries", "Industries"],
    ["specs", "Specs"],
    ["howItWorks", "How it works"],
    ["faqs", "FAQs"],
    ["featuredImage", "Card image"],
    ["heroImage", "Hero image"],
    ["media", "Gallery"],
    ["brochureUrl", "Brochure"],
    ["videoUrl", "Video"],
    ["landingCardLayout", "Landing card layout"],
    ["machinePageLayout", "Machine page layout"],
    ["published", "Publish intent"]
  ];

  return fields
    .filter(([key]) => JSON.stringify(current[key]) !== JSON.stringify(published[key]))
    .map(([, label]) => label);
}
