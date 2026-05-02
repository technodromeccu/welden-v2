import { deriveLandingCardLayout, deriveMachinePageLayout } from "./machine-builder.ts";
import type { MachineBlock, Product, ProductDraftPayload, ProductDraftRecord } from "./types";

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeSpecs(value: unknown) {
  return Array.isArray(value)
    ? value.map((spec) => ({
        label: typeof spec?.label === "string" ? spec.label : "",
        value: typeof spec?.value === "string" ? spec.value : ""
      }))
    : [];
}

function normalizeHowItWorks(value: unknown) {
  return Array.isArray(value)
    ? value.map((step, index) => ({
        step: typeof step?.step === "number" ? step.step : index + 1,
        title: typeof step?.title === "string" ? step.title : "",
        body: typeof step?.body === "string" ? step.body : ""
      }))
    : [];
}

function normalizeFaqs(value: unknown) {
  return Array.isArray(value)
    ? value.map((faq) => ({
        question: typeof faq?.question === "string" ? faq.question : "",
        answer: typeof faq?.answer === "string" ? faq.answer : ""
      }))
    : [];
}

function normalizeLayout(value: unknown) {
  return Array.isArray(value)
    ? value.filter((block): block is MachineBlock => typeof block === "object" && block !== null && typeof (block as MachineBlock).id === "string")
    : [];
}

export function normalizeProductDraftPayload(draft?: Partial<ProductDraftPayload> | null): ProductDraftPayload {
  const media = normalizeStringArray(draft?.media);
  const legacySectionOrder = normalizeStringArray(draft?.machinePageSectionOrder);

  return {
    title: normalizeString(draft?.title),
    slug: normalizeString(draft?.slug),
    category: normalizeString(draft?.category),
    summary: normalizeString(draft?.summary),
    capabilities: normalizeStringArray(draft?.capabilities),
    idealUseCases: normalizeStringArray(draft?.idealUseCases),
    industries: normalizeStringArray(draft?.industries),
    media,
    featuredImage: normalizeString(draft?.featuredImage, media[0] ?? ""),
    heroImage: normalizeString(draft?.heroImage, normalizeString(draft?.featuredImage, media[0] ?? "")),
    videoUrl: normalizeString(draft?.videoUrl),
    brochureUrl: normalizeString(draft?.brochureUrl),
    published: typeof draft?.published === "boolean" ? draft.published : false,
    accent: normalizeString(draft?.accent, "#3b49a8"),
    usp: normalizeString(draft?.usp),
    heroImagePosition: normalizeString(draft?.heroImagePosition, "center center"),
    shortName: normalizeString(draft?.shortName),
    heroTitle: normalizeString(draft?.heroTitle),
    heroPoints: normalizeStringArray(draft?.heroPoints),
    detailedDescription: normalizeString(draft?.detailedDescription),
    landingCardLayout: deriveLandingCardLayout(normalizeLayout(draft?.landingCardLayout)),
    machinePageLayout: deriveMachinePageLayout(normalizeLayout(draft?.machinePageLayout), legacySectionOrder),
    machinePageSectionOrder: legacySectionOrder,
    specs: normalizeSpecs(draft?.specs),
    howItWorks: normalizeHowItWorks(draft?.howItWorks),
    faqs: normalizeFaqs(draft?.faqs)
  };
}

export function normalizeProduct(product: Product): Product {
  const normalized = normalizeProductDraftPayload(product);

  return {
    ...product,
    ...normalized,
    createdAt: typeof product.createdAt === "string" ? product.createdAt : undefined,
    updatedAt: typeof product.updatedAt === "string" ? product.updatedAt : undefined
  };
}

export function productToDraftPayload(product: Product): ProductDraftPayload {
  const normalized = normalizeProduct(product);
  return {
    title: normalized.title,
    slug: normalized.slug,
    category: normalized.category,
    summary: normalized.summary,
    capabilities: normalized.capabilities,
    idealUseCases: normalized.idealUseCases,
    industries: normalized.industries,
    media: normalized.media,
    featuredImage: normalized.featuredImage,
    heroImage: normalized.heroImage,
    videoUrl: normalized.videoUrl,
    brochureUrl: normalized.brochureUrl,
    published: normalized.published,
    accent: normalized.accent,
    usp: normalized.usp,
    heroImagePosition: normalized.heroImagePosition,
    shortName: normalized.shortName,
    heroTitle: normalized.heroTitle,
    heroPoints: normalized.heroPoints,
    detailedDescription: normalized.detailedDescription,
    landingCardLayout: normalized.landingCardLayout,
    machinePageLayout: normalized.machinePageLayout,
    machinePageSectionOrder: normalized.machinePageSectionOrder,
    specs: normalized.specs,
    howItWorks: normalized.howItWorks,
    faqs: normalized.faqs
  };
}

export function normalizeProductDraftRecord(record?: Partial<ProductDraftRecord> | null): ProductDraftRecord | null {
  if (!record?.productId || typeof record.productId !== "string") {
    return null;
  }

  return {
    productId: record.productId,
    draft: normalizeProductDraftPayload(record.draft),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    updatedByUserId: typeof record.updatedByUserId === "string" ? record.updatedByUserId : "",
    publishedSnapshotHash: typeof record.publishedSnapshotHash === "string" ? record.publishedSnapshotHash : null
  };
}

export function mergeProductWithDraft(product: Product, draftRecord?: ProductDraftRecord | null): Product {
  if (!draftRecord) {
    return normalizeProduct(product);
  }

  return normalizeProduct({
    ...product,
    ...normalizeProductDraftPayload(draftRecord.draft)
  });
}
