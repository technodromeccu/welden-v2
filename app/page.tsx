import { Instagram, Linkedin, Link2, Twitter, Youtube } from "lucide-react";
import { AdvisorWidget } from "@/components/AdvisorWidget";
import { ConsultationForm } from "@/components/ConsultationForm";
import { HeroShowcase } from "@/components/HeroShowcase";
import { MachineShowcaseCard } from "@/components/MachineShowcaseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { RevealSection, RevealItem } from "@/components/ui/RevealSection";
import { getPublicProducts } from "@/lib/machine-page";
import { ensureSiteSections } from "@/lib/site-sections";
import { readCollection } from "@/lib/store";
import type { Product, SiteSection } from "@/lib/types";

export const dynamic = "force-dynamic";

function VimeoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M21.4 6.7c-.1 2.8-2.1 6.5-6.1 11.2-4.1 4.8-7.5 7.2-10.4 7.2-1.8 0-3.3-1.7-4.6-5.1-.8-3.1-1.6-6.2-2.4-9.3-.9-3.4-1.9-5.1-3-5.1-.2 0-1 .5-2.4 1.5L-9 5.2c2.5-2.2 5-4.4 7.4-6.6 1-1 2-1.5 2.9-1.6 2.3-.2 3.7 1.3 4.2 4.6.5 3.6.9 5.9 1 6.8.6 3 1.3 4.5 2 4.5.6 0 1.6-1 2.9-3 1.3-2 2-3.5 2.1-4.6.2-1.7-.5-2.6-2.1-2.6-.8 0-1.7.2-2.6.6 1.7-5.6 5-8.3 9.9-8.2 3.6.1 5.3 2 5.2 5.6z" transform="translate(6 2) scale(0.75)" />
    </svg>
  );
}

function parseFooterLinks(section?: SiteSection) {
  return (section?.items ?? [])
    .filter((item) => !item.startsWith("social_") && !item.startsWith("custom_social_"))
    .map((item) => {
      const [label, href] = item.split("|");
      return { label: label?.trim() ?? "", href: href?.trim() ?? "#" };
    })
    .filter((item) => item.label);
}

function isVisibleAnchor(href: string, visibility: { about: boolean; machines: boolean; contact: boolean; advisor: boolean }) {
  switch (href.trim()) {
    case "#about":
    case "/#about":
      return visibility.about;
    case "#machines":
    case "/#machines":
      return visibility.machines;
    case "#contact":
    case "/#contact":
      return visibility.contact;
    case "#advisor":
    case "/#advisor":
      return visibility.advisor;
    default:
      return true;
  }
}

function parseNamedSectionItems(section?: SiteSection) {
  return Object.fromEntries(
    (section?.items ?? [])
      .filter((item) => item.includes("|"))
      .map((item) => {
        const [key, ...rest] = item.split("|");
        return [key?.trim() ?? "", rest.join("|").trim()];
      })
      .filter(([key, value]) => key && value)
  ) as Record<string, string>;
}

function parseFooterSocials(section?: SiteSection) {
  const namedItems = parseNamedSectionItems(section);
  const socials = [
    { key: "linkedin", label: "LinkedIn", href: namedItems.social_linkedin ?? "", icon: Linkedin },
    { key: "twitter", label: "Twitter", href: namedItems.social_twitter ?? "", icon: Twitter },
    { key: "instagram", label: "Instagram", href: namedItems.social_instagram ?? "", icon: Instagram },
    { key: "youtube", label: "YouTube", href: namedItems.social_youtube ?? "", icon: Youtube },
    { key: "vimeo", label: "Vimeo", href: namedItems.social_vimeo ?? "", icon: VimeoIcon },
    { key: "custom_one", label: namedItems.custom_social_one_label ?? "", href: namedItems.custom_social_one_url ?? "", icon: Link2 },
    { key: "custom_two", label: namedItems.custom_social_two_label ?? "", href: namedItems.custom_social_two_url ?? "", icon: Link2 }
  ];
  return socials.filter((item) => item.label && item.href);
}

function parseContactActions(section?: SiteSection) {
  const namedItems = Object.fromEntries(
    (section?.items ?? [])
      .filter((item) => item.includes("|"))
      .map((item) => {
        const [key, ...rest] = item.split("|");
        return [key?.trim() ?? "", rest.join("|").trim()];
      })
      .filter(([key, value]) => key && value)
  ) as Record<string, string>;

  const detailItems = (section?.items ?? []).filter((item) => !item.includes("|"));
  const whatsappNumber = (namedItems.whatsapp_number ?? "").replace(/[^\d]/g, "");

  return {
    detailItems,
    whatsappLabel: namedItems.whatsapp_label ?? "WhatsApp sales desk",
    whatsappHref: whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Welden, I would like to discuss a machine requirement.")}`
      : null
  };
}

export default async function HomePage() {
  const [products, rawSiteSections] = await Promise.all([
    readCollection<Product[]>("products"),
    readCollection<SiteSection[]>("site-sections")
  ]);
  const siteSections = ensureSiteSections(rawSiteSections);

  const liveProducts = getPublicProducts(products);
  const sectionMap = Object.fromEntries(
    siteSections
      .filter((section) => section.published !== false)
      .map((section) => [section.key, section])
  ) as Record<string, SiteSection | undefined>;

  const heroSection = sectionMap.hero;
  const aboutSection = sectionMap.about;
  const machinesSection = sectionMap.machines;
  const machineCardsSection = sectionMap.machine_cards;
  const advisorSection = sectionMap.advisor;
  const contactSection = sectionMap.contact;
  const footerSection = sectionMap.footer;
  const visibility = {
    about: Boolean(aboutSection),
    machines: Boolean(machinesSection || machineCardsSection),
    contact: Boolean(contactSection),
    advisor: Boolean(advisorSection)
  };
  const footerLinks = parseFooterLinks(footerSection).filter((item) => isVisibleAnchor(item.href, visibility));
  const footerSocials = parseFooterSocials(footerSection);
  const contactActions = parseContactActions(contactSection);

  // Hero CTA labels — editable via CMS hero section items
  const heroCopy = parseNamedSectionItems(heroSection);
  const heroCTAPrimary = heroCopy.cta_primary || "Talk to our expert";
  const heroCTASecondary = heroCopy.cta_secondary || "Explore machines";
  const heroPrimaryHref = visibility.advisor ? "#advisor" : visibility.contact ? "#contact" : visibility.machines ? "#machines" : visibility.about ? "#about" : "#top";
  const heroSecondaryHref = visibility.machines ? "#machines" : visibility.contact ? "#contact" : visibility.about ? "#about" : "#top";

  // Contact CTA + form labels — editable via CMS contact section items
  const contactCopy = parseNamedSectionItems(contactSection);
  const ctaQuote = contactCopy.cta_quote || "Request Quote";
  const ctaChatbot = contactCopy.cta_chatbot || "Open Chatbot";
  const formHeading = contactCopy.form_heading || "Contact Us";

  return (
    <>
      <SiteHeader
        products={visibility.machines ? liveProducts : []}
        showMachines={visibility.machines}
        showAbout={visibility.about}
        showContact={visibility.contact}
        primaryCtaHref={visibility.contact ? "#contact" : visibility.advisor ? "#advisor" : null}
      />
      <main>
        {heroSection ? (
          <HeroShowcase
            products={liveProducts}
            section={heroSection}
            ctaPrimary={heroCTAPrimary}
            ctaSecondary={heroCTASecondary}
            ctaPrimaryHref={heroPrimaryHref}
            ctaSecondaryHref={heroSecondaryHref}
          />
        ) : null}

        {aboutSection ? (
          <section
            id="about"
            className="border-t border-[var(--color-border)]/20 px-6 py-18 lg:px-12 lg:py-22"
            style={{
              backgroundImage: [
                "linear-gradient(135deg, rgba(20,37,63,0.07) 0%, rgba(255,255,255,0) 36%)",
                "linear-gradient(180deg, #f6f8fb 0%, #ffffff 58%, var(--color-panel) 100%)"
              ].join(", ")
            }}
          >
            <div className="mx-auto max-w-screen-2xl">
              <RevealSection className="overflow-hidden rounded-[2.4rem] border border-[var(--color-border)]/20 bg-[linear-gradient(135deg,rgba(8,24,43,0.98)_0%,rgba(16,36,60,0.96)_52%,rgba(31,55,84,0.94)_100%)] text-white shadow-[0_34px_90px_-44px_rgba(8,24,43,0.75)]">
                <div className="grid gap-0 lg:grid-cols-[0.46fr_0.54fr]">
                  <RevealItem className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-80"
                      style={{
                        backgroundImage: [
                          "radial-gradient(circle at 18% 18%, rgba(245,158,11,0.26) 0%, rgba(245,158,11,0) 34%)",
                          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
                          "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
                        ].join(", "),
                        backgroundSize: "100% 100%, 34px 34px, 34px 34px"
                      }}
                    />
                    <div className="relative">
                      <span className="eyebrow-dark">{aboutSection.eyebrow || "About Welden"}</span>
                      <h2 className="mt-6 max-w-[11ch] font-display text-4xl font-black leading-[0.96] tracking-[-0.05em] text-white sm:text-[3.4rem] lg:text-[4.3rem]">
                        {aboutSection.title || "Built for industrial lines that cannot afford drift."}
                      </h2>
                      <p className="mt-7 max-w-xl text-base leading-8 text-[var(--color-on-dark-dim)] lg:text-lg">
                        {aboutSection.body || "Welden Industries designs automation systems for idler production lines where consistency, uptime, and repeatable output matter more than generic catalog promises."}
                      </p>

                      <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-arc)]">Welden Industries</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                        <span className="text-sm font-medium text-white/78">Automation engineered for sequence, tolerance, and uptime.</span>
                      </div>
                    </div>
                  </RevealItem>

                  <RevealItem delay={0.08} className="relative border-t border-white/10 px-6 py-8 sm:px-8 sm:py-10 lg:border-l lg:border-t-0 lg:px-12 lg:py-14">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)"
                      }}
                    />
                    <div className="relative">
                      <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/58">Operational focus</div>
                          <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-[2rem]">What defines the Welden approach</div>
                        </div>
                        <div className="hidden rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 sm:inline-flex">
                          Industrial automation
                        </div>
                      </div>

                      {(aboutSection.items ?? []).length ? (
                        <div className="mt-4 divide-y divide-white/10">
                          {(aboutSection.items ?? []).slice(0, 4).map((item, index) => (
                            <div key={item} className="grid gap-3 py-5 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-5">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/7 text-[11px] font-black tracking-[0.18em] text-[var(--color-arc)]">
                                {String(index + 1).padStart(2, "0")}
                              </div>
                              <p className="max-w-2xl text-sm leading-7 text-white/82 sm:text-[0.98rem]">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-6 max-w-2xl text-sm leading-7 text-white/78">
                          Automation-first design, tighter tolerances, and a cleaner production sequence remain central to every Welden system.
                        </p>
                      )}
                    </div>
                  </RevealItem>
                </div>
              </RevealSection>
            </div>
          </section>
        ) : null}

        {/* ── Machine lineup ───────────────────────────────────── */}
        {visibility.machines ? (
          <section
            id="machines"
            className="border-t border-[var(--color-border)]/20 px-6 py-18 lg:px-12"
            style={{
              // Warm gradient base + engineering dot-grid overlay
              backgroundImage: [
                "radial-gradient(circle, rgba(161,155,143,0.28) 1.2px, transparent 1.2px)",
                "linear-gradient(180deg, var(--color-panel) 0%, #ffffff 38%)"
              ].join(", "),
              backgroundSize: "26px 26px, 100% 100%"
            }}
          >
            <div className="mx-auto max-w-screen-2xl">
              {machinesSection ? (
                <RevealSection className="grid gap-8 lg:grid-cols-[0.4fr_0.6fr] lg:items-end">
                  <RevealItem className="max-w-xl">
                    <span className="eyebrow-subtle">{machinesSection.eyebrow || "Machine lineup"}</span>
                    <h2 className="section-heading mt-5 max-w-[11ch]">
                      {machinesSection.title || "Automation systems built for repeatable industrial output."}
                    </h2>
                  </RevealItem>
                  <RevealItem delay={0.1} className="max-w-3xl lg:justify-self-end">
                    <p className="text-base leading-8 text-[var(--color-muted)] lg:text-lg">
                      {machinesSection.body || "Each machine is positioned as a production tool, not just a catalog listing."}
                    </p>
                  </RevealItem>
                </RevealSection>
              ) : null}

              {machineCardsSection && liveProducts.length ? (
                <div className={machinesSection ? "mt-16 space-y-8 border-t border-[var(--color-border)]/20 pt-10 lg:mt-20 lg:space-y-10 lg:pt-14" : "space-y-8 lg:space-y-10"}>
                  {liveProducts.map((product, index) => (
                    <RevealItem key={product.id} delay={Math.min(index * 0.06, 0.24)}>
                      <MachineShowcaseCard product={product} index={index} />
                    </RevealItem>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── Contact ──────────────────────────────────────────── */}
        {contactSection ? (
          <section
            id="contact"
            className="px-6 py-20 text-white lg:px-12"
            style={{
              // Dark navy base + subtle crosshatch in white — industrial technical feel
              backgroundColor: "var(--color-steel)",
              backgroundImage: [
                "linear-gradient(rgba(255,255,255,0.032) 1px, transparent 1px)",
                "linear-gradient(90deg, rgba(255,255,255,0.032) 1px, transparent 1px)"
              ].join(", "),
              backgroundSize: "44px 44px"
            }}
          >
            <div className="mx-auto grid max-w-screen-2xl gap-10 lg:grid-cols-[0.47fr_0.53fr] lg:items-start">
              <RevealSection>
                <RevealItem>
                  <span className="eyebrow-dark">{contactSection.eyebrow || "Consultation Desk"}</span>
                  <h2 className="mt-6 max-w-[10ch] font-display text-5xl font-black tracking-[var(--tracking-display)] text-white lg:text-[5.2rem]">
                    {contactSection.title || "Need a quote, a human response, or technical clarity on a machine?"}
                  </h2>
                  <p className="mt-7 max-w-xl text-base leading-8 text-[var(--color-on-dark-dim)]">
                    {contactSection.body || "Fill in the form or use the chatbot. We'll get back to you within 2 working days."}
                  </p>
                </RevealItem>

                <RevealItem delay={0.1}>
                  <div className="mt-10 grid gap-5 border-t border-white/10 pt-8 sm:grid-cols-2">
                    {contactActions.detailItems.slice(0, 4).map((item) => (
                      <div key={item} className="border-l-2 border-[var(--color-arc)]/60 pl-4 text-sm leading-7 text-[var(--color-on-dark-dim)]">
                        {item}
                      </div>
                    ))}
                  </div>
                </RevealItem>

                <RevealItem delay={0.18}>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <a href="#contact" className="btn-white">
                      {ctaQuote}
                    </a>
                    {advisorSection ? (
                      <a href="#advisor" className="btn-dark">
                        {ctaChatbot}
                      </a>
                    ) : null}
                    {contactActions.whatsappHref ? (
                      <a
                        href={contactActions.whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-dark"
                      >
                        {contactActions.whatsappLabel}
                      </a>
                    ) : null}
                  </div>
                </RevealItem>
              </RevealSection>

              <RevealItem delay={0.14}>
                <div className="rounded-[var(--radius-modal)] border border-white/10 bg-white p-6 text-[var(--color-forge)] shadow-[var(--shadow-modal)] lg:p-8">
                  <div className="border-b border-[var(--color-border)]/20 pb-6">
                    <h3 className="font-display text-3xl font-black tracking-[-0.04em] text-[var(--color-forge)]">
                      {formHeading}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                      Fill in your details and we&rsquo;ll get back to you within 2 working days.
                    </p>
                  </div>
                  <div className="pt-6">
                    <ConsultationForm submitLabel={contactCopy.form_submit || "Request Consultation"} chatbotLabel={contactCopy.form_chatbot_cta || "Use Chatbot Instead"} />
                  </div>
                </div>
              </RevealItem>
            </div>
          </section>
        ) : null}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      {footerSection ? (
        <footer className="border-t border-[var(--color-border)]/20 bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-6 py-8 text-sm text-[var(--color-muted)] lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div className="space-y-2">
              <div>&copy; {new Date().getFullYear()} {footerSection.title}. {footerSection.body}</div>
              {footerSocials.length ? (
                <div className="flex flex-wrap gap-3 pt-1">
                  {footerSocials.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={`${item.key}-${item.href}`}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={item.label}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)]/30 bg-white text-[var(--color-muted)] transition hover:border-[var(--color-arc)]/40 hover:text-[var(--color-forge)]"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-6 font-medium">
              {footerLinks.map((item) => (
                <a
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className="transition-colors hover:text-[var(--color-forge)]"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      ) : null}

      {advisorSection ? (
        <AdvisorWidget
          products={liveProducts}
          whatsappHref={contactActions.whatsappHref}
          whatsappLabel={contactActions.whatsappLabel}
        />
      ) : null}
    </>
  );
}
