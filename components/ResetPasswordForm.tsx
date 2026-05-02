"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const hasToken = Boolean(token);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(hasToken);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(hasToken ? null : "Invalid or expired link.");
  const [done, setDone] = useState(false);

  // Validate token on mount before showing the form
  useEffect(() => {
    if (!token) {
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((body: { valid: boolean; error?: string }) => {
        setTokenValid(body.valid);
        if (!body.valid) setError(body.error ?? "Invalid or expired link.");
      })
      .catch(() => {
        setTokenValid(false);
        setError("Unable to verify the reset link.");
      })
      .finally(() => setValidating(false));
  }, [token]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;
  const canSubmit = tokenValid && password.length >= 8 && password === confirm;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const body = await response.json() as { ok?: boolean; error?: string };

      if (!response.ok) {
        setError(body.error ?? "Unable to reset password. The link may have expired.");
        setLoading(false);
        return;
      }

      setDone(true);
      // Redirect to login after 2 seconds
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Unable to reset password right now. Please try again.");
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="flex w-full items-center justify-center gap-3 p-10 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verifying your reset link…
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div role="alert" className="w-full space-y-6 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
        <div className="space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl">✕</div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Link expired or invalid</h2>
          <p className="text-base leading-8 text-slate-600">
            {error ?? "This reset link is no longer valid."} Password reset links expire after 1 hour.
          </p>
        </div>
        <Link href="/login/forgot-password" className="inline-flex rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status" aria-live="polite" className="w-full space-y-6 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
        <div className="space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">✓</div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Password updated</h2>
          <p className="text-base leading-8 text-slate-600">
            Your password has been changed. Redirecting you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-7 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
      <div className="space-y-3">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
          Set New Password
        </span>
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Choose a new password</h2>
        <p className="text-base leading-8 text-slate-600">
          Must be at least 8 characters. This link can only be used once.
        </p>
      </div>

      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            className={`h-12 rounded-2xl border px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 ${tooShort ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}
          />
          {tooShort ? <span className="text-xs text-rose-600">Must be at least 8 characters.</span> : null}
        </label>
        <label className="grid gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={`h-12 rounded-2xl border px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 ${mismatch ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}
          />
          {mismatch ? <span className="text-xs text-rose-600">Passwords do not match.</span> : null}
        </label>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Update password
        </button>
        <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
