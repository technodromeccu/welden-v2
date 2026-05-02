"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { isValidEmail, isValidPhone } from "@/lib/request-validation";

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "message", string>>;

export function ConsultationForm({ submitLabel = "Request Consultation", chatbotLabel = "Use Chatbot Instead" }: { submitLabel?: string; chatbotLabel?: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    machineInterest: "",
    message: ""
  });
  const [touched, setTouched] = useState<Partial<Record<keyof typeof form, true>>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // DS-08: inline field-level validation — only shown after the field has been touched
  function getFieldErrors(): FieldErrors {
    const errors: FieldErrors = {};
    if (touched.name && !form.name.trim()) errors.name = "Name is required.";
    if (touched.email) {
      if (!form.email.trim()) errors.email = "Email is required.";
      else if (!isValidEmail(form.email)) errors.email = "Please enter a valid email address.";
    }
    if (touched.phone) {
      if (!form.phone.trim()) errors.phone = "Phone number is required.";
      else if (!isValidPhone(form.phone)) errors.phone = "Please enter a valid phone number.";
    }
    if (touched.message && !form.message.trim()) errors.message = "Please describe your requirement.";
    return errors;
  }

  function markTouched(field: keyof typeof form) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    // Mark all required fields as touched to surface any remaining errors
    setTouched({ name: true, email: true, phone: true, message: true });
    const errors = getFieldErrors();
    if (Object.keys(errors).length) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/contact-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { leadId?: string; error?: string };

      if (!response.ok) {
        setResult({ type: "error", message: data.error ?? "Unable to submit your consultation request right now." });
        return;
      }

      setResult({
        type: "success",
        message: "Thank you! We've received your message and will be in touch within 2 working days."
      });
      setForm({ name: "", email: "", phone: "", company: "", machineInterest: "", message: "" });
      setTouched({});
    } catch {
      setResult({ type: "error", message: "Unable to submit your consultation request right now." });
    } finally {
      setLoading(false);
    }
  }

  const fieldErrors = getFieldErrors();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="eyebrow">Name</span>
          <input
            className={`field-input ${fieldErrors.name ? "ring-1 ring-rose-400" : ""}`}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            onBlur={() => markTouched("name")}
          />
          {fieldErrors.name && <span className="text-xs text-rose-600">{fieldErrors.name}</span>}
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">Email</span>
          <input
            className={`field-input ${fieldErrors.email ? "ring-1 ring-rose-400" : ""}`}
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            onBlur={() => markTouched("email")}
          />
          {fieldErrors.email && <span className="text-xs text-rose-600">{fieldErrors.email}</span>}
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">Phone</span>
          <input
            className={`field-input ${fieldErrors.phone ? "ring-1 ring-rose-400" : ""}`}
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            onBlur={() => markTouched("phone")}
          />
          {fieldErrors.phone && <span className="text-xs text-rose-600">{fieldErrors.phone}</span>}
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">Company</span>
          <input className="field-input" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
        </label>
        <label className="grid gap-1.5 md:col-span-2">
          <span className="eyebrow">Machine Interest</span>
          <input className="field-input" value={form.machineInterest} onChange={(event) => setForm({ ...form, machineInterest: event.target.value })} placeholder="Pipe cutting, idler welding, double end boring, bearing pushing..." />
        </label>
        <label className="grid gap-1.5 md:col-span-2">
          <span className="eyebrow">Requirement</span>
          <textarea
            className={`field-textarea ${fieldErrors.message ? "ring-1 ring-rose-400" : ""}`}
            rows={5}
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            onBlur={() => markTouched("message")}
            placeholder="Tell Welden about your production need, application, or quote request."
          />
          {fieldErrors.message && <span className="text-xs text-rose-600">{fieldErrors.message}</span>}
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary inline-flex items-center gap-2 text-[11px] disabled:opacity-50" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : submitLabel}
        </button>
        <a className="btn-secondary text-[11px]" href="#advisor">{chatbotLabel}</a>
      </div>

      {result ? (
        <p
          role={result.type === "success" ? "status" : "alert"}
          aria-live={result.type === "success" ? "polite" : "assertive"}
          className={`rounded-[var(--radius-card)] px-4 py-3 text-sm font-medium ${result.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}

