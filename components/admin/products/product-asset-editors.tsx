"use client";

import { useState } from "react";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { splitCsv } from "@/components/admin/shared/admin-panel-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FieldGroup } from "./product-form-fields";

// Asset editors (single image + gallery) extracted from ProductsMachinePagesView.tsx.
// Behavior-preserving "Move" refactor — verbatim, no logic changes.

export function ImageAssetEditor({
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

export function GalleryAssetEditor({
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
            key={index}
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
