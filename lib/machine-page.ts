import { normalizeProduct } from "./products";
import type { Product, SiteSection } from "./types";

export const DEFAULT_MACHINE_PAGE_SECTION_ORDER = [
  "overview",
  "capabilities",
  "use-cases",
  "industries",
  "how-it-works",
  "specs",
  "media",
  "faqs",
  "consultation"
] as const;

export function normalizeMachinePageSectionOrder(sectionOrder?: string[]) {
  const valid = new Set(DEFAULT_MACHINE_PAGE_SECTION_ORDER);
  const next = (sectionOrder ?? []).filter((entry): entry is (typeof DEFAULT_MACHINE_PAGE_SECTION_ORDER)[number] => valid.has(entry as (typeof DEFAULT_MACHINE_PAGE_SECTION_ORDER)[number]));
  for (const key of DEFAULT_MACHINE_PAGE_SECTION_ORDER) {
    if (!next.includes(key)) {
      next.push(key);
    }
  }
  return next;
}

export function parseNamedItems(section?: SiteSection) {
  return Object.fromEntries(
    (section?.items ?? [])
      .map((item) => {
        const [key, ...rest] = item.split("|");
        return [key?.trim() ?? "", rest.join("|").trim()] as const;
      })
      .filter(([key, value]) => key && value)
  ) as Record<string, string>;
}

export function parseFooterLinks(section?: SiteSection) {
  return (section?.items ?? [])
    .map((item) => {
      const [label, href] = item.split("|");
      return {
        label: label?.trim() ?? "",
        href: href?.trim() ?? "#"
      };
    })
    .filter((item) => item.label);
}

export function getPublicProducts(products: Product[]) {
  return products
    .map((product) => normalizeProduct(product))
    .filter((product) => product.published && product.slug?.trim() && product.title?.trim());
}

export function buildMachinePageViewModel(input: {
  product: Product;
  liveProducts: Product[];
  siteSections: SiteSection[];
}) {
  const product = normalizeProduct(input.product);
  const sectionMap = Object.fromEntries(input.siteSections.map((section) => [section.key, section])) as Record<string, SiteSection | undefined>;
  const machineDetailsSection = sectionMap.machine_details;
  const footerSection = sectionMap.footer;
  const contactSection = sectionMap.contact;

  return {
    product,
    sectionMap,
    machineCopy: parseNamedItems(machineDetailsSection),
    footerLinks: parseFooterLinks(footerSection),
    footerSection,
    contactSection,
    heroImage: product.heroImage ?? product.featuredImage ?? product.media[0] ?? "",
    gallery: Array.from(new Set([product.featuredImage, ...(product.media ?? [])].filter((item): item is string => Boolean(item)))),
    specs: product.specs ?? [],
    capabilities: product.capabilities ?? [],
    useCases: product.idealUseCases ?? [],
    industries: product.industries ?? [],
    quickSpecs: (product.specs ?? []).slice(0, 4),
    heroPoints: product.heroPoints ?? [],
    relatedProducts: input.liveProducts.filter((item) => item.id !== product.id).slice(0, 3),
    howItWorks: product.howItWorks ?? [],
    faqs: product.faqs ?? [],
    orderedSectionKeys: normalizeMachinePageSectionOrder(product.machinePageSectionOrder)
  };
}
