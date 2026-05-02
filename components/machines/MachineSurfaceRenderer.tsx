import Image from "next/image";
import Link from "next/link";
import { buildMachinePageViewModel } from "@/lib/machine-page";
import { cn } from "@/lib/utils";
import type { MachineBlock, Product, SiteSection } from "@/lib/types";

function isRemoteAsset(path?: string) {
  return !!path && /^https?:\/\//.test(path);
}

type BlockInteraction = {
  editable?: boolean;
  selectedBlockId?: string | null;
  draggedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  onDragStart?: (blockId: string) => void;
  onDragEnd?: () => void;
  onMoveBlock?: (dragId: string, targetId: string) => void;
  onFieldChange?: (field: string, value: string) => void;
};

function BlockFrame({
  block,
  interaction,
  children,
  className
}: {
  block: MachineBlock;
  interaction?: BlockInteraction;
  children: React.ReactNode;
  className?: string;
}) {
  const selected = interaction?.selectedBlockId === block.id;
  const interactiveProps = interaction?.editable
    ? {
        draggable: true,
        onDragStart: () => {
          interaction?.onDragStart?.(block.id);
          interaction?.onSelectBlock?.(block.id);
        },
        onDragEnd: () => interaction?.onDragEnd?.(),
        onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
        },
        onDrop: (event: React.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          if (interaction.draggedBlockId) {
            interaction.onMoveBlock?.(interaction.draggedBlockId, block.id);
          }
        },
        onClick: () => interaction?.onSelectBlock?.(block.id)
      }
    : {};

  return (
    <div
      {...interactiveProps}
      className={cn(
        "group relative transition",
        interaction?.editable && "cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-4 hover:ring-offset-white",
        selected && "ring-2 ring-primary ring-offset-4 ring-offset-white",
        block.hidden && "opacity-45",
        className
      )}
    >
      {interaction?.editable ? (
        <>
          <div className={cn(
            "pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-slate-950/82 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {block.type}
          </div>
          <div className={cn(
            "pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            Click to edit / drag to reorder
          </div>
        </>
      ) : null}
      {children}
    </div>
  );
}

function InlineText({
  block,
  field,
  value,
  interaction,
  className,
  multiline = false,
  placeholder
}: {
  block: MachineBlock;
  field: string;
  value: string;
  interaction?: BlockInteraction;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const selected = interaction?.editable && interaction.selectedBlockId === block.id;
  if (selected && interaction?.onFieldChange) {
    if (multiline) {
      return (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => interaction.onFieldChange?.(field, event.target.value)}
          className={cn("w-full resize-none rounded-2xl border border-primary/20 bg-white/90 px-4 py-3 outline-none", className)}
          rows={4}
        />
      );
    }
    return (
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => interaction.onFieldChange?.(field, event.target.value)}
        className={cn("w-full rounded-2xl border border-primary/20 bg-white/90 px-4 py-3 outline-none", className)}
      />
    );
  }
  return <div className={className}>{value || placeholder || ""}</div>;
}

export function LandingCardSurface({
  product,
  layout,
  interaction
}: {
  product: Product;
  layout: MachineBlock[];
  interaction?: BlockInteraction;
}) {
  const image = product.featuredImage ?? product.heroImage ?? product.media?.[0] ?? "";
  const visibleBlocks = layout.filter((block) => block.surface === "landing_card");

  return (
    <article className="overflow-hidden rounded-[1.9rem] border border-outline-variant/14 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      {visibleBlocks.map((block) => {
        if (block.hidden) return null;
        switch (block.type) {
          case "cardMedia":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                {image ? (
                  <div className="relative overflow-hidden bg-surface-container-low" style={{ aspectRatio: "16/9" }}>
                    <Image src={image} alt={product.title} fill unoptimized={isRemoteAsset(image)} className="object-cover" />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-surface-container-low text-sm text-secondary">No card image</div>
                )}
              </BlockFrame>
            );
          case "categoryBadge":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction} className="px-6 pt-6">
                <div className="inline-flex rounded-full border border-primary/12 bg-primary-fixed/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  <InlineText block={block} field="category" value={product.category} interaction={interaction} placeholder="Machine category" />
                </div>
              </BlockFrame>
            );
          case "title":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction} className="px-6 pt-4">
                <InlineText block={block} field="title" value={product.title} interaction={interaction} className="text-3xl font-black tracking-[-0.04em] text-primary" placeholder="Machine title" />
              </BlockFrame>
            );
          case "summary":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction} className="px-6 pt-3">
                <InlineText block={block} field="summary" value={product.summary} interaction={interaction} className="text-base leading-8 text-secondary" multiline placeholder="Landing-page summary" />
              </BlockFrame>
            );
          case "usp":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction} className="px-6 pt-3">
                <InlineText block={block} field="usp" value={product.usp ?? ""} interaction={interaction} className="rounded-2xl bg-surface-container-low/60 px-4 py-4 text-sm font-semibold leading-7 text-on-surface" multiline placeholder="Positioning statement / USP" />
              </BlockFrame>
            );
          case "capabilityChips":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction} className="px-6 pt-4">
                <div className="flex flex-wrap gap-2">
                  {(product.capabilities ?? []).length
                    ? (product.capabilities ?? []).slice(0, 4).map((item) => (
                        <div key={item} className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface">
                          {item}
                        </div>
                      ))
                    : <div className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-secondary">No capabilities added</div>}
                </div>
              </BlockFrame>
            );
          case "primaryCta":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction} className="px-6 pb-6 pt-5">
                <div className="flex flex-wrap gap-3 border-t border-outline-variant/10 pt-5">
                  {product.slug ? (
                    <Link href={`/machines/${product.slug}`} className="btn-primary py-2.5">
                      View details
                    </Link>
                  ) : null}
                  {product.brochureUrl ? (
                    <a href={product.brochureUrl} className="btn-secondary py-2.5">
                      Download brochure
                    </a>
                  ) : null}
                  <a href="#advisor" className="btn-ghost border border-outline-variant/60 py-2.5">
                    Ask advisor
                  </a>
                </div>
              </BlockFrame>
            );
        }
      })}
    </article>
  );
}

export function MachinePageSurface({
  product,
  liveProducts,
  siteSections,
  layout,
  interaction,
  mode = "preview",
  contactFormSlot
}: {
  product: Product;
  liveProducts: Product[];
  siteSections: SiteSection[];
  layout: MachineBlock[];
  interaction?: BlockInteraction;
  mode?: "preview" | "public";
  contactFormSlot?: React.ReactNode;
}) {
  const viewModel = buildMachinePageViewModel({ product, liveProducts, siteSections });
  const { machineCopy, heroImage, heroPoints, quickSpecs, capabilities, useCases, industries, howItWorks, faqs, gallery, relatedProducts, specs } = viewModel;
  const visibleBlocks = layout.filter((block) => block.surface === "machine_page");

  return (
    <div className="space-y-5">
      {visibleBlocks.map((block) => {
        if (block.hidden) return null;
        switch (block.type) {
          case "hero":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="overflow-hidden rounded-[2rem] border border-outline-variant/14 bg-[linear-gradient(180deg,#eff4f8_0%,#ffffff_100%)] p-6">
                  <div className="grid gap-5 lg:grid-cols-[0.52fr_0.48fr] lg:items-end">
                    <div>
                      <div className="inline-flex rounded-full border border-primary/10 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        {product.category || "Machine"}
                      </div>
                      <InlineText block={block} field="heroTitle" value={product.heroTitle || product.title} interaction={interaction} className="mt-4 text-4xl font-black tracking-[-0.05em] text-primary" placeholder="Hero title" />
                      <InlineText block={block} field="usp" value={product.usp || product.summary || ""} interaction={interaction} className="mt-4 text-base leading-8 text-secondary" multiline placeholder="Opening value proposition" />
                      {heroPoints.length ? (
                        <div className="mt-5 grid gap-3 border-t border-outline-variant/12 pt-5 sm:grid-cols-2">
                          {heroPoints.slice(0, 4).map((point) => <div key={point} className="border-l border-outline-variant/12 pl-3 text-xs leading-6 text-secondary">{point}</div>)}
                        </div>
                      ) : null}
                    </div>
                    <div className="overflow-hidden rounded-[1.5rem] border border-outline-variant/12 bg-white">
                      {heroImage ? <Image src={heroImage} alt={product.title} width={1200} height={960} unoptimized={isRemoteAsset(heroImage)} className="aspect-[1.14] w-full object-cover" style={{ objectPosition: product.heroImagePosition ?? "center center" }} /> : <div className="flex aspect-[1.14] items-center justify-center bg-surface-container-low text-sm text-secondary">No hero image</div>}
                    </div>
                  </div>
                </section>
              </BlockFrame>
            );
          case "overview":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="rounded-[2rem] border border-outline-variant/14 bg-white p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{machineCopy.overview_eyebrow || "Machine overview"}</div>
                  <InlineText block={block} field="detailedDescription" value={product.detailedDescription || product.summary || ""} interaction={interaction} className="mt-4 text-base leading-8 text-secondary" multiline placeholder="Machine overview" />
                </section>
              </BlockFrame>
            );
          case "quickSpecs":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="grid gap-px overflow-hidden rounded-[1.8rem] border border-outline-variant/12 bg-outline-variant/12 sm:grid-cols-2">
                  {quickSpecs.length
                    ? quickSpecs.map((spec) => (
                        <div key={spec.label} className="bg-white px-5 py-5">
                          <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{spec.label}</div>
                          <div className="mt-2 text-base font-black text-primary">{spec.value}</div>
                        </div>
                      ))
                    : <div className="bg-white px-5 py-8 text-center text-sm text-secondary sm:col-span-2">Add specs to show quick facts.</div>}
                </section>
              </BlockFrame>
            );
          case "capabilities":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="rounded-[1.8rem] border border-outline-variant/12 bg-surface-container-low/30 p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{machineCopy.capabilities_eyebrow || "Core advantages"}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {capabilities.length
                      ? capabilities.map((item) => <div key={item} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-on-surface">{item}</div>)
                      : <div className="rounded-xl bg-white px-4 py-3 text-sm text-secondary sm:col-span-2">No capabilities added</div>}
                  </div>
                </section>
              </BlockFrame>
            );
          case "useCases":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="rounded-[1.8rem] border border-outline-variant/12 bg-white p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{machineCopy.use_cases_eyebrow || "Best fit"}</div>
                  <div className="mt-4 space-y-3">
                    {useCases.length
                      ? useCases.map((item) => <div key={item} className="border-l border-outline-variant/14 pl-4 text-sm leading-7 text-on-surface">{item}</div>)
                      : <div className="text-sm text-secondary">No use cases added</div>}
                  </div>
                </section>
              </BlockFrame>
            );
          case "industries":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="rounded-[1.8rem] border border-outline-variant/12 bg-white p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{machineCopy.industries_eyebrow || "Industries served"}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {industries.length
                      ? industries.map((item) => <div key={item} className="rounded-xl border border-outline-variant/12 bg-surface-container-low/50 px-4 py-3 text-sm font-semibold text-primary">{item}</div>)
                      : <div className="text-sm text-secondary sm:col-span-2">No industries added</div>}
                  </div>
                </section>
              </BlockFrame>
            );
          case "howItWorks":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {howItWorks.length
                    ? howItWorks.map((step) => (
                        <div key={step.step} className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5">
                          <div className="text-[2rem] font-black leading-none text-primary/10">{String(step.step).padStart(2, "0")}</div>
                          <div className="mt-4 text-base font-black tracking-tight text-primary">{step.title}</div>
                          <div className="mt-3 text-sm leading-7 text-secondary">{step.body}</div>
                        </div>
                      ))
                    : <div className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5 text-sm text-secondary sm:col-span-2 lg:col-span-4">No process steps added</div>}
                </section>
              </BlockFrame>
            );
          case "specTable":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="overflow-hidden rounded-[1.8rem] border border-outline-variant/12 bg-white">
                  <div className="border-b border-outline-variant/10 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-secondary">{machineCopy.specs_title || "Technical specifications"}</div>
                  <div className="divide-y divide-outline-variant/10">
                    {specs.length
                      ? specs.map((spec) => (
                          <div key={spec.label} className="grid gap-2 px-5 py-4 sm:grid-cols-[0.42fr_0.58fr]">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{spec.label}</div>
                            <div className="text-sm font-semibold text-on-surface">{spec.value}</div>
                          </div>
                        ))
                      : <div className="px-5 py-8 text-sm text-secondary">No specs added</div>}
                  </div>
                </section>
              </BlockFrame>
            );
          case "gallery":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="grid gap-4 sm:grid-cols-2">
                  {gallery.length
                    ? gallery.slice(0, 4).map((item, index) => (
                        <div key={`${item}-${index}`} className="overflow-hidden rounded-[1.5rem] border border-outline-variant/12 bg-white p-3">
                          <Image src={item} alt={`${product.title} gallery ${index + 1}`} width={960} height={857} unoptimized={isRemoteAsset(item)} className="aspect-[1.15] w-full rounded-[1rem] object-cover" />
                        </div>
                      ))
                    : <div className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5 text-sm text-secondary sm:col-span-2">No gallery images added</div>}
                </section>
              </BlockFrame>
            );
          case "resourcePanel":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="rounded-[1.8rem] border border-outline-variant/12 bg-white p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{machineCopy.resource_eyebrow || "Resource access"}</div>
                  <div className="mt-3 text-2xl font-black tracking-tight text-primary">{machineCopy.resource_title || "Commercial and technical handoff."}</div>
                  <div className="mt-3 text-sm leading-7 text-secondary">{machineCopy.resource_body || "Brochure, supporting media, and the next step for machine review."}</div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {product.brochureUrl ? <a href={product.brochureUrl} className="btn-navy">Download brochure</a> : null}
                    {product.videoUrl ? <a href={product.videoUrl} className="btn-secondary">Open video</a> : null}
                    {!product.brochureUrl && !product.videoUrl ? <div className="text-sm text-secondary">Add a brochure or video to populate this block.</div> : null}
                  </div>
                </section>
              </BlockFrame>
            );
          case "faq":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="grid gap-4 lg:grid-cols-2">
                  {faqs.length
                    ? faqs.map((faq, index) => (
                        <div key={index} className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5">
                          <div className="text-base font-black tracking-tight text-primary">{faq.question}</div>
                          <div className="mt-3 text-sm leading-7 text-secondary">{faq.answer}</div>
                        </div>
                      ))
                    : <div className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5 text-sm text-secondary lg:col-span-2">No FAQs added</div>}
                </section>
              </BlockFrame>
            );
          case "consultation":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                {mode === "public" && contactFormSlot ? (
                  <section className="rounded-[2rem] bg-[linear-gradient(180deg,#093667_0%,#082a53_100%)] px-6 py-8 text-white lg:px-8 lg:py-10">
                    <div className="grid gap-8 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary-fixed">{machineCopy.contact_eyebrow || "Consultation desk"}</div>
                        <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{machineCopy.contact_title || `Talk through ${product.shortName || product.title}`}</div>
                        <div className="mt-3 text-sm leading-7 text-primary-fixed/84">{machineCopy.contact_body || "Use the consultation route for commercial or technical follow-up."}</div>
                      </div>
                      <div className="rounded-[1.6rem] border border-white/12 bg-white/96 p-5 text-on-surface shadow-[0_26px_70px_rgba(1,19,41,0.25)] lg:p-6">
                        <div className="mb-4 rounded-[1.2rem] border border-outline-variant/12 bg-surface-container-low px-5 py-4">
                          <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{machineCopy.current_machine_label || "Current machine"}</div>
                          <div className="mt-2 text-lg font-black tracking-tight text-primary">{product.title}</div>
                        </div>
                        {contactFormSlot}
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-[2rem] bg-[linear-gradient(180deg,#093667_0%,#082a53_100%)] px-6 py-8 text-white">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary-fixed">{machineCopy.contact_eyebrow || "Consultation desk"}</div>
                    <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{machineCopy.contact_title || `Talk through ${product.shortName || product.title}`}</div>
                    <div className="mt-3 text-sm leading-7 text-primary-fixed/84">{machineCopy.contact_body || "Use the consultation route for commercial or technical follow-up."}</div>
                  </section>
                )}
              </BlockFrame>
            );
          case "relatedMachines":
            return (
              <BlockFrame key={block.id} block={block} interaction={interaction}>
                <section className="rounded-[1.8rem] border border-outline-variant/12 bg-white p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{machineCopy.related_eyebrow || "Related machines"}</div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {relatedProducts.length
                      ? relatedProducts.map((item) => (
                          <div key={item.id} className="rounded-[1.4rem] border border-outline-variant/10 bg-surface-container-low/40 p-4">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{item.category}</div>
                            {mode === "public" && item.slug ? (
                              <Link href={`/machines/${item.slug}`} className="mt-2 block text-base font-black tracking-tight text-primary transition hover:text-primary/80">
                                {item.title}
                              </Link>
                            ) : (
                              <div className="mt-2 text-base font-black tracking-tight text-primary">{item.title}</div>
                            )}
                          </div>
                        ))
                      : <div className="text-sm text-secondary sm:col-span-3">No related published machines available</div>}
                  </div>
                </section>
              </BlockFrame>
            );
        }
      })}
    </div>
  );
}
