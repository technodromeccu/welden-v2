import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-10 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                Welden Staff Portal
              </span>
              <div className="space-y-4">
                <h1 className="text-5xl font-black leading-[0.95] tracking-tight">
                  Run leads, CMS, and chatbot operations from one workspace.
                </h1>
                <p className="max-w-xl text-base leading-8 text-white/70">
                  Access the internal platform for lead handling, machine content management, knowledge updates, and advisor follow-up workflows.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Modules</p>
                <p className="mt-2 text-2xl font-black">03</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Auth</p>
                <p className="mt-2 text-2xl font-black">Role-based</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Response SLA</p>
                <p className="mt-2 text-2xl font-black">2 days</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
            <div className="w-full max-w-xl">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
