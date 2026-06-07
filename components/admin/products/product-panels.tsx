"use client";

import { X } from "lucide-react";
import { machineDetailFieldGroups } from "@/components/admin/shared/admin-panel-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup } from "./product-form-fields";
import type { ProductFormDraft } from "./product-form-helpers";

// Top-level panels (global labels modal + create-machine shell) extracted verbatim
// from ProductsMachinePagesView.tsx — behavior-preserving "Move".

export function GlobalMachineLabelsPanel({
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
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)]">
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Global labels</div>
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
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{group.title}</div>
                <div className="grid gap-3">
                  {group.fields.map(([fieldKey, label]) => (
                    <label key={fieldKey} className="grid gap-1.5 text-sm">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{label}</span>
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

export function MachineCreatePanel({
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
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">New machine</div>
        <div className="mt-1 text-2xl font-black tracking-tight text-primary">Create an unpublished machine shell</div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <FieldGroup label="Basics" hint="Start with the core identity. You can finish layout and content in the visual builder after creation.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Machine title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            <Input placeholder="Category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
            <Input className="sm:col-span-2" placeholder="URL slug e.g. double-end-boring-machine" value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} />
            <Textarea className="sm:col-span-2" rows={3} placeholder="Short summary" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
          </div>
        </FieldGroup>

        <div className="rounded-2xl border border-dashed border-outline-variant/15 bg-surface-container-low/20 px-4 py-4 text-sm leading-7 text-secondary">
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
