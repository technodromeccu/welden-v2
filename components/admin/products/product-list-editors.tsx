"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { splitCsv } from "@/components/admin/shared/admin-panel-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Drag-and-drop list editors (string list / specs / how-it-works steps / FAQs)
// extracted from ProductsMachinePagesView.tsx — verbatim, behavior-preserving.

export function ReorderableStringList({
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
      {!items.length ? <div className="rounded-xl border border-dashed border-outline-variant/30 py-6 text-center text-sm text-secondary">No items yet.</div> : null}
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addItem}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add item
      </Button>
    </div>
  );
}

export function SpecsEditor({
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
          key={index}
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

export function HowItWorksEditor({
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
          key={index}
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

export function FaqsEditor({
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
