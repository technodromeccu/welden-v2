import type { SiteSection } from "@/lib/types";

const ABOUT_SECTION: SiteSection = {
  key: "about",
  eyebrow: "About Welden",
  title: "Built around dependable industrial output, not brochure claims.",
  body: "Welden Industries focuses on automation equipment for conveyor idler and allied production lines. We design machines that reduce manual variation, improve cycle consistency, and give production teams a more repeatable path from cutting and boring to welding and bearing assembly.",
  items: [
    "Automation-first machine design for repeatable, production-floor performance.",
    "Built for manufacturers that need tighter tolerances, cleaner process flow, and less dependency on manual skill variation.",
    "Machine range covers pipe cutting, idler welding, double end boring, and bearing pushing.",
    "Commercial and technical discussions can start on the site and continue through tracked follow-up."
  ],
  published: true
};

const MACHINE_CARDS_SECTION: SiteSection = {
  key: "machine_cards",
  title: "Machine cards",
  eyebrow: "Landing page catalog",
  body: "Controls whether the published machine cards appear on the homepage.",
  items: [],
  published: true
};

export function ensureSiteSections(sections: SiteSection[]) {
  const next = sections.map((section) =>
    section.key === "about" ? { ...section, published: true } : section
  );
  const hasAbout = next.some((section) => section.key === "about");
  const hasMachineCards = next.some((section) => section.key === "machine_cards");

  if (!hasAbout) {
    const insertAfterHero = next.findIndex((section) => section.key === "hero");
    if (insertAfterHero >= 0) {
      next.splice(insertAfterHero + 1, 0, ABOUT_SECTION);
    } else {
      next.unshift(ABOUT_SECTION);
    }
  }

  if (!hasMachineCards) {
    const insertAfterMachines = next.findIndex((section) => section.key === "machines");
    if (insertAfterMachines >= 0) {
      next.splice(insertAfterMachines + 1, 0, MACHINE_CARDS_SECTION);
    } else {
      next.push(MACHINE_CARDS_SECTION);
    }
  }

  return next;
}
