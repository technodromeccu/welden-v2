"use client";

import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { daysOfWeek, fmtDate } from "@/components/admin/shared/admin-panel-helpers";
import type { BackupArtifact, BackupStatus, Settings, User } from "@/lib/types";
import type { AuditEntry } from "@/lib/audit";

type SettingsViewProps = {
  users: User[];
  settingsDraft: Settings;
  setSettingsDraft: Dispatch<SetStateAction<Settings>>;
  dataSettings: Settings;
  backupStatus: BackupStatus | null;
  backupArtifacts: BackupArtifact[];
  backupLoading: boolean;
  backupRunning: boolean;
  backupError: string | null;
  fetchBackupStatus: () => Promise<void>;
  runBackupNow: () => Promise<void>;
  downloadLocalBackup: (kind: "bundle" | "secrets") => void;
  saveSettings: () => Promise<void>;
  uploadBrandingImage: (file: File, assetName: string) => Promise<string>;
  getSaveButtonLabel: (key: string, label: string) => string;
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  password_changed: "Password changed",
  password_reset_requested: "Reset requested",
  login: "Signed in",
  logout: "Signed out"
};

function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  async function load(nextOffset = 0) {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-log?limit=50&offset=${nextOffset}`);
      const body = await res.json() as { entries: AuditEntry[]; total: number };
      setEntries((prev) =>
        nextOffset === 0 ? body.entries : [...(prev ?? []), ...body.entries]
      );
      setTotal(body.total);
      setOffset(nextOffset + body.entries.length);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-outline-variant/20 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>System-wide record of admin write actions.</CardDescription>
        </div>
        {!entries ? (
          <Button size="sm" variant="outline" onClick={() => void load(0)} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load"}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => void load(0)} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        )}
      </CardHeader>
      {entries !== null ? (
        <CardContent className="space-y-1 p-0">
          {entries.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-secondary">No audit entries yet.</div>
          ) : (
            <>
              <div className="divide-y divide-outline-variant/10">
                {entries.map((entry) => (
                  <div key={entry.id} className="grid gap-0.5 px-6 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-on-surface">{entry.userName}</span>
                      <span className="rounded bg-surface-container-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                      <span className="text-xs text-secondary">{entry.entityType.replace("_", " ")} · {entry.entityId.slice(0, 12)}…</span>
                    </div>
                    <div className="text-xs text-secondary">{entry.summary}</div>
                    <div className="text-[11px] text-secondary/60">
                      {new Date(entry.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                ))}
              </div>
              {offset < total && (
                <div className="flex items-center justify-between border-t border-outline-variant/10 px-6 py-3">
                  <span className="text-xs text-secondary">Showing {offset} of {total}</span>
                  <Button size="sm" variant="outline" onClick={() => void load(offset)} disabled={loading}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ArrayTextarea({ value, onChange, placeholder, splitBy }: { value: string[]; onChange: (val: string[]) => void; placeholder?: string; splitBy: "comma" | "newline" }) {
  const [text, setText] = useState(value.join("\n"));
  // Keep the local textarea text in sync when the parent prop changes (e.g. server
  // reload of settings). Guarded: only setText when the parsed value actually differs
  // from the parent's array, so typing doesn't trigger a reset mid-edit.
  useEffect(() => {
    const pattern = splitBy === "comma" ? /\r?\n|,/ : /\r?\n/;
    const parsedLocal = text.split(pattern).map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(parsedLocal) !== JSON.stringify(value)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop→local sync
      setText(value.join("\n"));
    }
  }, [value, splitBy, text]);
  return <Textarea rows={4} placeholder={placeholder} value={text} onChange={(e) => { setText(e.target.value); const pattern = splitBy === "comma" ? /\r?\n|,/ : /\r?\n/; onChange(e.target.value.split(pattern).map((entry) => entry.trim()).filter(Boolean)); }} />;
}

export function SettingsView(props: SettingsViewProps) {
  const { users, settingsDraft, setSettingsDraft, dataSettings, backupStatus, backupArtifacts, backupLoading, backupRunning, backupError, fetchBackupStatus, runBackupNow, downloadLocalBackup, saveSettings, uploadBrandingImage, getSaveButtonLabel } = props;
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoUpload(file?: File | null) {
    if (!file) return;
    try {
      setUploadingLogo(true);
      const url = await uploadBrandingImage(file, "quotation-logo");
      setSettingsDraft((current) => ({ ...current, quotationLogoUrl: url }));
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
      <div className="space-y-6">
        <Card className="border border-outline-variant/20 shadow-sm">
          <CardHeader>
            <CardTitle>Settings summary</CardTitle>
            <CardDescription>Current routing, SLA, notification, and recovery defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-secondary">
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Default assignee</div>
              <div className="mt-2 text-base font-semibold text-on-surface">{users.find((u) => u.id === settingsDraft.advisorDefaultAssigneeId)?.name ?? "Not set"}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Business days</div>
              <div className="mt-2 text-base font-semibold text-on-surface">{settingsDraft.businessDays.map((day) => daysOfWeek[day]).join(", ")}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Notification emails</div>
              <div className="mt-2 text-base leading-7 text-on-surface">{(settingsDraft.internalNotificationEmails ?? []).join(", ") || "None configured"}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Escalation emails</div>
              <div className="mt-2 text-base leading-7 text-on-surface">{(settingsDraft.slaEscalationEmails ?? []).join(", ") || "None configured"}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Quotation CC emails</div>
              <div className="mt-2 text-base leading-7 text-on-surface">{(settingsDraft.quotationCcEmails ?? []).join(", ") || "None configured"}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Quotation branding</div>
              <div className="mt-2 text-base font-semibold text-on-surface">{settingsDraft.quotationBrandName || "Welden Industries"}</div>
              <div className="mt-2 text-sm leading-6 text-on-surface">{settingsDraft.quotationLogoUrl || "Placeholder logo will be used until a logo is uploaded."}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/20 shadow-sm">
          <CardHeader>
            <CardTitle>Backup and recovery</CardTitle>
            <CardDescription>Google Drive snapshots for restoring the app from GitHub onto a persistent server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-secondary">
            {backupStatus && !backupStatus.configured ? <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-amber-900">{backupStatus.configurationError ?? "Backup is not configured yet."}</div> : null}
            {backupError ? <div className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-on-error-container">{backupError}</div> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-surface-container-low p-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Last success</div><div className="mt-2 text-base font-semibold text-on-surface">{backupStatus?.lastSuccessAt ? fmtDate(backupStatus.lastSuccessAt) : "Not run yet"}</div></div>
              <div className="rounded-xl bg-surface-container-low p-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Last failure</div><div className="mt-2 text-base font-semibold text-on-surface">{backupStatus?.lastFailureAt ? fmtDate(backupStatus.lastFailureAt) : "No failures recorded"}</div></div>
              <div className="rounded-xl bg-surface-container-low p-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Latest snapshot</div><div className="mt-2 break-all text-base font-semibold text-on-surface">{backupStatus?.latestSnapshotName ?? "No snapshot yet"}</div></div>
              <div className="rounded-xl bg-surface-container-low p-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Latest secrets backup</div><div className="mt-2 break-all text-base font-semibold text-on-surface">{backupStatus?.latestSecretsName ?? "No secrets backup yet"}</div></div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Next scheduled runs (UTC)</div>
              <div className="mt-3 space-y-2">
                {backupStatus?.nextScheduledRunsUtc?.length ? backupStatus.nextScheduledRunsUtc.map((entry) => <div key={entry} className="rounded-lg bg-white px-3 py-2 text-on-surface shadow-sm">{fmtDate(entry)}</div>) : <div className="text-on-surface">Schedule not available.</div>}
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Recent Google Drive artifacts</div>
              <div className="mt-3 space-y-2">
                {backupLoading ? <div className="text-on-surface">Loading backup status...</div> : backupStatus && !backupStatus.configured ? <div className="text-on-surface">Configure Google Drive and backup secrets to start generating artifacts.</div> : backupArtifacts.length ? backupArtifacts.slice(0, 5).map((artifact) => <div key={artifact.id} className="rounded-lg bg-white px-3 py-3 shadow-sm"><div className="font-semibold text-on-surface">{artifact.name}</div><div className="mt-1 text-xs uppercase tracking-[0.16em] text-secondary">{artifact.kind}</div></div>) : <div className="text-on-surface">No backup artifacts found yet.</div>}
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Local admin downloads</div>
              <div className="mt-2 text-sm leading-6 text-on-surface">Download a fresh backup file directly to this computer before or after the scheduled Google Drive snapshot runs.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void runBackupNow()} disabled={backupRunning}>{backupRunning ? "Running backup..." : "Run backup now"}</Button>
              <Button variant="outline" onClick={() => void fetchBackupStatus()} disabled={backupLoading}>Refresh backup status</Button>
              <Button variant="outline" onClick={() => downloadLocalBackup("bundle")}>Download backup file</Button>
              <Button variant="outline" onClick={() => downloadLocalBackup("secrets")}>Download encrypted secrets</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-outline-variant/20 shadow-sm">
        <CardHeader>
          <CardTitle>Edit settings</CardTitle>
          <CardDescription>Control default ownership, operating hours, SLA behavior, and quotation branding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Default assignee</span>
              <select className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={settingsDraft.advisorDefaultAssigneeId} onChange={(e) => setSettingsDraft((current) => ({ ...current, advisorDefaultAssigneeId: e.target.value }))}>{users.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}</select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Business days</span>
              <div className="flex flex-wrap gap-2">{daysOfWeek.map((label, index) => <label key={label} className="inline-flex items-center gap-2 rounded-md bg-surface-container-low px-3 py-2 text-sm text-on-surface"><input type="checkbox" checked={settingsDraft.businessDays.includes(index)} onChange={(e) => setSettingsDraft((current) => ({ ...current, businessDays: e.target.checked ? [...current.businessDays, index].sort((a, b) => a - b) : current.businessDays.filter((day) => day !== index) }))} />{label}</label>)}</div>
            </label>
            <label className="grid gap-2 text-sm"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Business hour start</span><Input type="number" min="0" max="23" value={String(settingsDraft.businessHours.start)} onChange={(e) => setSettingsDraft((current) => ({ ...current, businessHours: { ...current.businessHours, start: Number(e.target.value) } }))} /></label>
            <label className="grid gap-2 text-sm"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Business hour end</span><Input type="number" min="1" max="24" value={String(settingsDraft.businessHours.end)} onChange={(e) => setSettingsDraft((current) => ({ ...current, businessHours: { ...current.businessHours, end: Number(e.target.value) } }))} /></label>
            <label className="grid gap-2 text-sm"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">First-response SLA days</span><Input type="number" min="1" value={String(settingsDraft.firstResponseSlaWorkingDays ?? 2)} onChange={(e) => setSettingsDraft((current) => ({ ...current, firstResponseSlaWorkingDays: Number(e.target.value) }))} /></label>
            <label className="grid gap-2 text-sm"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Reminder lead hours</span><Input type="number" min="1" value={String(settingsDraft.slaReminderLeadHours ?? 4)} onChange={(e) => setSettingsDraft((current) => ({ ...current, slaReminderLeadHours: Number(e.target.value) }))} /></label>
            <label className="grid gap-2 text-sm"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Escalation lead hours</span><Input type="number" min="1" value={String(settingsDraft.slaEscalationLeadHours ?? 24)} onChange={(e) => setSettingsDraft((current) => ({ ...current, slaEscalationLeadHours: Number(e.target.value) }))} /></label>
            <label className="grid gap-2 text-sm"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Stale lead threshold (days)</span><Input type="number" min="1" value={String(settingsDraft.staleLeadDays ?? 5)} onChange={(e) => setSettingsDraft((current) => ({ ...current, staleLeadDays: Number(e.target.value) }))} /></label>
            <div className="grid gap-2 text-sm md:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Internal notification emails</span><ArrayTextarea splitBy="comma" value={settingsDraft.internalNotificationEmails ?? []} onChange={(val) => setSettingsDraft((current) => ({ ...current, internalNotificationEmails: val }))} /></div>
            <div className="grid gap-2 text-sm md:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Escalation emails</span><ArrayTextarea splitBy="comma" value={settingsDraft.slaEscalationEmails ?? []} onChange={(val) => setSettingsDraft((current) => ({ ...current, slaEscalationEmails: val }))} /></div>
            <div className="grid gap-2 text-sm md:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Quotation CC emails</span><ArrayTextarea splitBy="comma" value={settingsDraft.quotationCcEmails ?? []} onChange={(val) => setSettingsDraft((current) => ({ ...current, quotationCcEmails: val }))} /></div>
            <div className="grid gap-2 text-sm md:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Chatbot quick action questions</span><ArrayTextarea splitBy="newline" placeholder="What is the price of the Automatic Pipe Cutting Machine?" value={settingsDraft.quickActionQuestions ?? []} onChange={(val) => setSettingsDraft((current) => ({ ...current, quickActionQuestions: val }))} /></div>
            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Quotation brand name</span>
              <Input value={settingsDraft.quotationBrandName ?? ""} onChange={(e) => setSettingsDraft((current) => ({ ...current, quotationBrandName: e.target.value }))} placeholder="Welden Industries" />
            </label>
            <div className="grid gap-3 text-sm md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Quotation logo</span>
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <Input value={settingsDraft.quotationLogoUrl ?? ""} onChange={(e) => setSettingsDraft((current) => ({ ...current, quotationLogoUrl: e.target.value }))} placeholder="/images/branding/uploads/welden-logo.png" />
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/20 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-fixed/30">
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => void handleLogoUpload(e.target.files?.[0])} disabled={uploadingLogo} />
                  {uploadingLogo ? "Uploading..." : "Upload logo"}
                </label>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4 text-sm leading-6 text-secondary">
                Recommended upload: PNG with transparent background, 1200 x 320 px source size, displayed around 220-260 px wide in the quotation email.
              </div>
              <div className="rounded-xl border border-outline-variant/12 bg-white p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Logo preview</div>
                <div className="mt-3 rounded-xl bg-[#0d1b2f] px-6 py-5">
                  <img src={settingsDraft.quotationLogoUrl?.trim() || "/images/branding/welden-placeholder-logo.svg"} alt={settingsDraft.quotationBrandName || "Welden Industries"} className="h-auto max-h-16 w-auto max-w-[240px]" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void saveSettings()}>{getSaveButtonLabel("settings-save", "Save settings")}</Button>
            <Button variant="outline" onClick={() => setSettingsDraft(dataSettings)}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* FEAT-02: audit log — lazy-loaded, admin only */}
      <AuditLogPanel />
    </div>
  );
}


