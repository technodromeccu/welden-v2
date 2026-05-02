import { readCollection, writeCollection, makeId, nowIso } from "@/lib/store";

// FEAT-02: System-wide audit log for admin write operations.
// Captures who changed what, when, and what the top-level diff was.
// Stored in audit-log.json; displayed in the admin Settings view.

export type AuditEntityType =
  | "lead"
  | "product"
  | "site_section"
  | "knowledge_document"
  | "quotation_template"
  | "preliminary_quotation"
  | "user"
  | "settings"
  | "auth_account";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "password_changed"
  | "password_reset_requested"
  | "login"
  | "logout";

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Human-readable summary of what changed */
  summary: string;
}

/** Append a single audit entry. Fire-and-forget safe — errors are swallowed so they
 *  never break the primary operation being audited. */
export async function appendAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<void> {
  try {
    const log = await readCollection<AuditEntry[]>("audit-log");
    const newEntry: AuditEntry = {
      id: makeId("aud"),
      timestamp: nowIso(),
      ...entry
    };
    // Keep newest first; trim to 2000 entries to prevent unbounded growth
    log.unshift(newEntry);
    if (log.length > 2000) log.splice(2000);
    await writeCollection("audit-log", log);
  } catch {
    // Never let audit failures surface to callers
  }
}

/** Build a compact field-diff summary string from two plain objects. */
export function buildDiffSummary(before: Record<string, unknown>, after: Record<string, unknown>, fields?: string[]): string {
  const keys = fields ?? Object.keys({ ...before, ...after });
  const changed: string[] = [];

  for (const key of keys) {
    const prev = JSON.stringify(before[key] ?? null);
    const next = JSON.stringify(after[key] ?? null);
    if (prev !== next) {
      changed.push(key);
    }
  }

  if (!changed.length) return "No changes";
  return `Changed: ${changed.join(", ")}`;
}
