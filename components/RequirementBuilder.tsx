"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

type RequirementBuilderForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  machineInterest: string;
  materialType: string;
  throughput: string;
  timeline: string;
  requirement: string;
};

const initialForm: RequirementBuilderForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  machineInterest: "",
  materialType: "",
  throughput: "",
  timeline: "",
  requirement: ""
};

export function RequirementBuilder({ products }: { products: Product[] }) {
  const [form, setForm] = useState<RequirementBuilderForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const summary = useMemo(() => {
    return [
      `Machine interest: ${form.machineInterest || "Not specified"}`,
      `Material or component: ${form.materialType || "Not specified"}`,
      `Target throughput: ${form.throughput || "Not specified"}`,
      `Project timeline: ${form.timeline || "Not specified"}`,
      `Requirement summary: ${form.requirement || "Not provided yet"}`
    ].join("\n");
  }, [form]);

  function update<K extends keyof RequirementBuilderForm>(key: K, value: RequirementBuilderForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function downloadSummary() {
    const blob = new Blob([
      [
        "Welden Requirement Summary",
        `Name: ${form.name || "Not provided"}`,
        `Email: ${form.email || "Not provided"}`,
        `Phone: ${form.phone || "Not provided"}`,
        `Company: ${form.company || "Not provided"}`,
        summary
      ].join("\n")
    ], { type: "text/plain;charset=utf-8" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Welden-requirement-summary.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setResult(null);

    const message = [
      "Requirement builder submission",
      summary
    ].join("\n\n");

    const response = await fetch("/api/contact-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        machineInterest: form.machineInterest,
        message
      })
    });

    const data = (await response.json()) as { leadId?: string; error?: string };

    if (!response.ok) {
      setResult({ type: "error", message: data.error ?? "Unable to submit your requirement right now." });
      setLoading(false);
      return;
    }

    setResult({
      type: "success",
      message: `Requirement submitted. Your lead has been logged for Welden follow-up with much better context.`
    });
    setForm(initialForm);
    setLoading(false);
  }

  return (
    <section id="quote-builder" className="bg-[linear-gradient(180deg,#f7fafc_0%,#eef4f8_100%)] px-6 py-28 lg:px-12">
      <div className="mx-auto grid max-w-screen-2xl gap-10 lg:grid-cols-[0.44fr_0.56fr] lg:items-start">
        <div>
          <span className="inline-flex rounded-full border border-primary/10 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary shadow-sm">
            Instant Quote Builder
          </span>
          <h2 className="mt-6 max-w-[10ch] text-5xl font-black tracking-[-0.055em] text-primary lg:text-[5rem]">
            Turn a rough inquiry into a usable requirement brief.
          </h2>
          <p className="mt-7 max-w-xl text-base leading-8 text-secondary">
            This builder helps buyers submit the machine need, line context, throughput target, and production requirement in one pass so Welden receives a far better first brief than a generic contact form.
          </p>

          <div className="mt-10 overflow-hidden rounded-[2rem] border border-outline-variant/14 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="border-b border-outline-variant/10 px-6 py-5 lg:px-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Requirement summary</div>
              <div className="mt-3 text-2xl font-black tracking-tight text-primary">Prepared for internal follow-up</div>
            </div>
            <div className="space-y-4 px-6 py-6 lg:px-8">
              {summary.split("\n").map((line) => (
                <div key={line} className="flex gap-4 border-b border-outline-variant/10 pb-4 last:border-b-0 last:pb-0">
                  <div className="pt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Brief</div>
                  <div className="text-sm leading-7 text-on-surface">{line}</div>
                </div>
              ))}
              <button type="button" onClick={downloadSummary} className="rounded-md border border-outline-variant/16 bg-surface-container-low px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary transition hover:bg-surface-container">
                Download summary
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-outline-variant/14 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] lg:p-8">
          <div className="border-b border-outline-variant/10 pb-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Builder form</div>
            <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-primary">Request pricing or technical follow-up</div>
            <p className="mt-2 text-sm leading-7 text-secondary">
              Submit a richer requirement so the first response can start from real machine context instead of a blank email.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Name</span>
                <input className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.name} onChange={(event) => update("name", event.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Email</span>
                <input className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Phone</span>
                <input className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Company</span>
                <input className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.company} onChange={(event) => update("company", event.target.value)} />
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Machine interest</span>
                <select className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.machineInterest} onChange={(event) => update("machineInterest", event.target.value)} required>
                  <option value="">Select machine</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.title}>{product.title}</option>
                  ))}
                  <option value="Custom requirement">Custom requirement</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Material or component</span>
                <input className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.materialType} onChange={(event) => update("materialType", event.target.value)} placeholder="Tube, bearing housing, idler shell..." />
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Target throughput</span>
                <input className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.throughput} onChange={(event) => update("throughput", event.target.value)} placeholder="Units/day or cycle target" />
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Timeline</span>
                <input className="h-12 rounded-xl bg-surface-container-high px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.timeline} onChange={(event) => update("timeline", event.target.value)} placeholder="This quarter, urgent, budgeting stage..." />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Requirement</span>
                <textarea className="min-h-[160px] rounded-2xl bg-surface-container-high px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" rows={6} value={form.requirement} onChange={(event) => update("requirement", event.target.value)} placeholder="Describe the line need, current bottleneck, tolerance expectation, or quote context." required />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={loading} className="rounded-md bg-[linear-gradient(135deg,#00346c,#1a4b8c)] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:brightness-110 disabled:opacity-50">
                {loading ? "Submitting..." : "Request quote"}
              </button>
              <a href="#contact" className="rounded-md border border-outline-variant/16 bg-white px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary transition hover:bg-surface-container-low">
                Open consultation desk
              </a>
            </div>

            {result ? (
              <p className={`rounded-xl px-4 py-3 text-sm ${result.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {result.message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}

