"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  GripVertical,
  LayoutTemplate,
  Monitor,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  SquarePen
} from "lucide-react";
import {
  addMachineBlock,
  getAvailableMachineBlocks,
  moveMachineBlock,
  removeMachineBlock,
  updateMachineBlockVisibility
} from "@/lib/machine-builder";
import { normalizeProduct } from "@/lib/products";
import { LandingCardSurface, MachinePageSurface } from "@/components/machines/MachineSurfaceRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getBlockLabel,
  getBlockSupportText,
  isSimpleQuickEditBlock,
  normalizeProductDraftForm,
  toPreviewProduct,
  getMachineStatus,
  getCompleteness,
  getChangedFields,
  LANDING_BLOCK_LABELS,
  MACHINE_PAGE_BLOCK_LABELS,
  type ProductFormDraft
} from "./product-form-helpers";
import { FieldGroup } from "./product-form-fields";
import { ImageAssetEditor, GalleryAssetEditor } from "./product-asset-editors";
import { ReorderableStringList, SpecsEditor, HowItWorksEditor, FaqsEditor } from "./product-list-editors";
import { StructureOrganizer } from "./product-structure-organizer";
import { GlobalMachineLabelsPanel, MachineCreatePanel } from "./product-panels";
import type {
  LandingCardBlockType,
  MachineBlock,
  MachinePageBlockType,
  MachineSurface,
  Product,
  ProductDraftRecord
} from "@/lib/types";

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

  // Selection-validity sync: when the active surface or layout changes, snap the
  // selected block id to something valid (or null when the layout is empty).
  // Guarded — we only setState when the current selection becomes invalid, so this
  // doesn't loop. Refactoring to derive-during-render conflicts with the event-handler
  // setters (addBlock / removeBlock / etc.) that also write selectedBlockId.
  useEffect(() => {
    const layout = activeSurface === "landing_card"
      ? (normalizedDraft.landingCardLayout ?? [])
      : (normalizedDraft.machinePageLayout ?? []);
    if (!layout.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional guarded sync
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

  // Sidebar-tab sync: when the user picks a block (anywhere — board click, drag-end,
  // keyboard nav), open the edit tab. Several event handlers can change selectedBlockId,
  // so doing this in an effect keeps the behavior in one place.
  useEffect(() => {
    if (!selectedBlockId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sidebar sync
    setBuilderSidebarTab("edit");
  }, [selectedBlockId]);

  function renderSimpleBlockQuickEdit() {
    if (!selectedBlock || !isSimpleQuickEditBlock(selectedBlock)) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Quick edit</div>
            <div className="mt-1 text-lg font-black tracking-tight text-primary">{getBlockLabel(selectedBlock)}</div>
            <div className="mt-1 text-sm leading-6 text-secondary">{getBlockSupportText(selectedBlock)}</div>
          </div>
          <div className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
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
            }}
          >
            More controls
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedBlockId(null);
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
        <div className="space-y-6">
          <div className="rounded-3xl border border-outline-variant/12 bg-[linear-gradient(180deg,#f6f9fc_0%,#ffffff_100%)] p-6">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{SURFACE_COPY[activeSurface].eyebrow}</div>
            <div className="mt-2 text-xl font-black tracking-tight text-primary">{SURFACE_COPY[activeSurface].label}</div>
            <div className="mt-2 text-sm leading-7 text-secondary">{SURFACE_COPY[activeSurface].description}</div>
            <div className="mt-3 rounded-2xl bg-surface-container-low/50 px-4 py-3 text-sm leading-6 text-on-surface">{SURFACE_COPY[activeSurface].audience}</div>
          </div>
          <div className="rounded-3xl border border-outline-variant/12 bg-white p-6">
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
      <div className="space-y-6">
        <div className="rounded-3xl border border-outline-variant/12 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Selected block</div>
              <div className="mt-2 text-xl font-black tracking-tight text-primary">{getBlockLabel(selectedBlock)}</div>
              <div className="mt-2 text-sm leading-6 text-secondary">
                {selectedBlock.surface === "landing_card"
                  ? "Edits here affect the machine’s landing-page card."
                  : "Edits here affect the machine’s detail page block."}
              </div>
            </div>
            <div className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
              {selectedBlock.surface === "landing_card" ? "Landing" : "Detail"}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-outline-variant/12 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Block settings</div>
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

          <div className="space-y-6">
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
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-fixed/20 whitespace-nowrap">
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
              <div className="space-y-6">
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
              <div className="space-y-6">
                <FieldGroup label="Media" hint="Brochure and video populate the resource panel.">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Input placeholder="/brochures/machine.pdf" value={normalizedDraft.brochureUrl} onChange={(event) => patchDraft({ brochureUrl: event.target.value })} />
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-fixed/20 whitespace-nowrap">
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

      <div className="grid gap-6">
        {!(showProductEditor || showAddProduct) && (
          <div className="space-y-4">
          <Card className="border border-outline-variant/12 shadow-sm">
            <CardHeader className="border-b border-outline-variant/10 bg-white/80 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Machines</div>
                  <div className="mt-1 text-xl font-black tracking-tight text-primary">{filteredProducts.length} in workspace</div>
                </div>
                {currentUser.role === "admin" ? (
                  <Button size="sm" className="rounded-lg" onClick={() => { setShowProductEditor(false); setShowAddProduct(true); }}>
                    <Plus className="mr-1.5 h-4 w-4" /> New
                  </Button>
                ) : null}
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/60" />
                <Input className="pl-10" placeholder="Search title, slug, or category..." value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="max-h-[75vh] overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      className={cn("cursor-pointer rounded-2xl border border-outline-variant/15 p-4 transition hover:bg-surface-container-low hover:shadow-md", isDragged && "bg-primary-fixed/25")}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-low">
                          {image ? <Image src={image} alt={product.title} width={400} height={320} unoptimized className="h-full w-full object-cover" /> : <div className="text-xs font-bold uppercase tracking-[0.16em] text-secondary/60">No image</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-bold text-on-surface">{product.title || "Untitled machine"}</div>
                              <div className="truncate text-xs uppercase tracking-[0.16em] text-secondary">{product.slug || "No slug yet"}</div>
                            </div>
                            {currentUser.role === "admin" ? <GripVertical className="mt-1 h-4 w-4 shrink-0 text-secondary" /> : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em]", status.tone)}>{status.label}</span>
                            <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">{completeness.percent}% complete</span>
                          </div>
                          <div className="mt-3 text-xs leading-5 text-secondary">{product.category || "No category"}{lastUpdated ? ` • Updated ${new Date(lastUpdated).toLocaleDateString()}` : ""}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!filteredProducts.length ? <div className="py-10 text-center text-sm text-secondary">No machines match this search.</div> : null}
            </CardContent>
          </Card>

          <Card className="border border-outline-variant/12 shadow-sm">
            <CardContent className="p-4 text-sm leading-7 text-secondary">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Global machine content</div>
                  <div className="mt-1 text-base font-black tracking-tight text-primary">Shared page labels</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowGlobalMachineLabels(true)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

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
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                  <Card className="flex-1 border border-outline-variant/12 shadow-sm min-w-0">
                    <CardHeader className="border-b border-outline-variant/10 bg-white/80 pb-5">
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Machine builder</div>
                            <div className="mt-1 text-2xl font-black tracking-tight text-primary">{previewProduct.title || "Untitled machine"}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                                {selectedProductDraftRecord
                                  ? `Draft saved ${new Date(selectedProductDraftRecord.updatedAt).toLocaleDateString()}`
                                  : "No saved draft yet"}
                              </span>
                              <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
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
                              className={cn("rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition", activeSurface === "landing_card" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary")}
                            >
                              <Eye className="mr-1.5 inline h-3.5 w-3.5" /> Landing Page Card
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSurface("machine_page")}
                              className={cn("rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition", activeSurface === "machine_page" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary")}
                            >
                              <LayoutTemplate className="mr-1.5 inline h-3.5 w-3.5" /> Machine Detail Page
                            </button>
                          </div>
                          <div className="inline-flex rounded-full bg-surface-container p-1 xl:justify-end">
                            <button type="button" onClick={() => setPreviewDevice("desktop")} className={cn("rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition", previewDevice === "desktop" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary")}>
                              <Monitor className="mr-1 inline h-3.5 w-3.5" /> Desktop
                            </button>
                            <button type="button" onClick={() => setPreviewDevice("mobile")} className={cn("rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition", previewDevice === "mobile" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary")}>
                              <Smartphone className="mr-1 inline h-3.5 w-3.5" /> Mobile
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 bg-[linear-gradient(180deg,#f5f8fc_0%,#eef3f8_100%)] p-6">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                          {SURFACE_COPY[activeSurface].label}
                        </span>
                        <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                          Click section to edit
                        </span>
                        <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
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

                  <div className="sticky top-6 flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-3xl border border-outline-variant/12 bg-white shadow-sm xl:w-[420px] xl:shrink-0">
                    <div className="flex items-start justify-between gap-3 border-b border-outline-variant/10 bg-white/90 px-6 py-4 backdrop-blur">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Inspector</div>
                        <div className="mt-1 text-xl font-black tracking-tight text-primary">
                          {builderSidebarTab === "edit"
                            ? (selectedBlock ? getBlockLabel(selectedBlock) : "Select a section")
                            : (activeSurface === "landing_card" ? "Landing card structure" : "Machine page structure")}
                        </div>
                        <div className="mt-1 text-sm text-secondary">
                          {builderSidebarTab === "edit"
                            ? "Click a section on the page to edit its content."
                            : "Reorder sections here."}
                        </div>
                      </div>
                    </div>
                    <div className="border-b border-outline-variant/10 px-6 py-3 bg-surface-container-low/40">
                      <div className="inline-flex rounded-full bg-surface-container p-1">
                        <button
                          type="button"
                          onClick={() => setBuilderSidebarTab("edit")}
                          className={cn("rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition", builderSidebarTab === "edit" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary")}
                        >
                          Edit section
                        </button>
                        <button
                          type="button"
                          onClick={() => setBuilderSidebarTab("structure")}
                          className={cn("rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition", builderSidebarTab === "structure" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary")}
                        >
                          Structure
                        </button>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-white">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={builderSidebarTab + (selectedBlock?.id ?? "none")}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="p-6"
                        >
                          {builderSidebarTab === "edit" ? (
                            selectedBlock && isSimpleQuickEditBlock(selectedBlock) ? (
                              renderSimpleBlockQuickEdit()
                            ) : renderBlockInspector()
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
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
