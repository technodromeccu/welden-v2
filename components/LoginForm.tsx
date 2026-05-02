"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        let message = "Unable to sign in";
        try {
          const body = (await response.json()) as { error?: string };
          message = body.error ?? message;
        } catch {
          const text = (await response.text().catch(() => "")).trim();
          if (text) {
            message = text;
          }
        }

        setError(message);
        setLoading(false);
        return;
      }

      router.push(searchParams.get("next") ?? "/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
      <div className="space-y-4">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
          Staff Login
        </span>
        <div className="space-y-3">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Sign in to the Welden admin workspace.
          </h2>
          <p className="text-base leading-8 text-slate-600">
            Use your staff credentials to access the lead workspace, CMS operations, and advisor follow-up workflows.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </label>
      </div>

      {(searchParams.get("forbidden") || error) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error ?? "Your account does not have access to that area."}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <div className="flex flex-col items-end gap-1">
          <Link href="/login/forgot-password" className="text-sm text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        Staff access is provisioned by an administrator. Use your assigned email and password, or request a reset link if your account already exists.
      </div>
    </form>
  );
}
