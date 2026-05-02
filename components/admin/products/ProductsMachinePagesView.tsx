"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Eye,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  Monitor,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  SquarePen,
  Trash2,
  Wand2,
  EyeOff,
  X
} from "lucide-react";
import {
  addMachineBlock,
  getAvailableMachineBlocks,
  moveMachineBlock,
  removeMachineBlock,
  updateMachineBlockVisibility
} from "@/lib/machine-builder";
import { mergeProductWithDraft, normalizeProduct } from "@/lib/products";
import { buildProductPayload, emptyProductDraft, machineDetailFieldGroups, splitCsv } from "@/components/admin/shared/admin-panel-helpers";
import { LandingCardSurface, MachinePageSurface } from "@/components/machines/MachineSurfaceRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  LandingCardBlockType,
  MachineBlock,
  MachinePageBlockType,
  MachineSurface,
  Product,
  ProductDraftRecord
} from "@/lib/types";

type ProductFormDraft = typeof emptyProductDraft;
type PreviewDevice = "desktop" | "mobile";

const SURFACE_COPY: Record<MachineSurface, { label: string; eyebrow: string; description: string; audience: string }> = {
  landing_card: {
    label: "Landing Page Card",
    eyebrow: "Homepage surface",
    description: "This is the machine card buyers see in the machine lineup on the public landing page.",
    audience: "Best for scannability, first impression, and click-through messaging."
  },
  machine_page: {
    label: "Machine Detail Page",
    eyebrow: "Deep-dive surface",
    description: "This is the full `/machines/[slug]` page buyers open when they want deeper technical and commercial context.",
    audience: "Best for buyer education, technical confidence, and consultation conversion."
  }
};

const LANDING_BLOCK_LABELS: Record<LandingCardBlockType, string> = {
  cardMedia: "Card media",
  categoryBadge: "Category badge",
  title: "Headline",
  summary: "Summary",
  usp: "Positioning statement",
  capabilityChips: "Capability chips",
  primaryCta: "Primary actions"
};

const MACHINE_PAGE_BLOCK_LABELS: Record<MachinePageBlockType, string> = {
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

function getBlockLabel(block: MachineBlock | null) {
  if (!block) return "Canvas";
  return block.surface === "landing_card"
    ? LANDING_BLOCK_LABELS[block.type]
    : MACHINE_PAGE_BLOCK_LABELS[block.type];
}

function getBlockSupportText(block: MachineBlock) {
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

function isSimpleQuickEditBlock(block: MachineBlock | null) {
  if (!block) return false;
  return ["categoryBadge", "title", "summary", "usp", "overview"].includes(block.type);
}

function normalizeProductDraftForm(draft?: ProductFormDraft | null): ProductFormDraft {
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

function toPreviewProduct(draft: ProductFormDraft, baseProduct?: Product | null) {
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

function getMachineStatus(product: Product, draftRecord?: ProductDraftRecord | null) {
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

function getCompleteness(product: Product) {
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

function getChangedFields(product: Product | null, draft: ProductFormDraft) {
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

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{label}</div>
        {hint ? <div className="mt-1 text-xs leading-5 text-secondary">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ImageAssetEditor({
  label,
  hint,
  value,
  onChange,
  onUpload,
  uploading,
  placeholder,
  aspectClassName = "aspect-[16/9]"
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  placeholder: string;
  aspectClassName?: string;
}) {
  return (
    <FieldGroup label={label} hint={hint}>
      <div className="overflow-hidden rounded-2xl border border-outline-variant/12 bg-white">
        <div className={cn("relative overflow-hidden bg-surface-container-low", aspectClassName)}>
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-secondary">
              No image selected yet.
            </div>
          )}
        </div>
        <div className="grid gap-3 border-t border-outline-variant/10 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline-variant/20 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary-fixed/20 whitespace-nowrap">
            <ImagePlus className="h-3.5 w-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
            {uploading ? "Uploading..." : "Upload"}
          </label>
        </div>
      </div>
    </FieldGroup>
  );
}

function ReorderableStringList({
  title,
  hint,
  value,
  onChange,
  placeholder
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const items = splitCsv(value);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function updateItem(index: number, nextValue: string) {
    onChange(items.map((item, current) => current === index ? nextValue : item).join(", "));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, current) => current !== index).join(", "));
  }

  function addItem() {
    onChange([...items, ""].join(", "));
  }

  function moveItem(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
      setDraggedIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.join(", "));
    setDraggedIndex(null);
  }

  return (
    <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-low/30 p-4">
      <div className="mb-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">{title}</div>
        <div className="mt-1 text-xs leading-5 text-secondary">{hint}</div>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragEnd={() => setDraggedIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedIndex !== null) {
                moveItem(draggedIndex, index);
              }
            }}
            className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl bg-white p-2 shadow-sm transition", draggedIndex === index && "bg-primary-fixed/25")}
          >
            <button type="button" className="flex h-9 w-9 cursor-grab items-center justify-center rounded-lg text-secondary transition hover:bg-surface-container-low hover:text-primary">
              <GripVertical className="h-4 w-4" />
            </button>
            <Input value={item} placeholder={placeholder} onChange={(event) => updateItem(index, event.target.value)} />
            <button type="button" onClick={() => removeItem(index)} className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition hover:bg-rose-50 hover:text-rose-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {!items.length ? <div className="rounded-xl border border-dashed border-outline-variant/30 py-5 text-center text-sm text-secondary">No items yet.</div> : null}
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addItem}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add item
      </Button>
    </div>
  );
}

function GalleryAssetEditor({
  value,
  onChange,
  onUpload,
  uploading
}: {
  value: string;
  onChange: (value: string) => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  const images = splitCsv(value);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function updateImage(index: number, nextValue: string) {
    onChange(images.map((item, current) => current === index ? nextValue : item).join(", "));
  }

  function removeImage(index: number) {
    onChange(images.filter((_, current) => current !== index).join(", "));
  }

  function addImage() {
    onChange([...images, ""].join(", "));
  }

  function moveImage(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) {
      setDraggedIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.join(", "));
    setDraggedIndex(null);
  }

  return (
    <FieldGroup label="Gallery" hint="Manage machine gallery images visually. Drag to control their order on the page.">
      <div className="space-y-3">
        {images.length ? images.map((image, index) => (
          <div
            key={`${image}-${index}`}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragEnd={() => setDraggedIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedIndex !== null) {
                moveImage(draggedIndex, index);
              }
            }}
            className={cn(
              "grid gap-3 rounded-2xl border border-outline-variant/12 bg-white p-3 shadow-sm md:grid-cols-[132px_minmax(0,1fr)_auto]",
              draggedIndex === index && "bg-primary-fixed/25"
            )}
          >
            <div className="overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-low">
              {image ? (
                <img src={image} alt={`Gallery image ${index + 1}`} className="aspect-[4/3] h-full w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-xs text-secondary">
                  No image yet
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                <button type="button" className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-secondary transition hover:bg-surface-container-low hover:text-primary">
                  <GripVertical className="h-4 w-4" />
                </button>
                Image {index + 1}
              </div>
              <Input placeholder="/images/machines/gallery-image.png" value={image} onChange={(event) => updateImage(index, event.target.value)} />
            </div>
            <button type="button" onClick={() => removeImage(index)} className="flex h-10 w-10 items-center justify-center self-start rounded-lg text-secondary transition hover:bg-rose-50 hover:text-rose-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-outline-variant/30 py-8 text-center text-sm text-secondary">
            No gallery images yet.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" size="sm" onClick={addImage}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add image slot
          </Button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline-variant/20 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary-fixed/20 whitespace-nowrap">
            <ImagePlus className="h-3.5 w-3.5" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} disabled={uploading} />
            {uploading ? "Uploading..." : "Upload images"}
          </label>
        </div>
      </div>
    </FieldGroup>
  );
}

function SpecsEditor({
  specs,
  onChange
}: {
  specs: Array<{ label: string; value: string }>;
  onChange: (specs: Array<{ label: string; value: string }>) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function updateSpec(index: number, field: "label" | "value", value: string) {
    onChange(specs.map((spec, current) => current === index ? { ...spec, [field]: value } : spec));
  }

  function moveSpec(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= specs.length || to >= specs.length) {
      setDraggedIndex(null);
      return;
    }
    const next = [...specs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setDraggedIndex(null);
  }

  return (
    <div className="space-y-2">
      {specs.map((spec, index) => (
        <div
          key={`${spec.label}-${spec.value}-${index}`}
          draggable
          onDragStart={() => setDraggedIndex(index)}
          onDragEnd={() => setDraggedIndex(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedIndex !== null) {
              moveSpec(draggedIndex, index);
            }
          }}
          className={cn(
            "grid grid-cols-[auto_1fr_1fr_auto] gap-2 rounded-xl border border-outline-variant/12 bg-white p-3 transition",
            draggedIndex === index && "bg-primary-fixed/25"
          )}
        >
          <button type="button" className="flex h-10 w-10 cursor-grab items-center justify-center rounded-lg text-secondary transition hover:bg-surface-container-low hover:text-primary">
            <GripVertical className="h-4 w-4" />
          </button>
          <Input placeholder="Parameter" value={spec.label} onChange={(event) => updateSpec(index, "label", event.target.value)} />
          <Input placeholder="Value" value={spec.value} onChange={(event) => updateSpec(index, "value", event.target.value)} />
          <button type="button" onClick={() => onChange(specs.filter((_, current) => current !== index))} className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary transition hover:bg-rose-50 hover:text-rose-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {!specs.length ? <div className="rounded-xl border border-dashed border-outline-variant/30 py-6 text-center text-sm text-secondary">No specs yet.</div> : null}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...specs, { label: "", value: "" }])}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add spec row
      </Button>
    </div>
  );
}

function StructureOrganizer({
  surface,
  layout,
  selectedBlockId,
  draggedBlockId,
  setDraggedBlockId,
  selectBlock,
  moveBlock,
  toggleBlockVisibility,
  removeBlock,
  availableBlocks,
  addBlock,
  embedded = false
}: {
  surface: MachineSurface;
  layout: MachineBlock[];
  selectedBlockId: string | null;
  draggedBlockId: string | null;
  setDraggedBlockId: (value: string | null) => void;
  selectBlock: (value: string | null) => void;
  moveBlock: (dragId: string, targetId: string) => void;
  toggleBlockVisibility: (blockId: string) => void;
  removeBlock: (blockId: string) => void;
  availableBlocks: Array<LandingCardBlockType | MachinePageBlockType>;
  addBlock: (type: LandingCardBlockType | MachinePageBlockType) => void;
  embedded?: boolean;
}) {
  const content = (
    <CardContent className={cn("space-y-4", embedded ? "p-0" : "p-5")}>
      <div className="space-y-2">
        {layout.map((block, index) => {
          const isSelected = selectedBlockId === block.id;
          const isDragging = draggedBlockId === block.id;
          return (
            <div
              key={block.id}
              draggable
              onDragStart={() => {
                setDraggedBlockId(block.id);
                selectBlock(block.id);
              }}
              onDragEnd={() => setDraggedBlockId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedBlockId) {
                  moveBlock(draggedBlockId, block.id);
                  setDraggedBlockId(null);
                }
              }}
              onClick={() => selectBlock(block.id)}
              className={cn(
                "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-white px-3 py-3 transition",
                isSelected ? "border-primary/25 bg-primary-fixed/10 shadow-sm" : "border-outline-variant/12 hover:border-primary/20 hover:bg-surface-container-low/50",
                isDragging && "bg-primary-fixed/25"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-[11px] font-black text-secondary">
                  {index + 1}
                </span>
                <button type="button" className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-secondary transition hover:bg-surface-container-low hover:text-primary">
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-bold text-on-surface">{getBlockLabel(block)}</div>
                  {block.hidden ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Hidden</span> : null}
                </div>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-secondary">{getBlockSupportText(block)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleBlockVisibility(block.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition hover:bg-surface-container-low hover:text-primary"
                  aria-label={block.hidden ? "Show block" : "Hide block"}
                >
                  {block.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeBlock(block.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition hover:bg-rose-50 hover:text-rose-500"
                  aria-label="Remove block"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-low/30 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Add blocks back</div>
        <div className="mt-2 text-sm leading-6 text-secondary">
          Removed a section by mistake? Bring it back here.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {availableBlocks.length ? availableBlocks.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="rounded-full border border-outline-variant/12 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary transition hover:border-primary/20 hover:bg-primary-fixed/20"
            >
              + {surface === "landing_card"
                ? LANDING_BLOCK_LABELS[type as LandingCardBlockType]
                : MACHINE_PAGE_BLOCK_LABELS[type as MachinePageBlockType]}
            </button>
          )) : <div className="text-sm text-secondary">All approved blocks are already present.</div>}
        </div>
      </div>
    </CardContent>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="border border-outline-variant/12 shadow-sm">
      <CardHeader className="border-b border-outline-variant/10 bg-white/80 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Page structure</div>
            <div className="mt-1 text-xl font-black tracking-tight text-primary">
              {surface === "landing_card" ? "Landing card order" : "Machine page order"}
            </div>
          </div>
          <div className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
            {layout.length} blocks
          </div>
        </div>
        <div className="mt-2 text-sm leading-6 text-secondary">
          Click any row to edit that block. Drag rows to change section order without hunting through the page.
        </div>
      </CardHeader>
      {content}
    </Card>
  );
}

function HowItWorksEditor({
  steps,
  onChange
}: {
  steps: Array<{ step: number; title: string; body: string }>;
  onChange: (steps: Array<{ step: number; title: string; body: string }>) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function commit(next: Array<{ step: number; title: string; body: string }>) {
    onChange(next.map((step, index) => ({ ...step, step: index + 1 })));
  }

  function updateStep(index: number, field: "title" | "body", value: string) {
    commit(steps.map((step, current) => current === index ? { ...step, [field]: value } : step));
  }

  function addStep() {
    commit([...steps, { step: steps.length + 1, title: "", body: "" }]);
  }

  function removeStep(index: number) {
    commit(steps.filter((_, current) => current !== index));
  }

  function moveStep(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= steps.length || to >= steps.length) {
      setDraggedIndex(null);
      return;
    }
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
    setDraggedIndex(null);
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={`${step.title}-${step.body}-${index}`}
          draggable
          onDragStart={() => setDraggedIndex(index)}
          onDragEnd={() => setDraggedIndex(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedIndex !== null) {
              moveStep(draggedIndex, index);
            }
          }}
          className={cn("rounded-xl border border-outline-variant/14 bg-surface-container-low/40 p-4 transition", draggedIndex === index && "bg-primary-fixed/25")}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-black text-primary">{index + 1}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Step {index + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-secondary transition hover:bg-white hover:text-primary">
                <GripVertical className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => removeStep(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition hover:bg-rose-50 hover:text-rose-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Input placeholder="Step title" value={step.title} onChange={(event) => updateStep(index, "title", event.target.value)} className="mb-2" />
          <Textarea placeholder="What happens in this step..." rows={3} value={step.body} onChange={(event) => updateStep(index, "body", event.target.value)} />
        </div>
      ))}
      {!steps.length ? <div className="rounded-xl border border-dashed border-outline-variant/30 py-6 text-center text-sm text-secondary">No process steps yet.</div> : null}
      <Button type="button" variant="outline" size="sm" onClick={addStep}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add step
      </Button>
    </div>
  );
}

function FaqsEditor({
  faqs,
  onChange
}: {
  faqs: Array<{ question: string; answer: string }>;
  onChange: (faqs: Array<{ question: string; answer: string }>) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function commit(next: Array<{ question: string; answer: string }>) {
    onChange(next);
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    commit(faqs.map((faq, current) => current === index ? { ...faq, [field]: value } : faq));
  }

  function moveFaq(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= faqs.length || to >= faqs.length) {
      setDraggedIndex(null);
      return;
    }
    const next = [...faqs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
    setDraggedIndex(null);
  }

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => setDraggedIndex(index)}
          onDragEnd={() => setDraggedIndex(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedIndex !== null) {
              moveFaq(draggedIndex, index);
            }
          }}
          className={cn("rounded-xl border border-outline-variant/14 bg-surface-container-low/40 p-4 transition", draggedIndex === index && "bg-primary-fixed/25")}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">FAQ {index + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-secondary transition hover:bg-white hover:text-primary">
                <GripVertical className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => commit(faqs.filter((_, current) => current !== index))} className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition hover:bg-rose-50 hover:text-rose-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <Input placeholder="Question" value={faq.question} onChange={(event) => updateFaq(index, "question", event.target.value)} className="mb-2" />
          <Textarea placeholder="Answer" rows={3} value={faq.answer} onChange={(event) => updateFaq(index, "answer", event.target.value)} />
        </div>
      ))}
      {!faqs.length ? <div className="rounded-xl border border-dashed border-outline-variant/30 py-6 text-center text-sm text-secondary">No FAQs yet.</div> : null}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...faqs, { question: "", answer: "" }])}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add FAQ
      </Button>
    </div>
  );
}

function GlobalMachineLabelsPanel({
  open,
  onClose,
  machineDetailItems,
  updateNamedSiteItem,
  saveMachineDetailLabels
}: {
  open: boolean;
  onClose: () => void;
  machineDetailItems: Record<string, string>;
  updateNamedSiteItem: (sectionKey: string, itemKey: string, value: string) => void;
  saveMachineDetailLabels: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)]">
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Global labels</div>
            <div className="mt-1 text-xl font-black tracking-tight text-primary">Machine page shared labels</div>
            <div className="mt-1 text-sm text-secondary">These labels affect all machine detail pages and builder previews.</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/12 text-secondary transition hover:bg-surface-container-low">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {machineDetailFieldGroups.map((group) => (
              <div key={group.title} className="space-y-3 rounded-xl border border-outline-variant/12 bg-surface-container-low/30 p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">{group.title}</div>
                <div className="grid gap-3">
                  {group.fields.map(([fieldKey, label]) => (
                    <label key={fieldKey} className="grid gap-1.5 text-sm">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">{label}</span>
                      <Input value={machineDetailItems[fieldKey] ?? ""} onChange={(event) => updateNamedSiteItem("machine_details", fieldKey, event.target.value)} placeholder={label} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant/10 px-6 py-4">
          <div className="text-sm text-secondary">Save here to update every machine page preview and public page.</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={async () => { await saveMachineDetailLabels(); onClose(); }}>Save labels</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MachineCreatePanel({
  draft,
  setDraft,
  createProduct,
  setShowAddProduct,
  getCreateButtonLabel
}: {
  draft: ProductFormDraft;
  setDraft: React.Dispatch<React.SetStateAction<ProductFormDraft>>;
  createProduct: () => Promise<void>;
  setShowAddProduct: (value: boolean) => void;
  getCreateButtonLabel: (key: string, label: string) => string;
}) {
  return (
    <Card className="border border-outline-variant/12 shadow-sm">
      <CardHeader className="border-b border-outline-variant/10 bg-white/70">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">New machine</div>
        <div className="mt-1 text-2xl font-black tracking-tight text-primary">Create an unpublished machine shell</div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <FieldGroup label="Basics" hint="Start with the core identity. You can finish layout and content in the visual builder after creation.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Machine title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            <Input placeholder="Category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
            <Input className="sm:col-span-2" placeholder="URL slug e.g. double-end-boring-machine" value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} />
            <Textarea className="sm:col-span-2" rows={3} placeholder="Short summary" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
          </div>
        </FieldGroup>

        <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low/20 px-4 py-4 text-sm leading-7 text-secondary">
          The new machine will be created as <strong>unpublished</strong>. Build the landing card and machine page visually, save drafts as you go, and publish when it is ready for the public site.
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowAddProduct(false)}>Cancel</Button>
          <Button onClick={createProduct}>{getCreateButtonLabel("product-create", "Create machine")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductsMachinePagesView({ ctx }: { ctx: any }) {
  const {
    currentUser,
    selectedPublishedProduct,
    selectedProductDraftRecord,
    productDraft,
    setProductDraft,
    saveProduct,
    publishMachine,
    discardMachineDraft,
    machineDraftBusy,
    deleteProduct,
    getSaveButtonLabel,
    showAddProduct,
    setShowAddProduct,
    newProduct,
    setNewProduct,
    createProduct,
    getCreateButtonLabel,
    showProductEditor,
    setShowProductEditor,
    setSelectedProductId,
    productSearch,
    setProductSearch,
    filteredProducts,
    data,
    draggedProductId,
    setDraggedProductId,
    moveProduct,
    handleFeaturedImageUpload,
    isUploadingFeaturedImage,
    handleProductHeroImageUpload,
    isUploadingHeroImage,
    handleGalleryImageUpload,
    isUploadingGalleryImages,
    handleProductBrochureUpload,
    isUploadingBrochure,
    machineDetailItems,
    updateNamedSiteItem,
    saveMachineDetailLabels
  } = ctx;

  const [activeSurface, setActiveSurface] = useState<MachineSurface>("landing_card");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [showGlobalMachineLabels, setShowGlobalMachineLabels] = useState(false);
  const [builderSidebarTab, setBuilderSidebarTab] = useState<"edit" | "structure">("edit");
  const [isBuilderDrawerOpen, setIsBuilderDrawerOpen] = useState(false);

  const normalizedDraft = normalizeProductDraftForm(productDraft);
  const previewProduct = useMemo(() => toPreviewProduct(normalizedDraft, selectedPublishedProduct), [normalizedDraft, selectedPublishedProduct]);
  const changedFields = useMemo(() => getChangedFields(selectedPublishedProduct ?? null, normalizedDraft), [normalizedDraft, selectedPublishedProduct]);
  const liveProducts = useMemo(
    () => (data.products as Product[]).map((product) => normalizeProduct(product)).filter((product) => product.published && product.slug?.trim() && product.title?.trim()),
    [data.products]
  );

  const currentLayout = activeSurface === "landing_card" ? (previewProduct.landingCardLayout ?? []) : (previewProduct.machinePageLayout ?? []);
  const selectedBlock = currentLayout.find((block) => block.id === selectedBlockId) ?? null;
  const availableBlocks = getAvailableMachineBlocks(activeSurface, currentLayout);

  useEffect(() => {
    const layout = activeSurface === "landing_card"
      ? (normalizedDraft.landingCardLayout ?? [])
      : (normalizedDraft.machinePageLayout ?? []);
    if (!layout.length) {
      setSelectedBlockId(null);
      return;
    }
    if (!selectedBlockId || !layout.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(layout[0]?.id ?? null);
    }
  }, [activeSurface, normalizedDraft.landingCardLayout, normalizedDraft.machinePageLayout, selectedBlockId]);

  function patchDraft(patch: Partial<ProductFormDraft>) {
    setProductDraft((current: ProductFormDraft) => ({ ...normalizeProductDraftForm(current), ...patch }));
  }

  function selectBlockForEditing(blockId: string | null) {
    setSelectedBlockId(blockId);
    const nextSelectedBlock = blockId ? currentLayout.find((block) => block.id === blockId) ?? null : null;
    if (nextSelectedBlock) {
      setBuilderSidebarTab("edit");
      setIsBuilderDrawerOpen(!isSimpleQuickEditBlock(nextSelectedBlock));
    }
  }

  function setSurfaceLayout(surface: MachineSurface, layout: MachineBlock[]) {
    if (surface === "landing_card") {
      patchDraft({ landingCardLayout: layout });
      return;
    }
    patchDraft({ machinePageLayout: layout });
  }

  function updateInlineField(field: string, value: string) {
    patchDraft({ [field]: value } as Partial<ProductFormDraft>);
  }

  function addBlock(type: LandingCardBlockType | MachinePageBlockType) {
    const nextLayout = addMachineBlock(currentLayout, activeSurface, type);
    setSurfaceLayout(activeSurface, nextLayout);
    setSelectedBlockId(nextLayout[nextLayout.length - 1]?.id ?? null);
  }

  function removeSelectedBlock() {
    if (!selectedBlock) return;
    const nextLayout = removeMachineBlock(currentLayout, selectedBlock.id);
    setSurfaceLayout(activeSurface, nextLayout);
    setSelectedBlockId(nextLayout[0]?.id ?? null);
  }

  function removeBlockById(blockId: string) {
    const nextLayout = removeMachineBlock(currentLayout, blockId);
    setSurfaceLayout(activeSurface, nextLayout);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(nextLayout[0]?.id ?? null);
    }
  }

  useEffect(() => {
    if (!selectedBlockId) return;
    setBuilderSidebarTab("edit");
  }, [selectedBlockId]);

  function renderSimpleBlockQuickEdit() {
    if (!selectedBlock || !isSimpleQuickEditBlock(selectedBlock)) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Quick edit</div>
            <div className="mt-1 text-lg font-black tracking-tight text-primary">{getBlockLabel(selectedBlock)}</div>
            <div className="mt-1 text-sm leading-6 text-secondary">{getBlockSupportText(selectedBlock)}</div>
          </div>
          <div className="rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
            {selectedBlock.surface === "landing_card" ? "Landing" : "Detail"}
          </div>
        </div>

        {selectedBlock.type === "categoryBadge" ? (
          <FieldGroup label="Content" hint="Category appears as the small badge above the machine title.">
            <Input placeholder="Idler welding" value={normalizedDraft.category} onChange={(event) => patchDraft({ category: event.target.value })} />
          </FieldGroup>
        ) : null}

        {selectedBlock.type === "title" ? (
          <FieldGroup label="Content" hint="Headline for the landing-page card.">
            <Input placeholder="Machine title" value={normalizedDraft.title} onChange={(event) => patchDraft({ title: event.target.value })} />
          </FieldGroup>
        ) : null}

        {selectedBlock.type === "summary" ? (
          <FieldGroup label="Content" hint="Short summary used on the public landing page card.">
            <Textarea rows={4} placeholder="Landing-page summary" value={normalizedDraft.summary} onChange={(event) => patchDraft({ summary: event.target.value })} />
          </FieldGroup>
        ) : null}

        {selectedBlock.type === "usp" ? (
          <FieldGroup label="Content" hint="Short positioning statement on the landing card.">
            <Textarea rows={4} placeholder="Positioning statement" value={normalizedDraft.usp} onChange={(event) => patchDraft({ usp: event.target.value })} />
          </FieldGroup>
        ) : null}

        {selectedBlock.type === "overview" ? (
          <FieldGroup label="Content" hint="Main machine overview body on the detail page.">
            <Textarea rows={7} placeholder="Detailed machine overview" value={normalizedDraft.detailedDescription} onChange={(event) => patchDraft({ detailedDescription: event.target.value })} />
          </FieldGroup>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBuilderSidebarTab("edit");
              setIsBuilderDrawerOpen(true);
            }}
          >
            More controls
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedBlockId(null);
              setIsBuilderDrawerOpen(false);
            }}
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  function renderBlockInspector() {
    if (!selectedBlock) {
      return (
        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-outline-variant/12 bg-[linear-gradient(180deg,#f6f9fc_0%,#ffffff_100%)] p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">{SURFACE_COPY[activeSurface].eyebrow}</div>
            <div className="mt-2 text-xl font-black tracking-tight text-primary">{SURFACE_COPY[activeSurface].label}</div>
            <div className="mt-2 text-sm leading-7 text-secondary">{SURFACE_COPY[activeSurface].description}</div>
            <div className="mt-3 rounded-2xl bg-surface-container-low/50 px-4 py-3 text-sm leading-6 text-on-surface">{SURFACE_COPY[activeSurface].audience}</div>
          </div>
          <div className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed/30 text-primary">
                <SquarePen className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-primary">Choose a block to edit</div>
                <div className="mt-1 text-sm leading-6 text-secondary">
                  Use the live page preview or the structure panel to select a section. Once selected, its content controls appear here.
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Selected block</div>
              <div className="mt-2 text-xl font-black tracking-tight text-primary">{getBlockLabel(selectedBlock)}</div>
              <div className="mt-2 text-sm leading-6 text-secondary">
                {selectedBlock.surface === "landing_card"
                  ? "Edits here affect the machine’s landing-page card."
                  : "Edits here affect the machine’s detail page block."}
              </div>
            </div>
            <div className="rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
              {selectedBlock.surface === "landing_card" ? "Landing" : "Detail"}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-outline-variant/12 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Block settings</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSurfaceLayout(activeSurface, updateMachineBlockVisibility(currentLayout, selectedBlock.id, !selectedBlock.hidden))}
              >
                {selectedBlock.hidden ? "Show block" : "Hide block"}
              </Button>
              <Button variant="outline" size="sm" onClick={removeSelectedBlock}>
                Remove
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            {selectedBlock.type === "cardMedia" ? (
              <ImageAssetEditor
                label="Media"
                hint="This image leads the landing-page card."
                value={normalizedDraft.featuredImage}
                onChange={(value) => patchDraft({ featuredImage: value })}
                onUpload={handleFeaturedImageUpload}
                uploading={isUploadingFeaturedImage}
                placeholder="/images/machines/machine.png"
              />
            ) : null}

            {selectedBlock.type === "categoryBadge" ? (
              <FieldGroup label="Content" hint="Category appears as the small badge above the machine title.">
                <Input placeholder="Idler welding" value={normalizedDraft.category} onChange={(event) => patchDraft({ category: event.target.value })} />
              </FieldGroup>
            ) : null}

            {(selectedBlock.type === "title" || selectedBlock.type === "hero") ? (
              <FieldGroup
                label="Content"
                hint={selectedBlock.type === "title" ? "Headline for the landing-page card." : "Hero headline for the machine detail page."}
              >
                <Input
                  placeholder={selectedBlock.type === "title" ? "Machine title" : "Hero title"}
                  value={selectedBlock.type === "title" ? normalizedDraft.title : normalizedDraft.heroTitle}
                  onChange={(event) => patchDraft(selectedBlock.type === "title" ? { title: event.target.value } : { heroTitle: event.target.value })}
                />
              </FieldGroup>
            ) : null}

            {selectedBlock.type === "summary" ? (
              <FieldGroup label="Content" hint="Short summary used on the public landing page card.">
                <Textarea rows={4} placeholder="Landing-page summary" value={normalizedDraft.summary} onChange={(event) => patchDraft({ summary: event.target.value })} />
              </FieldGroup>
            ) : null}

            {(selectedBlock.type === "usp" || selectedBlock.type === "hero") ? (
              <FieldGroup label="Content" hint={selectedBlock.type === "usp" ? "Short positioning statement on the landing card." : "Opening value proposition under the hero title."}>
                <Textarea rows={4} placeholder="Positioning statement" value={normalizedDraft.usp} onChange={(event) => patchDraft({ usp: event.target.value })} />
              </FieldGroup>
            ) : null}

            {selectedBlock.type === "capabilityChips" ? (
              <ReorderableStringList
                title="Capabilities"
                hint="Short chips used to make the landing card more scannable."
                value={normalizedDraft.capabilities}
                onChange={(value) => patchDraft({ capabilities: value })}
                placeholder="PLC-based automation"
              />
            ) : null}

            {selectedBlock.type === "primaryCta" ? (
              <div className="space-y-4">
                <FieldGroup label="Actions" hint="Buttons are fixed to Welden’s brand style. These fields control where they lead.">
                  <Input placeholder="Machine slug" value={normalizedDraft.slug} onChange={(event) => patchDraft({ slug: event.target.value })} />
                </FieldGroup>
                <FieldGroup label="Media" hint="Brochure link powers the secondary CTA.">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Input placeholder="/brochures/machine.pdf" value={normalizedDraft.brochureUrl} onChange={(event) => patchDraft({ brochureUrl: event.target.value })} />
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-fixed/20 whitespace-nowrap">
                      <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleProductBrochureUpload} disabled={isUploadingBrochure} />
                      {isUploadingBrochure ? "Uploading..." : "Upload"}
                    </label>
                  </div>
                </FieldGroup>
              </div>
            ) : null}

            {selectedBlock.type === "overview" ? (
              <FieldGroup label="Content" hint="Main machine overview body on the detail page.">
                <Textarea rows={7} placeholder="Detailed machine overview" value={normalizedDraft.detailedDescription} onChange={(event) => patchDraft({ detailedDescription: event.target.value })} />
              </FieldGroup>
            ) : null}

            {(selectedBlock.type === "quickSpecs" || selectedBlock.type === "specTable") ? (
              <FieldGroup label="Content" hint="Both the quick-spec tiles and the full spec table pull from this shared structured list.">
                <SpecsEditor specs={normalizedDraft.specs} onChange={(specs) => patchDraft({ specs })} />
              </FieldGroup>
            ) : null}

            {selectedBlock.type === "capabilities" ? (
              <ReorderableStringList
                title="Capabilities"
                hint="Feature cards used on the detail page."
                value={normalizedDraft.capabilities}
                onChange={(value) => patchDraft({ capabilities: value })}
                placeholder="Dual-head boring for perfect alignment"
              />
            ) : null}

            {selectedBlock.type === "useCases" ? (
              <ReorderableStringList
                title="Use cases"
                hint="Buyer-facing application fit statements."
                value={normalizedDraft.idealUseCases}
                onChange={(value) => patchDraft({ idealUseCases: value })}
                placeholder="High-volume idler production"
              />
            ) : null}

            {selectedBlock.type === "industries" ? (
              <ReorderableStringList
                title="Industries"
                hint="Industry chips help recognition and SEO."
                value={normalizedDraft.industries}
                onChange={(value) => patchDraft({ industries: value })}
                placeholder="Conveyor manufacturing"
              />
            ) : null}

            {selectedBlock.type === "hero" ? (
              <div className="space-y-5">
                <ReorderableStringList
                  title="Hero points"
                  hint="Short support points that sit under the hero copy."
                  value={normalizedDraft.heroPoints}
                  onChange={(value) => patchDraft({ heroPoints: value })}
                  placeholder="Balanced thermal input for repeatable welding"
                />
                <ImageAssetEditor
                  label="Hero image"
                  hint="Hero image shown at the top of the machine detail page."
                  value={normalizedDraft.heroImage}
                  onChange={(value) => patchDraft({ heroImage: value })}
                  onUpload={handleProductHeroImageUpload}
                  uploading={isUploadingHeroImage}
                  placeholder="/images/machines/machine.png"
                  aspectClassName="aspect-[1.12]"
                />
                <FieldGroup label="Image crop" hint="Use CSS object-position values such as center center, left center, or 70% 40%.">
                  <Input placeholder="center center" value={normalizedDraft.heroImagePosition} onChange={(event) => patchDraft({ heroImagePosition: event.target.value })} />
                </FieldGroup>
              </div>
            ) : null}

            {selectedBlock.type === "howItWorks" ? (
              <FieldGroup label="Content" hint="Four process steps rendered as branded cards.">
                <HowItWorksEditor steps={normalizedDraft.howItWorks} onChange={(howItWorks) => patchDraft({ howItWorks })} />
              </FieldGroup>
            ) : null}

            {selectedBlock.type === "gallery" ? (
              <GalleryAssetEditor
                value={normalizedDraft.media}
                onChange={(value) => patchDraft({ media: value })}
                onUpload={handleGalleryImageUpload}
                uploading={isUploadingGalleryImages}
              />
            ) : null}

            {selectedBlock.type === "resourcePanel" ? (
              <div className="space-y-5">
                <FieldGroup label="Media" hint="Brochure and video populate the resource panel.">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Input placeholder="/brochures/machine.pdf" value={normalizedDraft.brochureUrl} onChange={(event) => patchDraft({ brochureUrl: event.target.value })} />
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-fixed/20 whitespace-nowrap">
                      <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleProductBrochureUpload} disabled={isUploadingBrochure} />
                      {isUploadingBrochure ? "Uploading..." : "Upload"}
                    </label>
                  </div>
                  <Input placeholder="https://youtu.be/..." value={normalizedDraft.videoUrl} onChange={(event) => patchDraft({ videoUrl: event.target.value })} />
                </FieldGroup>
              </div>
            ) : null}

            {selectedBlock.type === "faq" ? (
              <FieldGroup label="Content" hint="Common questions and objections for the detail page.">
                <FaqsEditor faqs={normalizedDraft.faqs} onChange={(faqs) => patchDraft({ faqs })} />
              </FieldGroup>
            ) : null}

            {(selectedBlock.type === "consultation" || selectedBlock.type === "relatedMachines") ? (
              <div className="rounded-2xl border border-dashed border-outline-variant/18 bg-surface-container-low/20 p-4 text-sm leading-7 text-secondary">
                This block is layout-driven. Its structure is fixed so the public page stays consistent. You can update its shared labels from <strong>Global labels</strong> or change the machine’s core content to affect what appears here.
              </div>
            ) : null}

          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <GlobalMachineLabelsPanel
        open={showGlobalMachineLabels}
        onClose={() => setShowGlobalMachineLabels(false)}
        machineDetailItems={machineDetailItems}
        updateNamedSiteItem={updateNamedSiteItem}
        saveMachineDetailLabels={saveMachineDetailLabels}
      />

      <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border border-outline-variant/12 shadow-sm">
            <CardHeader className="border-b border-outline-variant/10 bg-white/80 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Machines</div>
                  <div className="mt-1 text-xl font-black tracking-tight text-primary">{filteredProducts.length} in workspace</div>
                </div>
                {currentUser.role === "admin" ? (
                  <Button size="sm" className="rounded-lg" onClick={() => { setShowProductEditor(false); setShowAddProduct(true); }}>
                    <Plus className="mr-1.5 h-4 w-4" /> New
                  </Button>
                ) : null}
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" placeholder="Search title, slug, or category..." value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="max-h-[75vh] overflow-y-auto p-0">
              <div className="divide-y divide-outline-variant/10">
                {filteredProducts.map((product: Product) => {
                  const status = getMachineStatus(product, data.productDrafts.find((draft: ProductDraftRecord) => draft.productId === product.id));
                  const completeness = getCompleteness(product);
                  const draftRecord = data.productDrafts.find((draft: ProductDraftRecord) => draft.productId === product.id);
                  const lastUpdated = draftRecord?.updatedAt ?? product.updatedAt ?? product.createdAt ?? null;
                  const image = product.heroImage ?? product.featuredImage ?? product.media?.[0] ?? "";
                  const isDragged = draggedProductId === product.id;
                  return (
                    <div
                      key={product.id}
                      draggable={currentUser.role === "admin"}
                      onDragStart={() => setDraggedProductId(product.id)}
                      onDragEnd={() => setDraggedProductId(null)}
                      onDragOver={(event) => { if (currentUser.role === "admin") event.preventDefault(); }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (currentUser.role === "admin" && draggedProductId) void moveProduct(draggedProductId, product.id);
                      }}
                      onClick={() => { setSelectedProductId(product.id); setShowProductEditor(true); setShowAddProduct(false); }}
                      className={cn("cursor-pointer px-4 py-4 transition hover:bg-surface-container-low/40", isDragged && "bg-primary-fixed/25")}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-low">
                          {image ? <Image src={image} alt={product.title} width={160} height={128} unoptimized className="h-full w-full object-cover" /> : <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">No image</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-bold text-on-surface">{product.title || "Untitled machine"}</div>
                              <div className="truncate text-xs uppercase tracking-[0.16em] text-secondary">{product.slug || "No slug yet"}</div>
                            </div>
                            {currentUser.role === "admin" ? <GripVertical className="mt-1 h-4 w-4 shrink-0 text-secondary" /> : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", status.tone)}>{status.label}</span>
                            <span className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">{completeness.percent}% complete</span>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-secondary">{product.category || "No category"}{lastUpdated ? ` • Updated ${new Date(lastUpdated).toLocaleDateString()}` : ""}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!filteredProducts.length ? <div className="px-4 py-10 text-center text-sm text-secondary">No machines match this search.</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant/12 shadow-sm">
            <CardContent className="p-4 text-sm leading-7 text-secondary">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Global machine content</div>
                  <div className="mt-1 text-base font-black tracking-tight text-primary">Shared page labels</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowGlobalMachineLabels(true)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </div>
              <div className="mt-3">Shared labels for navigation, resource sections, and consultation copy across all machine detail pages.</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {showAddProduct ? (
            <MachineCreatePanel
              draft={newProduct}
              setDraft={setNewProduct}
              createProduct={createProduct}
              setShowAddProduct={setShowAddProduct}
              getCreateButtonLabel={getCreateButtonLabel}
            />
          ) : showProductEditor && selectedPublishedProduct ? (
            <>
              <div className="space-y-6">
                <Card className="border border-outline-variant/12 shadow-sm">
                  <CardHeader className="border-b border-outline-variant/10 bg-white/80 pb-5">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Machine builder</div>
                          <div className="mt-1 text-2xl font-black tracking-tight text-primary">{previewProduct.title || "Untitled machine"}</div>
                          <div className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
                            This is the live WYSIWYG page. Click a section to edit it, drag sections to change order, and publish only when the public site should update.
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                              {selectedProductDraftRecord
                                ? `Draft saved ${new Date(selectedProductDraftRecord.updatedAt).toLocaleDateString()}`
                                : "No saved draft yet"}
                            </span>
                            <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                              {changedFields.length ? `${changedFields.length} unpublished change${changedFields.length > 1 ? "s" : ""}` : "No unpublished changes"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => setShowGlobalMachineLabels(true)}>Global labels</Button>
                          <Button variant="outline" onClick={() => setShowProductEditor(false)}>Back to list</Button>
                          <Button variant="outline" onClick={discardMachineDraft} disabled={machineDraftBusy !== null}>Discard draft</Button>
                          <Button variant="outline" onClick={saveProduct} disabled={machineDraftBusy !== null}>
                            {machineDraftBusy === "save" ? "Saving..." : getSaveButtonLabel("machine-draft-save", "Save draft")}
                          </Button>
                          <Button onClick={publishMachine} disabled={machineDraftBusy !== null}>
                            {machineDraftBusy === "publish" ? "Publishing..." : getSaveButtonLabel("machine-publish", "Publish changes")}
                          </Button>
                          <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={deleteProduct} disabled={machineDraftBusy !== null}>
                            Delete machine
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
                        <div className="inline-flex max-w-max rounded-full bg-surface-container p-1">
                          <button
                            type="button"
                            onClick={() => setActiveSurface("landing_card")}
                            className={cn("rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition", activeSurface === "landing_card" ? "bg-white text-primary shadow-sm" : "text-secondary")}
                          >
                            <Eye className="mr-1.5 inline h-3.5 w-3.5" /> Landing Page Card
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSurface("machine_page")}
                            className={cn("rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition", activeSurface === "machine_page" ? "bg-white text-primary shadow-sm" : "text-secondary")}
                          >
                            <LayoutTemplate className="mr-1.5 inline h-3.5 w-3.5" /> Machine Detail Page
                          </button>
                        </div>
                        <div className="rounded-full bg-surface-container px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                          {SURFACE_COPY[activeSurface].audience}
                        </div>
                        <div className="inline-flex rounded-full bg-surface-container p-1">
                          <button type="button" onClick={() => setPreviewDevice("desktop")} className={cn("rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition", previewDevice === "desktop" ? "bg-white text-primary shadow-sm" : "text-secondary")}>
                            <Monitor className="mr-1 inline h-3.5 w-3.5" /> Desktop
                          </button>
                          <button type="button" onClick={() => setPreviewDevice("mobile")} className={cn("rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition", previewDevice === "mobile" ? "bg-white text-primary shadow-sm" : "text-secondary")}>
                            <Smartphone className="mr-1 inline h-3.5 w-3.5" /> Mobile
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBuilderSidebarTab("structure");
                              setIsBuilderDrawerOpen(true);
                            }}
                          >
                            Structure
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBuilderSidebarTab("edit");
                              setIsBuilderDrawerOpen(true);
                            }}
                          >
                            Edit panel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 bg-[linear-gradient(180deg,#f5f8fc_0%,#eef3f8_100%)] p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        {SURFACE_COPY[activeSurface].label}
                      </span>
                      <span className="rounded-full bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        Click section to edit
                      </span>
                      <span className="rounded-full bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        Drag section to reorder
                      </span>
                    </div>
                    <div className={cn("mx-auto transition-all", previewDevice === "desktop" ? "max-w-none" : "max-w-[390px]")}>
                      {activeSurface === "landing_card" ? (
                        <LandingCardSurface
                          product={previewProduct}
                          layout={previewProduct.landingCardLayout ?? []}
                          interaction={{
                            editable: true,
                            selectedBlockId,
                            draggedBlockId,
                            onSelectBlock: selectBlockForEditing,
                            onDragStart: setDraggedBlockId,
                            onDragEnd: () => setDraggedBlockId(null),
                            onMoveBlock: (dragId, targetId) => {
                              setSurfaceLayout("landing_card", moveMachineBlock(currentLayout, dragId, targetId));
                              setDraggedBlockId(null);
                            },
                            onFieldChange: updateInlineField
                          }}
                        />
                      ) : (
                        <MachinePageSurface
                          product={previewProduct}
                          liveProducts={liveProducts}
                          siteSections={data.siteSections}
                          layout={previewProduct.machinePageLayout ?? []}
                          interaction={{
                            editable: true,
                            selectedBlockId,
                            draggedBlockId,
                            onSelectBlock: selectBlockForEditing,
                            onDragStart: setDraggedBlockId,
                            onDragEnd: () => setDraggedBlockId(null),
                            onMoveBlock: (dragId, targetId) => {
                              setSurfaceLayout("machine_page", moveMachineBlock(currentLayout, dragId, targetId));
                              setDraggedBlockId(null);
                            },
                            onFieldChange: updateInlineField
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedBlock && isSimpleQuickEditBlock(selectedBlock) && !isBuilderDrawerOpen ? (
                <div className="pointer-events-none fixed inset-0 z-[84]">
                  <div className="absolute bottom-4 right-4 left-4 flex justify-end sm:bottom-6 sm:right-6 sm:left-auto">
                    <div className="pointer-events-auto w-full max-w-[420px] rounded-[1.8rem] border border-outline-variant/12 bg-white/96 p-5 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.42)] backdrop-blur">
                      {renderSimpleBlockQuickEdit()}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={cn(
                "pointer-events-none fixed inset-0 z-[85] transition",
                isBuilderDrawerOpen ? "pointer-events-auto" : ""
              )}>
                <button
                  type="button"
                  aria-label="Close editor drawer"
                  onClick={() => setIsBuilderDrawerOpen(false)}
                  className={cn(
                    "absolute inset-0 bg-slate-950/18 transition-opacity",
                    isBuilderDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
                  )}
                />
                <div className="absolute inset-y-0 right-0 flex max-w-full items-start justify-end p-3 pt-20 sm:p-4 sm:pt-24">
                  <div className={cn(
                    "flex h-[calc(100vh-5.5rem)] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[2rem] border border-outline-variant/12 bg-white shadow-[0_28px_80px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 sm:h-[calc(100vh-7rem)] sm:w-[400px]",
                    isBuilderDrawerOpen ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0"
                  )}>
                    <div className="flex items-start justify-between gap-3 border-b border-outline-variant/10 bg-white/90 px-5 py-4 backdrop-blur">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Editor drawer</div>
                        <div className="mt-1 text-xl font-black tracking-tight text-primary">
                          {builderSidebarTab === "edit"
                            ? (selectedBlock ? getBlockLabel(selectedBlock) : "Select a section")
                            : (activeSurface === "landing_card" ? "Landing card structure" : "Machine page structure")}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-secondary">
                          {builderSidebarTab === "edit"
                            ? "Click a section on the page to edit its content, media, or settings."
                            : "Reorder sections here, then click any section on the page to edit it."}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBuilderDrawerOpen(false)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/12 text-secondary transition hover:bg-surface-container-low hover:text-primary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="border-b border-outline-variant/10 px-5 py-3">
                      <div className="inline-flex rounded-full bg-surface-container p-1">
                        <button
                          type="button"
                          onClick={() => setBuilderSidebarTab("edit")}
                          className={cn("rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition", builderSidebarTab === "edit" ? "bg-white text-primary shadow-sm" : "text-secondary")}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setBuilderSidebarTab("structure")}
                          className={cn("rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition", builderSidebarTab === "structure" ? "bg-white text-primary shadow-sm" : "text-secondary")}
                        >
                          Structure
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5">
                      {builderSidebarTab === "edit" ? (
                        renderBlockInspector()
                      ) : (
                        <StructureOrganizer
                          embedded
                          surface={activeSurface}
                          layout={currentLayout}
                          selectedBlockId={selectedBlockId}
                          draggedBlockId={draggedBlockId}
                          setDraggedBlockId={setDraggedBlockId}
                          selectBlock={selectBlockForEditing}
                          moveBlock={(dragId, targetId) => setSurfaceLayout(activeSurface, moveMachineBlock(currentLayout, dragId, targetId))}
                          toggleBlockVisibility={(blockId) => setSurfaceLayout(activeSurface, updateMachineBlockVisibility(currentLayout, blockId, !currentLayout.find((block) => block.id === blockId)?.hidden))}
                          removeBlock={removeBlockById}
                          availableBlocks={availableBlocks}
                          addBlock={addBlock}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Card className="border border-outline-variant/12 shadow-sm">
              <CardContent className="flex min-h-[520px] flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed/30 text-primary">
                  <Wand2 className="h-7 w-7" />
                </div>
                <div className="text-2xl font-black tracking-tight text-primary">Choose a machine to open the visual builder</div>
                <div className="max-w-xl text-sm leading-7 text-secondary">
                  Open a machine from the left rail to edit its landing-page card and machine detail page visually, save drafts, and publish when you are ready.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
