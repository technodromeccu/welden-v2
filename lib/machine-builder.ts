import type { LandingCardBlockType, MachineBlock, MachinePageBlockType, MachineSurface } from "./types";

export const LANDING_CARD_BLOCK_ORDER: LandingCardBlockType[] = [
  "cardMedia",
  "categoryBadge",
  "title",
  "summary",
  "usp",
  "capabilityChips",
  "primaryCta"
];

export const MACHINE_PAGE_BLOCK_ORDER: MachinePageBlockType[] = [
  "hero",
  "overview",
  "quickSpecs",
  "capabilities",
  "useCases",
  "industries",
  "howItWorks",
  "specTable",
  "gallery",
  "resourcePanel",
  "faq",
  "consultation",
  "relatedMachines"
];

const LEGACY_MACHINE_PAGE_MAP = {
  overview: ["hero", "overview", "quickSpecs"],
  capabilities: ["capabilities"],
  "use-cases": ["useCases"],
  industries: ["industries"],
  "how-it-works": ["howItWorks"],
  specs: ["specTable"],
  media: ["gallery", "resourcePanel"],
  faqs: ["faq"],
  consultation: ["consultation"],
  related: ["relatedMachines"]
} satisfies Record<string, MachinePageBlockType[]>;

type LegacyMachineSectionKey = keyof typeof LEGACY_MACHINE_PAGE_MAP;

function blockId(surface: MachineSurface, type: LandingCardBlockType | MachinePageBlockType) {
  return `${surface}:${type}`;
}

export function createMachineBlock<T extends LandingCardBlockType | MachinePageBlockType>(
  surface: MachineSurface,
  type: T,
  hidden = false
) {
  return {
    id: blockId(surface, type),
    surface,
    type,
    hidden
  } as MachineBlock;
}

export function deriveLandingCardLayout(layout?: MachineBlock[] | null) {
  const next = (layout ?? [])
    .filter((block): block is Extract<MachineBlock, { surface: "landing_card" }> => block?.surface === "landing_card" && LANDING_CARD_BLOCK_ORDER.includes(block.type as LandingCardBlockType))
    .map((block) => createMachineBlock("landing_card", block.type as LandingCardBlockType, Boolean(block.hidden)));

  if (next.length) {
    return next;
  }

  return LANDING_CARD_BLOCK_ORDER.map((type) => createMachineBlock("landing_card", type));
}

export function deriveMachinePageLayout(layout?: MachineBlock[] | null, legacySectionOrder?: string[] | null) {
  const next = (layout ?? [])
    .filter((block): block is Extract<MachineBlock, { surface: "machine_page" }> => block?.surface === "machine_page" && MACHINE_PAGE_BLOCK_ORDER.includes(block.type as MachinePageBlockType))
    .map((block) => createMachineBlock("machine_page", block.type as MachinePageBlockType, Boolean(block.hidden)));

  if (next.length) {
    return next;
  }

  const orderedTypes: MachinePageBlockType[] = [];
  const legacy = legacySectionOrder ?? [];
  for (const key of legacy) {
    const mapped = LEGACY_MACHINE_PAGE_MAP[key as LegacyMachineSectionKey] ?? [];
    for (const type of mapped) {
      if (!orderedTypes.includes(type)) {
        orderedTypes.push(type);
      }
    }
  }
  for (const type of MACHINE_PAGE_BLOCK_ORDER) {
    if (!orderedTypes.includes(type)) {
      orderedTypes.push(type);
    }
  }
  return orderedTypes.map((type) => createMachineBlock("machine_page", type));
}

export function getAvailableMachineBlocks(surface: MachineSurface, layout: MachineBlock[]) {
  const allowed = surface === "landing_card" ? LANDING_CARD_BLOCK_ORDER : MACHINE_PAGE_BLOCK_ORDER;
  const existing = new Set(
    layout
      .filter((block) => block.surface === surface)
      .map((block) => block.type)
  );
  return allowed.filter((type) => !existing.has(type as never));
}

export function moveMachineBlock(layout: MachineBlock[], dragId: string, targetId: string) {
  const dragIndex = layout.findIndex((block) => block.id === dragId);
  const targetIndex = layout.findIndex((block) => block.id === targetId);
  if (dragIndex < 0 || targetIndex < 0 || dragIndex === targetIndex) {
    return layout;
  }
  const next = [...layout];
  const [moved] = next.splice(dragIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function removeMachineBlock(layout: MachineBlock[], blockIdToRemove: string) {
  return layout.filter((block) => block.id !== blockIdToRemove);
}

export function addMachineBlock(layout: MachineBlock[], surface: MachineSurface, type: LandingCardBlockType | MachinePageBlockType) {
  const block = createMachineBlock(surface, type);
  if (layout.some((entry) => entry.id === block.id)) {
    return layout;
  }
  return [...layout, block];
}

export function updateMachineBlockVisibility(layout: MachineBlock[], blockIdToUpdate: string, hidden: boolean) {
  return layout.map((block) => block.id === blockIdToUpdate ? { ...block, hidden } : block);
}
