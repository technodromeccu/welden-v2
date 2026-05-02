"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const body = await response.json() as { error?: string };
        setError(body.error ?? "Unable to send reset email. Please try again.");
        setLoading(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Unable to send reset email right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div role="status" aria-live="polite" className="w-full space-y-6 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
        <div className="space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ✓
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Check your email</h2>
          <p className="text-base leading-8 text-slate-600">
            If <strong>{email}</strong> is registered, a reset link has been sent. It expires in 1 hour.
          </p>
        </div>
        <Link href="/login" className="inline-flex text-sm font-semibold text-slate-700 underline-offset-4 hover:underline">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-7 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
      <div className="space-y-3">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
          Password Reset
        </span>
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Forgot your password?</h2>
        <p className="text-base leading-8 text-slate-600">
          Enter your staff email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <label className="grid gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Email address</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@welden.example"
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        />
      </label>

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Send reset link
        </button>
        <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
