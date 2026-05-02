import { getVisibleLeadSessionsForUser } from "@/lib/lead-assistant-core";
import { getProductDrafts } from "@/lib/product-drafts";
import { getAdvisorSessions, runLeadFollowUpSweep } from "@/lib/leads";
import { getLeadAttentionState, getLeadScore, isLeadStale, isSameLocalDay } from "@/lib/lead-scoring";
import { normalizeProduct } from "@/lib/products";
import { getPreliminaryQuotations, getQuotationTemplates } from "@/lib/quotations";
import { getDeploymentHealth } from "@/lib/runtime-config";
import { ensureSiteSections } from "@/lib/site-sections";
import { readCollection } from "@/lib/store";
import type { AdvisorSession, DashboardSnapshot, DashboardSummary, KnowledgeDocument, Product, Settings, SiteSection, User } from "@/lib/types";

export type DashboardView =
  | "dashboard"
  | "leads"
  | "machines"
  | "site content"
  | "quotation templates"
  | "knowledge base"
  | "users"
  | "settings"
  | "full";

const emptySnapshot: DashboardSnapshot = {
  dashboardSummary: null,
  deploymentHealth: null,
  users: [],
  products: [],
  productDrafts: [],
  siteSections: [],
  knowledgeDocuments: [],
  advisorSessions: [],
  quotationTemplates: [],
  preliminaryQuotations: [],
  settings: {
    advisorDefaultAssigneeId: "",
    businessDays: [1, 2, 3, 4, 5],
    businessHours: { start: 10, end: 18 },
    internalNotificationEmails: []
  }
};

async function readSnapshotParts() {
  const [users, products, productDrafts, siteSections, knowledgeDocuments, advisorSessions, settings, quotationTemplates, preliminaryQuotations] = await Promise.all([
    readCollection<User[]>("users"),
    readCollection<Product[]>("products"),
    getProductDrafts(),
    readCollection<SiteSection[]>("site-sections"),
    readCollection<KnowledgeDocument[]>("knowledge-documents"),
    getAdvisorSessions(),
    readCollection<Settings>("settings"),
    getQuotationTemplates(),
    getPreliminaryQuotations()
  ]);

  return {
    users,
    products: products.map(normalizeProduct),
    productDrafts,
    siteSections: ensureSiteSections(siteSections),
    knowledgeDocuments,
    advisorSessions,
    settings,
    quotationTemplates,
    preliminaryQuotations
  };
}

type SnapshotParts = Awaited<ReturnType<typeof readSnapshotParts>>;

const openLeadStages = new Set(["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent"]);
const dashboardLeadStages = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent", "won", "lost"] as const;


function buildDashboardSummary(parts: SnapshotParts): DashboardSummary {
  const staleLeadDays = parts.settings.staleLeadDays ?? 5;
  const activeLeads = parts.advisorSessions.filter((session) => openLeadStages.has(session.workflow?.stage ?? "new"));
  const firstCallOpen = activeLeads.filter((session) => !session.workflow?.firstCallCompletedAt && !session.workflow?.lastContactedAt);
  const firstCallDueCount = firstCallOpen.filter((session) => {
    const dueAt = session.workflow?.firstCallDueAt ?? session.workflow?.nextFollowUpAt;
    return dueAt ? new Date(dueAt).getTime() <= Date.now() : false;
  }).length;
  const quotedLeadCount = parts.advisorSessions.filter((session) => session.workflow?.quoteIssued).length;
  const quotedAwaitingCallCount = activeLeads.filter((session) => session.workflow?.quoteIssued && !session.workflow?.lastContactedAt).length;
  const callbacksTodayCount = activeLeads.filter((session) => {
    const target = session.workflow?.preferredCallbackAt ?? session.workflow?.nextFollowUpAt;
    return target ? isSameLocalDay(target) : false;
  }).length;
  const retryQueueCount = activeLeads.filter((session) => ["no_answer", "call_back_later"].includes(session.workflow?.followUpStatus ?? "pending")).length;
  const staleLeadCount = activeLeads.filter((session) => isLeadStale(session, staleLeadDays)).length;
  const escalatedLeadCount = activeLeads.filter((session) => Boolean(session.workflow?.firstCallEscalationSentAt)).length;
  const stageCounts = dashboardLeadStages
    .map((stage) => ({ stage, count: parts.advisorSessions.filter((session) => (session.workflow?.stage ?? "new") === stage).length }))
    .filter((entry) => entry.count > 0);
  const machineInterest = Object.values(parts.advisorSessions.reduce((acc, session) => {
    const label = session.recommendation.recommendedCategory ?? session.answers.machineProblem ?? "Needs review";
    const normalized = label.trim();
    if (!normalized) return acc;
    if (!acc[normalized]) {
      acc[normalized] = { label: normalized, count: 0 };
    }
    acc[normalized].count += 1;
    return acc;
  }, {} as Record<string, { label: string; count: number }>)).sort((a, b) => b.count - a.count).slice(0, 4);
  const workNext = [...activeLeads]
    .sort((a, b) => {
      const rank = (session: AdvisorSession) => {
        const attention = getLeadAttentionState(session, staleLeadDays).label;
        if (attention === "Call overdue") return 0;
        if (attention === "Stale lead") return 1;
        if (attention === "Call due today") return 2;
        return 3;
      };
      return rank(a) - rank(b) || getLeadScore(b) - getLeadScore(a);
    })
    .slice(0, 3)
    .map((session) => ({
      id: session.id,
      name: session.lead.name || session.recommendation.recommendedCategory || "Lead",
      email: session.lead.email,
      category: session.recommendation.recommendedCategory ?? null,
      attentionLabel: getLeadAttentionState(session, staleLeadDays).label,
      attentionTone: getLeadAttentionState(session, staleLeadDays).tone
    }));

  return {
    leadCount: parts.advisorSessions.length,
    quotedLeadCount,
    firstCallOpenCount: firstCallOpen.length,
    firstCallDueCount,
    quotedAwaitingCallCount,
    callbacksTodayCount,
    retryQueueCount,
    staleLeadCount,
    escalatedLeadCount,
    publishedProductsCount: parts.products.filter((product) => product.published && product.slug?.trim() && product.title?.trim()).length,
    liveSectionsCount: parts.siteSections.filter((section) => section.published !== false && section.key !== "machine_details").length,
    activeKnowledgeDocumentsCount: parts.knowledgeDocuments.filter((doc) => doc.active).length,
    stageCounts,
    machineInterest,
    workNext
  };
}

const LEADS_PAGE_SIZE = 100;

function buildSnapshotForView(view: DashboardView, parts: SnapshotParts, offset = 0): DashboardSnapshot {
  const snapshot: DashboardSnapshot = {
    ...emptySnapshot,
    dashboardSummary: buildDashboardSummary(parts),
    deploymentHealth: getDeploymentHealth(),
    settings: parts.settings
  };

  switch (view) {
    case "dashboard":
      return {
        ...snapshot
      };
    case "leads":
      return {
        ...snapshot,
        users: parts.users,
        advisorSessions: parts.advisorSessions.slice(offset, offset + LEADS_PAGE_SIZE),
        advisorSessionsTotal: parts.advisorSessions.length
      };
    case "machines":
      return {
        ...snapshot,
        products: parts.products,
        productDrafts: parts.productDrafts,
        siteSections: parts.siteSections
      };
    case "site content":
      return {
        ...snapshot,
        siteSections: parts.siteSections
      };
    case "quotation templates":
      return {
        ...snapshot,
        products: parts.products,
        quotationTemplates: parts.quotationTemplates
      };
    case "knowledge base":
      return {
        ...snapshot,
        knowledgeDocuments: parts.knowledgeDocuments
      };
    case "users":
      return {
        ...snapshot,
        users: parts.users
      };
    case "settings":
      return {
        ...snapshot,
        users: parts.users
      };
    case "full":
    default:
      return {
        ...snapshot,
        users: parts.users,
        products: parts.products,
        productDrafts: parts.productDrafts,
        siteSections: parts.siteSections,
        knowledgeDocuments: parts.knowledgeDocuments,
        advisorSessions: parts.advisorSessions.slice(offset, offset + LEADS_PAGE_SIZE),
        advisorSessionsTotal: parts.advisorSessions.length,
        quotationTemplates: parts.quotationTemplates,
        preliminaryQuotations: parts.preliminaryQuotations
      };
  }
}

export async function getDashboardSnapshot(view: DashboardView = "full", offset = 0): Promise<DashboardSnapshot> {
  await runLeadFollowUpSweep();
  const parts = await readSnapshotParts();
  return buildSnapshotForView(view, parts, offset);
}

export async function getDashboardSnapshotForUser(user: User, view: DashboardView = "full", offset = 0): Promise<DashboardSnapshot> {
  if (user.role === "admin") {
    return getDashboardSnapshot(view, offset);
  }

  await runLeadFollowUpSweep();
  const parts = await readSnapshotParts();
  const scopedParts: SnapshotParts = {
    ...parts,
    advisorSessions: getVisibleLeadSessionsForUser(user, parts.advisorSessions),
    users: user.role === "manager" ? parts.users : parts.users.filter((entry) => entry.id === user.id),
    productDrafts: [],
    settings: emptySnapshot.settings,
    siteSections: [],
    knowledgeDocuments: [],
    quotationTemplates: [],
    preliminaryQuotations: []
  };

  return buildSnapshotForView(view, scopedParts, offset);
}
