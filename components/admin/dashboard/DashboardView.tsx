"use client";

import { Loader2, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InternalLeadAssistant } from "@/components/admin/leads/InternalLeadAssistant";
import { fmtStatus } from "@/components/admin/shared/admin-panel-helpers";
import type { DashboardSummary, DeploymentHealth } from "@/lib/types";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type TodayQueueEntry = {
  session: { id: string; lead: { name: string; phone: string }; recommendation: { recommendedCategory?: string | null } };
  score: number;
  nextStep: string;
  temperature: string;
  owner: unknown;
};

type DashboardViewProps = {
  dashboardFirstCallOpenCount: number;
  dashboardQuotedAwaitingCallCount: number;
  dashboardCallbacksTodayCount: number;
  dashboardFirstCallDueCount: number;
  dashboardWorkNext: DashboardSummary["workNext"];
  dashboardPublishedProductsCount: number;
  dashboardLiveSectionsCount: number;
  dashboardActiveKnowledgeDocumentsCount: number;
  dashboardQuotedLeadCount: number;
  dashboardStageCounts: DashboardSummary["stageCounts"];
  dashboardMachineInterest: DashboardSummary["machineInterest"];
  dashboardRetryQueueCount: number;
  dashboardEscalatedLeadCount: number;
  dashboardStaleLeadCount: number;
  deploymentHealth: DeploymentHealth | null;
  todayQueue: {
    callbacksToday: TodayQueueEntry[];
    followUpsDue: TodayQueueEntry[];
    firstCallsOverdue: TodayQueueEntry[];
  };
  assistantOverview: {
    leadsNeedingCallUpdate: number;
    callbacksDueNow: number;
    quotationsNeedingFollowUp: number;
    leadsWaitingOnAssets: number;
  };
  setTab: (tab: string) => void;
  setSelectedLeadId: (id: string) => void;
  setShowLeadEditor: (value: boolean) => void;
  applyRowQuickAction: (sessionId: string, action: "no_answer" | "mark_contacted" | "follow_up_tomorrow") => Promise<void>;
  rowQuickActionLoading: string | null;
};

function TodayQueueRow({
  entry,
  onSelect,
  onNoAnswer,
  onMarkContacted,
  isLoading
}: {
  entry: TodayQueueEntry;
  onSelect: () => void;
  onNoAnswer: () => void;
  onMarkContacted: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/12 bg-white px-4 py-3">
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <div className="text-sm font-semibold text-on-surface">{entry.session.lead.name}</div>
        <div className="mt-0.5 text-sm text-secondary">{entry.session.lead.phone} - {entry.session.recommendation.recommendedCategory ?? "Review"}</div>
      </button>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          title="Log called now"
          onClick={onMarkContacted}
          disabled={isLoading}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container-high hover:text-primary disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          title="Log no answer"
          onClick={onNoAnswer}
          disabled={isLoading}
          className="flex h-7 items-center rounded-lg px-2 text-xs font-bold uppercase tracking-[0.12em] text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
        >
          No ans.
        </button>
      </div>
    </div>
  );
}

export function DashboardView(props: DashboardViewProps) {
  const {
    dashboardFirstCallOpenCount,
    dashboardQuotedAwaitingCallCount,
    dashboardCallbacksTodayCount,
    dashboardFirstCallDueCount,
    dashboardWorkNext,
    dashboardPublishedProductsCount,
    dashboardLiveSectionsCount,
    dashboardActiveKnowledgeDocumentsCount,
    dashboardQuotedLeadCount,
    dashboardStageCounts,
    dashboardMachineInterest,
    dashboardRetryQueueCount,
    dashboardEscalatedLeadCount,
    dashboardStaleLeadCount,
    deploymentHealth,
    todayQueue,
    assistantOverview,
    setTab,
    setSelectedLeadId,
    setShowLeadEditor,
    applyRowQuickAction,
    rowQuickActionLoading
  } = props;

  function openLead(id: string) {
    setTab("leads");
    setSelectedLeadId(id);
    setShowLeadEditor(true);
  }

  const totalTodayCount = todayQueue.callbacksToday.length + todayQueue.followUpsDue.length + todayQueue.firstCallsOverdue.length;

  return (
    <div className="space-y-6">
      <InternalLeadAssistant
        overview={assistantOverview}
        onOpenLead={(leadId) => openLead(leadId)}
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a_0%,#173b79_55%,#1d4ed8_100%)] text-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.65)]">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200/80">Today</div>
              <h2 className="mt-3 max-w-xl text-2xl font-black tracking-tight md:text-[2rem]">Keep the commercial queue moving without hunting through the dashboard.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                Focus on leads that need action today, open the pipeline fast, and keep quotation follow-up visible without wasting vertical space.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="rounded-xl bg-white text-slate-950 hover:bg-slate-100" onClick={() => setTab("leads")}>
                  Open pipeline
                </Button>
                <Button variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => setTab("quotation templates")}>
                  Review quote playbooks
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/70">Calls due now</div>
                <div className="mt-2 text-3xl font-black tracking-tight">{dashboardFirstCallDueCount}</div>
                <div className="mt-1 text-sm text-slate-200">Immediate phone follow-up needed.</div>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/70">Quotes awaiting follow-up</div>
                <div className="mt-2 text-3xl font-black tracking-tight">{dashboardQuotedAwaitingCallCount}</div>
                <div className="mt-1 text-sm text-slate-200">Quoted buyers still waiting on a call.</div>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/70">Callbacks on deck</div>
                <div className="mt-2 text-3xl font-black tracking-tight">{dashboardCallbacksTodayCount}</div>
                <div className="mt-1 text-sm text-slate-200">Committed callbacks scheduled today.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/15 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle>Work next</CardTitle>
            <CardDescription>The next commercial moves worth making from this screen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardWorkNext.length ? dashboardWorkNext.slice(0, 4).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openLead(entry.id)}
                className="flex w-full items-start justify-between rounded-2xl border border-outline-variant/12 bg-surface-container-low px-4 py-3 text-left transition-colors hover:bg-surface-container"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-on-surface">{entry.name}</div>
                  <div className="mt-1 text-sm text-secondary">{entry.category ?? "Review fit"} - {entry.attentionLabel}</div>
                </div>
                <Badge variant={entry.attentionTone}>
                  {fmtStatus(entry.attentionLabel)}
                </Badge>
              </button>
            )) : (
              <div className="rounded-2xl border border-dashed border-outline-variant/15 bg-surface-container-low/40 px-4 py-8 text-sm text-secondary">
                No priority leads are waiting right now.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-outline-variant/15 bg-white shadow-sm"><CardContent className="p-6"><div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Pipeline intake</div><div className="mt-3 text-4xl font-black tracking-tight text-primary">{dashboardFirstCallOpenCount}</div><div className="mt-2 text-sm text-secondary">New leads still waiting for the first staff touch.</div></CardContent></Card>
        <Card className="border border-amber-200/70 bg-white shadow-sm"><CardContent className="p-6"><div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Quoted but cooling</div><div className="mt-3 text-4xl font-black tracking-tight text-primary">{dashboardQuotedAwaitingCallCount}</div><div className="mt-2 text-sm text-secondary">Quotes sent without a logged human follow-up yet.</div></CardContent></Card>
        <Card className="border border-outline-variant/15 bg-white shadow-sm"><CardContent className="p-6"><div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Callbacks committed</div><div className="mt-3 text-4xl font-black tracking-tight text-primary">{dashboardCallbacksTodayCount}</div><div className="mt-2 text-sm text-secondary">Buyer calls scheduled into today&apos;s operating window.</div></CardContent></Card>
        <Card className="border border-outline-variant/15 bg-white shadow-sm"><CardContent className="p-6"><div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Immediate pressure</div><div className="mt-3 text-4xl font-black tracking-tight text-primary">{dashboardFirstCallDueCount}</div><div className="mt-2 text-sm text-secondary">Leads whose first call deadline has already arrived.</div></CardContent></Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="border border-outline-variant/15 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Today&apos;s queue</CardTitle>
                <CardDescription>Callbacks, overdue follow-ups, and first calls that need attention right now.</CardDescription>
              </div>
              {totalTodayCount > 0 && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                  {totalTodayCount}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {totalTodayCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/40 px-6 py-10 text-center">
                <div className="text-sm font-semibold text-emerald-700">All clear</div>
                <div className="mt-1 text-sm text-emerald-600/80">No callbacks, follow-ups, or overdue calls for today.</div>
              </div>
            ) : null}

            {todayQueue.callbacksToday.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Callbacks today</span>
                  <Badge variant="secondary">{todayQueue.callbacksToday.length}</Badge>
                </div>
                <div className="space-y-2">
                  {todayQueue.callbacksToday.map((entry) => (
                    <TodayQueueRow
                      key={entry.session.id}
                      entry={entry}
                      onSelect={() => openLead(entry.session.id)}
                      onMarkContacted={() => void applyRowQuickAction(entry.session.id, "mark_contacted")}
                      onNoAnswer={() => void applyRowQuickAction(entry.session.id, "no_answer")}
                      isLoading={rowQuickActionLoading === entry.session.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {todayQueue.firstCallsOverdue.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">First calls overdue</span>
                  <Badge variant="danger">{todayQueue.firstCallsOverdue.length}</Badge>
                </div>
                <div className="space-y-2">
                  {todayQueue.firstCallsOverdue.slice(0, 5).map((entry) => (
                    <TodayQueueRow
                      key={entry.session.id}
                      entry={entry}
                      onSelect={() => openLead(entry.session.id)}
                      onMarkContacted={() => void applyRowQuickAction(entry.session.id, "mark_contacted")}
                      onNoAnswer={() => void applyRowQuickAction(entry.session.id, "no_answer")}
                      isLoading={rowQuickActionLoading === entry.session.id}
                    />
                  ))}
                  {todayQueue.firstCallsOverdue.length > 5 && (
                    <button type="button" onClick={() => setTab("leads")} className="w-full rounded-xl py-2 text-sm text-secondary hover:text-primary">
                      +{todayQueue.firstCallsOverdue.length - 5} more - view in pipeline
                    </button>
                  )}
                </div>
              </div>
            )}

            {todayQueue.followUpsDue.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Follow-ups due</span>
                  <Badge variant="warning">{todayQueue.followUpsDue.length}</Badge>
                </div>
                <div className="space-y-2">
                  {todayQueue.followUpsDue.slice(0, 4).map((entry) => (
                    <TodayQueueRow
                      key={entry.session.id}
                      entry={entry}
                      onSelect={() => openLead(entry.session.id)}
                      onMarkContacted={() => void applyRowQuickAction(entry.session.id, "mark_contacted")}
                      onNoAnswer={() => void applyRowQuickAction(entry.session.id, "no_answer")}
                      isLoading={rowQuickActionLoading === entry.session.id}
                    />
                  ))}
                  {todayQueue.followUpsDue.length > 4 && (
                    <button type="button" onClick={() => setTab("leads")} className="w-full rounded-xl py-2 text-sm text-secondary hover:text-primary">
                      +{todayQueue.followUpsDue.length - 4} more - view in pipeline
                    </button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border border-outline-variant/15 bg-white shadow-sm">
            <CardHeader className="pb-4"><CardTitle>System readiness</CardTitle><CardDescription>Quick visibility into the services backing this workspace.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm text-secondary">
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Gemini LLM</span><Badge variant={deploymentHealth?.geminiConfigured ? "success" : "warning"}>{deploymentHealth?.geminiConfigured ? "Connected" : "Missing key"}</Badge></div>
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Resend email</span><Badge variant={deploymentHealth?.emailConfigured ? "success" : "outline"}>{deploymentHealth?.emailConfigured ? "Configured" : "Not configured"}</Badge></div>
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Cron secret</span><Badge variant={deploymentHealth?.cronConfigured ? "success" : "outline"}>{deploymentHealth?.cronConfigured ? "Configured" : "Missing"}</Badge></div>
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Production readiness</span><Badge variant={deploymentHealth?.readyForProduction ? "success" : "warning"}>{deploymentHealth?.readyForProduction ? "Ready" : "Needs setup"}</Badge></div>
            </CardContent>
          </Card>
          <Card className="border border-outline-variant/15 bg-white shadow-sm">
            <CardHeader className="pb-4"><CardTitle>Operator shortcuts</CardTitle><CardDescription>Jump straight into the work that moves the pipeline or sharpens sales assets.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Button className="justify-start" onClick={() => setTab("leads")}>Open pipeline workspace</Button>
              <Button variant="outline" className="justify-start" onClick={() => setTab("quotation templates")}>Refine quote playbooks</Button>
              <Button variant="outline" className="justify-start" onClick={() => setTab("machines")}>Review machine catalog</Button>
              <Button variant="outline" className="justify-start" onClick={() => setTab("site content")}>Tune public content</Button>
            </CardContent>
          </Card>
          <Card className="border border-outline-variant/15 bg-white shadow-sm">
            <CardHeader className="pb-4"><CardTitle>Commercial readiness</CardTitle><CardDescription>The public-facing assets and knowledge that support the sales conversation.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm text-secondary">
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Published machine assets</span><span className="font-semibold text-on-surface">{dashboardPublishedProductsCount}</span></div>
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Live site sections</span><span className="font-semibold text-on-surface">{dashboardLiveSectionsCount}</span></div>
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Knowledge sources active</span><span className="font-semibold text-on-surface">{dashboardActiveKnowledgeDocumentsCount}</span></div>
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Quoted leads</span><span className="font-semibold text-on-surface">{dashboardQuotedLeadCount}</span></div>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border border-outline-variant/15 bg-white shadow-sm">
          <CardHeader className="pb-4"><CardTitle>Stage pressure</CardTitle><CardDescription>Where the active pipeline is bunching up right now.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm text-secondary">
            {dashboardStageCounts.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardStageCounts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tickFormatter={(value: string) => fmtStatus(value)} style={{ fontSize: '12px', fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {dashboardStageCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="rounded-xl border border-dashed border-outline-variant/15 bg-surface-container-low/40 px-4 py-8 text-center">No lead stages recorded yet.</div>}
          </CardContent>
        </Card>
        <Card className="border border-outline-variant/15 bg-white shadow-sm">
          <CardHeader className="pb-4"><CardTitle>Demand signals</CardTitle><CardDescription>The machine categories showing the strongest current pull.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm text-secondary">
            {dashboardMachineInterest.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dashboardMachineInterest} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="label">
                      {dashboardMachineInterest.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="rounded-xl border border-dashed border-outline-variant/15 bg-surface-container-low/40 px-4 py-8 text-center">No machine demand signals yet.</div>}
          </CardContent>
        </Card>
        <Card className="border border-outline-variant/15 bg-white shadow-sm">
          <CardHeader className="pb-4"><CardTitle>Follow-up engine</CardTitle><CardDescription>The only watchlist metrics needed to keep deals warm.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm text-secondary">
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Calls due now</span><span className="font-semibold text-on-surface">{dashboardFirstCallDueCount}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Quoted awaiting call</span><span className="font-semibold text-on-surface">{dashboardQuotedAwaitingCallCount}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Retry queue</span><span className="font-semibold text-on-surface">{dashboardRetryQueueCount}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Escalated calls</span><span className="font-semibold text-on-surface">{dashboardEscalatedLeadCount}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"><span>Stale leads</span><span className="font-semibold text-on-surface">{dashboardStaleLeadCount}</span></div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
