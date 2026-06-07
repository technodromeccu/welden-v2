"use client";

import { Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LandingCardBlockType, MachineBlock, MachinePageBlockType, MachineSurface } from "@/lib/types";
import {
  LANDING_BLOCK_LABELS,
  MACHINE_PAGE_BLOCK_LABELS,
  getBlockLabel,
  getBlockSupportText
} from "./product-form-helpers";

// Drag-to-reorder block organizer for the machine builder (landing card + machine page).
// Extracted verbatim from ProductsMachinePagesView.tsx — behavior-preserving "Move".

export function StructureOrganizer({
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
