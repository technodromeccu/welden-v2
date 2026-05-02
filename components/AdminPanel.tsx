"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, BadgeAlert, Bot, CheckCircle2, Eye, FileText, Filter, GripVertical, LayoutDashboard, Library, LogOut, MessageSquare, PencilLine, Plus, Search, Settings2, TimerReset, Users, UserRoundPlus, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardView } from "@/components/admin/dashboard/DashboardView";
import { LeadsView } from "@/components/admin/leads/LeadsView";
import { AdminResidualViews } from "@/components/admin/AdminResidualViews";
import { SettingsView } from "@/components/admin/settings/SettingsView";
import { UsersView } from "@/components/admin/users/UsersView";
import { buildOffsetDateTimeInput, buildPresetDateTimeInput, buildProductPayload, buildQuotationTemplatePayload, daysOfWeek, emptyProductDraft, emptyQuotationTemplateDraft, fmtDate, fmtStatus, formatPipeItem, fromDateTimeInputValue, getDashboardViewForTab, getLeadAttentionState, getLeadFirstCallState, getLeadHealthBadges, getLeadNextStep, getLeadQualityBadge, getLeadScore, getLeadTemperature, getTabLabel, getTabShortLabel, iconForSiteSection, iconForTab, isLeadStale, isSameLocalDay, linesToText, machineDetailFieldGroups, parseNamedItems, parsePipeItem, splitCsv, templateToDraft, textToLines, toDateTimeInputValue, leadStageOptions } from "@/components/admin/shared/admin-panel-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBackupActions } from "@/hooks/admin/useBackupActions";
import { useLeadActions } from "@/hooks/admin/useLeadActions";
import { useProductUploads } from "@/hooks/admin/useProductUploads";
import { useAdminSnapshot } from "@/hooks/admin/useAdminSnapshot";
import { mergeProductWithDraft, normalizeProduct } from "@/lib/products";
import { ensureSiteSections } from "@/lib/site-sections";
import { cn } from "@/lib/utils";
import type { BackupArtifact, BackupStatus, DashboardSnapshot, HeroSlide, LeadStage, PreliminaryQuotationStatus, Product, ProductDraftRecord, QuotationTemplate, Settings, SiteSection, User } from "@/lib/types";

export function AdminPanel({ initialData, currentUser }: { initialData: DashboardSnapshot; currentUser: User }) {
  const makeEmptyProductDraft = (): typeof emptyProductDraft => ({
    ...emptyProductDraft,
    specs: [] as typeof emptyProductDraft.specs,
    howItWorks: [] as typeof emptyProductDraft.howItWorks,
    faqs: [] as typeof emptyProductDraft.faqs
  });
  const router = useRouter();
  const { api, data, setData, availableTabs, groupedTabs, tab, setTab, loadedTabs, setLoadedTabs, loadingTab, refresh, loadMoreLeads, loadingMoreLeads } = useAdminSnapshot(initialData, currentUser.role);
  const [searchTerm, setSearchTerm] = useState("");
  // FEAT-10: server-side search results — populated when searchTerm is non-empty via debounced fetch
  const [serverSearchResults, setServerSearchResults] = useState<DashboardSnapshot["advisorSessions"] | null>(null);
  const [serverSearchLoading, setServerSearchLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialData.advisorSessions[0]?.id ?? null);
  const [showLeadEditor, setShowLeadEditor] = useState(false);
  const [showSiteContentEditor, setShowSiteContentEditor] = useState(false);
  const [leadWorkflowDraft, setLeadWorkflowDraft] = useState({ stage: (initialData.advisorSessions[0]?.workflow?.stage ?? "new") as LeadStage, ownerUserId: initialData.advisorSessions[0]?.workflow?.ownerUserId ?? "", nextFollowUpAt: toDateTimeInputValue(initialData.advisorSessions[0]?.workflow?.nextFollowUpAt), preferredCallbackAt: toDateTimeInputValue(initialData.advisorSessions[0]?.workflow?.preferredCallbackAt), preferredCallbackNote: initialData.advisorSessions[0]?.workflow?.preferredCallbackNote ?? "", followUpStatus: initialData.advisorSessions[0]?.workflow?.followUpStatus ?? "pending", lastContactedAt: toDateTimeInputValue(initialData.advisorSessions[0]?.workflow?.lastContactedAt), closeReason: initialData.advisorSessions[0]?.workflow?.closeReason ?? "", closeReasonNote: initialData.advisorSessions[0]?.workflow?.closeReasonNote ?? "" });
  const [leadNoteDraft, setLeadNoteDraft] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialData.products[0]?.id ?? null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialData.knowledgeDocuments[0]?.id ?? null);
  const [productSearch, setProductSearch] = useState("");
  const [quotationSearch, setQuotationSearch] = useState("");
  const [selectedQuotationTemplateId, setSelectedQuotationTemplateId] = useState<string | null>(initialData.quotationTemplates[0]?.id ?? null);
  const [quotationTemplateDraft, setQuotationTemplateDraft] = useState(
    initialData.quotationTemplates[0] ? templateToDraft(initialData.quotationTemplates[0]) : emptyQuotationTemplateDraft
  );
  const [newQuotationTemplate, setNewQuotationTemplate] = useState(emptyQuotationTemplateDraft);
  const [showAddQuotationTemplate, setShowAddQuotationTemplate] = useState(false);
  const [showQuotationTemplateEditor, setShowQuotationTemplateEditor] = useState(false);
  const [draggedQuotationTemplateId, setDraggedQuotationTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recentlySavedKey, setRecentlySavedKey] = useState<string | null>(null);
  const initialSiteSections = ensureSiteSections(initialData.siteSections);
  const [siteDrafts, setSiteDrafts] = useState<Record<string, SiteSection>>(Object.fromEntries(initialSiteSections.map((section) => [section.key, section])));
  const [selectedSiteSectionKey, setSelectedSiteSectionKey] = useState<string>(initialSiteSections[0]?.key ?? "hero");
  const [selectedHeroSlideId, setSelectedHeroSlideId] = useState<string | null>(initialSiteSections.find((section) => section.key === "hero")?.slides?.[0]?.id ?? null);
  const [settingsDraft, setSettingsDraft] = useState<Settings>(initialData.settings);

  const [leadQuotationTemplateId, setLeadQuotationTemplateId] = useState("");
  const [leadQuoteSending, setLeadQuoteSending] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "agent" as User["role"], password: "", notificationPreference: "assigned_only" as User["notificationPreference"] });
  const [newDoc, setNewDoc] = useState({ title: "", summary: "", extractedText: "", sourceType: "text", active: true });
  const [docDraft, setDocDraft] = useState({ title: initialData.knowledgeDocuments[0]?.title ?? "", summary: initialData.knowledgeDocuments[0]?.summary ?? "", extractedText: initialData.knowledgeDocuments[0]?.extractedText ?? "", sourceType: initialData.knowledgeDocuments[0]?.sourceType ?? "text", active: initialData.knowledgeDocuments[0]?.active ?? true });
  const [showKnowledgeDocEditor, setShowKnowledgeDocEditor] = useState(false);
  const [showAddKnowledgeDoc, setShowAddKnowledgeDoc] = useState(false);
  const [newProduct, setNewProduct] = useState<typeof emptyProductDraft>(makeEmptyProductDraft);
  const [productDraft, setProductDraft] = useState<typeof emptyProductDraft>(makeEmptyProductDraft);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showProductEditor, setShowProductEditor] = useState(false);
  const [machineDraftBusy, setMachineDraftBusy] = useState<"save" | "publish" | "discard" | null>(null);
  const [isUploadingFeaturedImage, setIsUploadingFeaturedImage] = useState(false);
  const [isUploadingGalleryImages, setIsUploadingGalleryImages] = useState(false);
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  const [isUploadingBrochure, setIsUploadingBrochure] = useState(false);
  const [isUploadingNewFeaturedImage, setIsUploadingNewFeaturedImage] = useState(false);
  const [isUploadingNewHeroImage, setIsUploadingNewHeroImage] = useState(false);
  const [isUploadingNewGalleryImages, setIsUploadingNewGalleryImages] = useState(false);
  const [isUploadingNewBrochure, setIsUploadingNewBrochure] = useState(false);
  const [isSavingProductOrder, setIsSavingProductOrder] = useState(false);
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [draggedHeroSlideId, setDraggedHeroSlideId] = useState<string | null>(null);
  // WF-01: filter state
  const [stageFilters, setStageFilters] = useState<LeadStage[]>([]);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [slaFilter, setSlaFilter] = useState("");
  const [machineFilter, setMachineFilter] = useState("");
  // WF-02+WF-05: row quick action loading state
  const [rowQuickActionLoading, setRowQuickActionLoading] = useState<string | null>(null);

  // FEAT-10: debounced server-side search — fires 350ms after the user stops typing.
  // When active, serverSearchResults replaces the paginated data.advisorSessions as the source.
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setServerSearchResults(null);
      setServerSearchLoading(false);
      return;
    }
    setServerSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api(`/api/advisor-sessions/search?q=${encodeURIComponent(trimmed)}&limit=100`);
        const body = await res.json() as { sessions: DashboardSnapshot["advisorSessions"] };
        setServerSearchResults(body.sessions ?? []);
      } catch {
        setServerSearchResults(null);
      } finally {
        setServerSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [api, searchTerm]);

  // Source for the lead list: server results when a search is active, paginated data otherwise
  const sessionSource = serverSearchResults !== null ? serverSearchResults : data.advisorSessions;

  const filteredLeads = sessionSource.filter((session) => {
    // When server search is active, skip client text filtering — results are already filtered
    if (serverSearchResults === null) {
      const textMatch = [session.lead.name, session.lead.email, session.lead.phone, session.lead.company ?? "", session.recommendation.recommendedCategory ?? "", session.answers.machineProblem, session.recommendation.explanation, session.workflow?.stage ?? "", data.users.find((user) => user.id === session.workflow?.ownerUserId)?.name ?? ""].join(" ").toLowerCase().includes(searchTerm.toLowerCase());
      if (!textMatch) return false;
    }
    // WF-01: stage filter
    if (stageFilters.length > 0 && !stageFilters.includes(session.workflow?.stage ?? "new")) return false;
    // WF-01: owner filter
    if (ownerFilter === "mine") {
      if (session.workflow?.ownerUserId !== currentUser.id) return false;
    } else if (ownerFilter === "unassigned") {
      if (session.workflow?.ownerUserId) return false;
    } else if (ownerFilter) {
      if (session.workflow?.ownerUserId !== ownerFilter) return false;
    }
    // WF-01: machine filter
    if (machineFilter && (session.recommendation.recommendedCategory ?? "") !== machineFilter) return false;
    // WF-01: SLA filter (applied after leadsWithMeta, done below)
    return true;
  });
  const leadsWithMeta = filteredLeads.map((session) => {
    const score = getLeadScore(session);
    const owner = data.users.find((user) => user.id === session.workflow?.ownerUserId) ?? null;
    return {
      session,
      score,
      nextStep: getLeadNextStep(session),
      temperature: getLeadTemperature(score),
      owner
    };
  });
  // WF-01: apply SLA filter after meta is computed (needs staleLeadDays from settings)
  const staleLeadDaysEarly = initialData.settings.staleLeadDays ?? 5;
  const leadsWithMetaFiltered = slaFilter
    ? leadsWithMeta.filter((entry) => {
        const s = entry.session;
        if (slaFilter === "overdue") {
          const dueAt = s.workflow?.firstCallDueAt ?? s.workflow?.nextFollowUpAt;
          if (!dueAt) return false;
          return new Date(dueAt).getTime() <= Date.now() && !isSameLocalDay(dueAt);
        }
        if (slaFilter === "due_today") {
          const dueAt = s.workflow?.firstCallDueAt ?? s.workflow?.nextFollowUpAt;
          return dueAt ? isSameLocalDay(dueAt) : false;
        }
        if (slaFilter === "stale") {
          return isLeadStale(s, staleLeadDaysEarly);
        }
        return true;
      })
    : leadsWithMeta;
  const activeFilterCount = stageFilters.length + (ownerFilter ? 1 : 0) + (slaFilter ? 1 : 0) + (machineFilter ? 1 : 0);
  function clearAllFilters() {
    setStageFilters([]);
    setOwnerFilter("");
    setSlaFilter("");
    setMachineFilter("");
  }
  const machineCategories = Array.from(new Set(data.advisorSessions.map((s) => s.recommendation.recommendedCategory ?? "").filter(Boolean))).sort();

  const selectedLeadMeta = leadsWithMeta.find((entry) => entry.session.id === selectedLeadId) ?? leadsWithMeta[0] ?? null;
  const selectedLead = selectedLeadMeta?.session ?? null;
  const leadQuotationProductId = selectedLead?.recommendation.recommendedProductId ?? selectedLead?.diagnostics?.matchedProductId ?? null;
  const leadQuotationTemplates = useMemo(() => {
    const activeTemplates = data.quotationTemplates.filter((template) => template.active);
    if (!leadQuotationProductId) {
      return activeTemplates;
    }
    const matchedTemplates = activeTemplates.filter((template) => template.productId === leadQuotationProductId);
    return matchedTemplates.length ? matchedTemplates : activeTemplates;
  }, [data.quotationTemplates, leadQuotationProductId]);
  const selectedLeadQuotationTemplate = leadQuotationTemplates.find((template) => template.id === leadQuotationTemplateId) ?? leadQuotationTemplates[0] ?? null;
  const backupActions = useBackupActions(api);
  const leadActions = useLeadActions({
    api,
    refresh,
    markSaved,
    setNotice,
    setError,
    selectedLead,
    selectedLeadQuotationTemplate,
    leadWorkflowDraft,
    leadNoteDraft,
    setLeadNoteDraft
  });
  // WF-02+WF-05: row-level quick actions (no full editor required)
  async function applyRowQuickAction(sessionId: string, action: "no_answer" | "mark_contacted" | "follow_up_tomorrow") {
    setRowQuickActionLoading(sessionId);
    const payload: Record<string, string | null> = {};
    if (action === "no_answer") {
      payload.followUpStatus = "no_answer";
      payload.nextFollowUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      payload.lastContactedAt = new Date().toISOString();
      payload.note = "Call attempted. No answer from the lead.";
    } else if (action === "mark_contacted") {
      payload.lastContactedAt = new Date().toISOString();
    } else if (action === "follow_up_tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 30, 0, 0);
      payload.nextFollowUpAt = tomorrow.toISOString();
      payload.followUpStatus = "scheduled";
    }
    try {
      await api(`/api/advisor-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await refresh("leads", true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quick action failed.");
    } finally {
      setRowQuickActionLoading(null);
    }
  }

  const productUploads = useProductUploads(api);
  const selectedDoc = data.knowledgeDocuments.find((d) => d.id === selectedDocId) ?? data.knowledgeDocuments[0] ?? null;
  const normalizedProducts = data.products.filter(Boolean).map((product) => normalizeProduct(product));
  const normalizedProductDrafts = data.productDrafts.filter(Boolean) as ProductDraftRecord[];
  const selectedPublishedProduct = normalizedProducts.find((p) => p.id === selectedProductId) ?? normalizedProducts[0] ?? null;
  const selectedProductDraftRecord = normalizedProductDrafts.find((draft) => draft.productId === selectedPublishedProduct?.id) ?? null;
  const selectedProduct = selectedPublishedProduct ? mergeProductWithDraft(selectedPublishedProduct, selectedProductDraftRecord) : null;
  const visibleSiteSections = Object.values(siteDrafts).filter((section) => section.key !== "machine_details");
  const selectedSiteSection = siteDrafts[selectedSiteSectionKey] ?? visibleSiteSections[0] ?? null;
  const filteredProducts = normalizedProducts.filter((product) => [product.title ?? "", product.category ?? "", product.slug ?? "", ...(product.capabilities ?? [])].join(" ").toLowerCase().includes(productSearch.toLowerCase()));
  const filteredQuotationTemplates = data.quotationTemplates.filter((template) => [template.title, template.machineName, template.variantLabel ?? "", template.basePrice, template.productSlug ?? ""].join(" ").toLowerCase().includes(quotationSearch.toLowerCase()));
  const selectedQuotationTemplate = data.quotationTemplates.find((template) => template.id === selectedQuotationTemplateId) ?? data.quotationTemplates[0] ?? null;
  const selectedQuotationTemplateLinkedProduct = data.products.find((product) => product.id === (quotationTemplateDraft.productId || selectedQuotationTemplate?.productId)) ?? null;
  const heroSlides = useMemo(() => (selectedSiteSection?.key === "hero" ? (selectedSiteSection.slides ?? []) : []), [selectedSiteSection]);
  const selectedHeroSlide = heroSlides.find((slide) => slide.id === selectedHeroSlideId) ?? heroSlides[0] ?? null;
  const machineDetailItems = parseNamedItems(siteDrafts.machine_details?.items);
  const grounded = data.advisorSessions.filter((s) => s.diagnostics?.found).length;
  const publishedProducts = normalizedProducts.filter((product) => product.published && product.slug?.trim() && product.title?.trim());
  const liveSectionsCount = Object.values(siteDrafts).filter((section) => section.published !== false).length;
  const staleLeadDays = data.settings.staleLeadDays ?? 5;
  const hotLeads = [...leadsWithMeta].sort((a, b) => b.score - a.score || new Date(b.session.createdAt).getTime() - new Date(a.session.createdAt).getTime());
  const openLeadStages: LeadStage[] = ["new", "quoted", "contact_scheduled", "contacted", "qualified", "proposal_sent"];
  const firstCallOpenLeads = hotLeads.filter((entry) => !entry.session.workflow?.firstCallCompletedAt && !entry.session.workflow?.lastContactedAt && !["won", "lost"].includes(entry.session.workflow?.stage ?? "new"));
  const firstCallDueCount = firstCallOpenLeads.filter((entry) => {
    const dueAt = entry.session.workflow?.firstCallDueAt ?? entry.session.workflow?.nextFollowUpAt;
    return dueAt ? new Date(dueAt).getTime() <= Date.now() : false;
  }).length;
  const staleLeadCount = hotLeads.filter((entry) => isLeadStale(entry.session, staleLeadDays)).length;
  const escalatedLeadCount = hotLeads.filter((entry) => Boolean(entry.session.workflow?.firstCallEscalationSentAt)).length;
  const workNextLeads = [...hotLeads]
    .filter((entry) => !["won", "lost"].includes(entry.session.workflow?.stage ?? "new"))
    .sort((a, b) => {
      const rank = (session: DashboardSnapshot["advisorSessions"][number]) => {
        const attention = getLeadAttentionState(session, staleLeadDays).label;
        if (attention === "Call overdue") return 0;
        if (attention === "Stale lead") return 1;
        if (attention === "Call due today") return 2;
        return 3;
      };
      return rank(a.session) - rank(b.session) || b.score - a.score;
    })
    .slice(0, 3);
  const quotedAwaitingCallCount = leadsWithMeta.filter((entry) => entry.session.workflow?.quoteIssued && !entry.session.workflow?.lastContactedAt && !["won", "lost"].includes(entry.session.workflow?.stage ?? "new")).length;
  const callbacksTodayCount = leadsWithMeta.filter((entry) => {
    const target = entry.session.workflow?.preferredCallbackAt ?? entry.session.workflow?.nextFollowUpAt;
    if (!target) return false;
    return isSameLocalDay(target);
  }).length;

  // WF-03: Today's Queue — structured triage for daily work
  const openLeadsForQueue = leadsWithMeta.filter((entry) => !["won", "lost"].includes(entry.session.workflow?.stage ?? "new"));
  const todayQueue = {
    callbacksToday: openLeadsForQueue.filter((entry) => {
      const target = entry.session.workflow?.preferredCallbackAt ?? entry.session.workflow?.nextFollowUpAt;
      return target ? isSameLocalDay(target) : false;
    }),
    followUpsDue: openLeadsForQueue.filter((entry) => {
      const dueAt = entry.session.workflow?.nextFollowUpAt;
      if (!dueAt) return false;
      return new Date(dueAt).getTime() <= Date.now() && !isSameLocalDay(dueAt);
    }),
    firstCallsOverdue: openLeadsForQueue.filter((entry) => {
      const s = entry.session;
      if (s.workflow?.firstCallCompletedAt || s.workflow?.lastContactedAt) return false;
      const dueAt = s.workflow?.firstCallDueAt;
      return dueAt ? new Date(dueAt).getTime() <= Date.now() : false;
    })
  };
  const retryQueueCount = leadsWithMeta.filter((entry) => ["no_answer", "call_back_later"].includes(entry.session.workflow?.followUpStatus ?? "pending") && !["won", "lost"].includes(entry.session.workflow?.stage ?? "new")).length;
  const assistantOverview = {
    leadsNeedingCallUpdate: leadsWithMeta.filter((entry) => {
      const workflow = entry.session.workflow;
      if (!workflow || ["won", "lost"].includes(workflow.stage ?? "new")) return false;
      return Boolean(workflow.pendingAssistantPrompt) || Boolean(workflow.lastContactedAt && !workflow.lastCallOutcome);
    }).length,
    callbacksDueNow: leadsWithMeta.filter((entry) => {
      const target = entry.session.workflow?.preferredCallbackAt ?? entry.session.workflow?.nextFollowUpAt ?? null;
      return target ? new Date(target).getTime() <= Date.now() : false;
    }).length,
    quotationsNeedingFollowUp: leadsWithMeta.filter((entry) => entry.session.workflow?.quoteIssued && !entry.session.workflow?.lastCallOutcome && !["won", "lost"].includes(entry.session.workflow?.stage ?? "new")).length,
    leadsWaitingOnAssets: leadsWithMeta.filter((entry) => ["send_brochure", "needs_more_details"].includes(entry.session.workflow?.lastCallOutcome ?? "")).length
  };
  const stageCounts = leadStageOptions.map((stage) => ({ stage, count: data.advisorSessions.filter((session) => (session.workflow?.stage ?? "new") === stage).length })).filter((entry) => entry.count > 0);
  const machineInterest = Object.values(data.advisorSessions.reduce<Record<string, { label: string; count: number }>>((acc, record) => {
    const label = record.recommendation.recommendedCategory ?? record.answers.machineProblem ?? "Needs review";
    const normalized = label.trim();
    if (!normalized) return acc;
    if (!acc[normalized]) {
      acc[normalized] = { label: normalized, count: 0 };
    }
    acc[normalized].count += 1;
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 4);
  const dashboardSummary = data.dashboardSummary;
  const dashboardLeadCount = dashboardSummary?.leadCount ?? filteredLeads.length;
  const dashboardQuotedLeadCount = dashboardSummary?.quotedLeadCount ?? data.advisorSessions.filter((session) => session.workflow?.quoteIssued).length;
  const dashboardFirstCallOpenCount = dashboardSummary?.firstCallOpenCount ?? firstCallOpenLeads.length;
  const dashboardFirstCallDueCount = dashboardSummary?.firstCallDueCount ?? firstCallDueCount;
  const dashboardQuotedAwaitingCallCount = dashboardSummary?.quotedAwaitingCallCount ?? quotedAwaitingCallCount;
  const dashboardCallbacksTodayCount = dashboardSummary?.callbacksTodayCount ?? callbacksTodayCount;
  const dashboardRetryQueueCount = dashboardSummary?.retryQueueCount ?? retryQueueCount;
  const dashboardStaleLeadCount = dashboardSummary?.staleLeadCount ?? staleLeadCount;
  const dashboardEscalatedLeadCount = dashboardSummary?.escalatedLeadCount ?? escalatedLeadCount;
  const dashboardPublishedProductsCount = dashboardSummary?.publishedProductsCount ?? publishedProducts.length;
  const dashboardLiveSectionsCount = dashboardSummary?.liveSectionsCount ?? liveSectionsCount;
  const dashboardActiveKnowledgeDocumentsCount = dashboardSummary?.activeKnowledgeDocumentsCount ?? data.knowledgeDocuments.filter((doc) => doc.active).length;
  const dashboardStageCounts = dashboardSummary?.stageCounts ?? stageCounts;
  const dashboardMachineInterest = dashboardSummary?.machineInterest ?? machineInterest;
  const dashboardWorkNext = dashboardSummary?.workNext ?? [];
  const deploymentHealth = data.deploymentHealth ?? initialData.deploymentHealth ?? null;
  const cockpitMetrics = [
    { label: currentUser.role === "agent" ? "My calls due" : "Calls due", value: dashboardFirstCallDueCount, tone: "text-amber-600" },
    { label: "Callbacks today", value: dashboardCallbacksTodayCount, tone: "text-primary" },
    { label: "Quoted awaiting follow-up", value: dashboardQuotedAwaitingCallCount, tone: "text-on-surface" }
  ];
  const pageHeader = useMemo(() => {
    switch (tab) {
      case "dashboard":
        return {
          eyebrow: "Welden",
          title: "Today",
          description: "Calls due, callbacks today, and the next lead that needs attention.",
          chips: []
        };
      case "leads":
        return {
          eyebrow: "Welden",
          title: "Pipeline",
          description: "Open a lead, update the deal, and keep follow-ups moving without visual clutter.",
          chips: []
        };
      case "machines":
        return {
          eyebrow: "Machine workspace",
          title: "Machines",
          description: "Edit each machine in one place with draft saves, live admin preview, and explicit publish control.",
          chips: [
            `Role ${currentUser.role}`,
            `Machines ${data.products.length}`,
            `Drafts ${data.productDrafts.length}`
          ]
        };
      case "site content":
        return {
          eyebrow: "Public messaging",
          title: "Content",
          description: "Tune the homepage narrative, trust blocks, and conversion content that feed the commercial funnel.",
          chips: [
            `Role ${currentUser.role}`,
            `Sections ${visibleSiteSections.length}`,
            "Homepage live"
          ]
        };
      case "quotation templates":
        return {
          eyebrow: "Commercial playbooks",
          title: "Quotes",
          description: "Maintain the quotation structure, pricing language, and machine-linked templates that move buyers toward a sales conversation.",
          chips: [
            `Role ${currentUser.role}`,
            `Templates ${data.quotationTemplates.length}`,
            `Active ${data.quotationTemplates.filter((template) => template.active).length}`
          ]
        };
      case "knowledge base":
        return {
          eyebrow: "Sales intelligence",
          title: "Knowledge",
          description: "Keep recommendation grounding and internal reference material current so staff can move faster with cleaner answers.",
          chips: [
            `Role ${currentUser.role}`,
            `Sources ${data.knowledgeDocuments.length}`,
            `Active ${data.knowledgeDocuments.filter((doc) => doc.active).length}`
          ]
        };
      case "users":
        return {
          eyebrow: "Commercial team",
          title: "Team",
          description: "Manage staff accounts, routing access, and who sees which parts of the operation.",
          chips: [
            `Role ${currentUser.role}`,
            `Team ${data.users.length}`,
            `Active ${data.users.filter((user) => user.active).length}`
          ]
        };
      case "settings":
        return {
          eyebrow: "Operating rules",
          title: "Settings",
          description: "Control assignment defaults, SLA timing, notifications, and the rules that shape the day-to-day cockpit.",
          chips: [
            `Role ${currentUser.role}`,
            `Business days ${settingsDraft.businessDays.length}`,
            `Alerts ${(settingsDraft.internalNotificationEmails ?? []).length}`
          ]
        };
      default:
        return {
          eyebrow: "Operations workspace",
          title: getTabLabel(tab),
          description: "Commercial workspace for pipeline work, content readiness, and team operations.",
          chips: [`Role ${currentUser.role}`]
        };
    }
  }, [tab, currentUser.role, data.products, data.productDrafts, data.knowledgeDocuments, data.users, data.quotationTemplates, settingsDraft.businessDays.length, settingsDraft.internalNotificationEmails, visibleSiteSections.length]);

  useEffect(() => {
    if (!recentlySavedKey) return;
    const timeout = window.setTimeout(() => setRecentlySavedKey(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [recentlySavedKey]);

  function markSaved(key: string) {
    setRecentlySavedKey(key);
  }

  function getSaveButtonLabel(key: string, label: string) {
    return recentlySavedKey === key ? "Saved" : label;
  }

  function getCreateButtonLabel(key: string, label: string) {
    return recentlySavedKey === key ? "Created" : label;
  }

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (tab === "site content" && selectedSiteSectionKey === "machine_details" && visibleSiteSections[0]) {
      setSelectedSiteSectionKey(visibleSiteSections[0].key);
    }
  }, [tab, selectedSiteSectionKey, visibleSiteSections]);
  useEffect(() => {
    const nextSiteSections = ensureSiteSections(data.siteSections);
    setSiteDrafts(Object.fromEntries(nextSiteSections.map((section) => [section.key, section])));
  }, [data.siteSections]);
  useEffect(() => {
    setSettingsDraft(data.settings);
  }, [data.settings]);

  useEffect(() => {
    if (!selectedPublishedProduct) return;
    const mergedProduct = selectedProductDraftRecord
      ? mergeProductWithDraft(selectedPublishedProduct, selectedProductDraftRecord)
      : selectedPublishedProduct;
    const safeProduct = normalizeProduct(mergedProduct);
    const productMedia = safeProduct.media;
    const primaryImage = safeProduct.featuredImage ?? productMedia[0] ?? "";
    const nextDraft = {
      title: safeProduct.title, slug: safeProduct.slug, category: safeProduct.category, summary: safeProduct.summary,
      detailedDescription: safeProduct.detailedDescription ?? "", brochureUrl: safeProduct.brochureUrl,
      featuredImage: primaryImage, heroImage: safeProduct.heroImage ?? primaryImage, heroTitle: safeProduct.heroTitle ?? "", usp: safeProduct.usp ?? "", heroImagePosition: safeProduct.heroImagePosition ?? "center center", videoUrl: safeProduct.videoUrl ?? "",
      media: productMedia.filter((m) => m !== primaryImage).join(", "),
      capabilities: (safeProduct.capabilities ?? []).join(", "), idealUseCases: (safeProduct.idealUseCases ?? []).join(", "),
      industries: (safeProduct.industries ?? []).join(", "), heroPoints: (safeProduct.heroPoints ?? []).join(", "),
      landingCardLayout: safeProduct.landingCardLayout ?? [],
      machinePageLayout: safeProduct.machinePageLayout ?? [],
      specs: safeProduct.specs ?? [], howItWorks: safeProduct.howItWorks ?? [], faqs: safeProduct.faqs ?? [],
      machinePageSectionOrder: safeProduct.machinePageSectionOrder ?? [],
      published: safeProduct.published, accent: safeProduct.accent
    };
    setProductDraft((current) => JSON.stringify(current) === JSON.stringify(nextDraft) ? current : nextDraft);
  }, [
    selectedPublishedProduct?.id,
    selectedPublishedProduct?.updatedAt,
    selectedProductDraftRecord?.productId,
    selectedProductDraftRecord?.updatedAt
  ]);
  useEffect(() => {
    if (!selectedDoc) return;
    setDocDraft({
      title: selectedDoc.title,
      summary: selectedDoc.summary,
      extractedText: selectedDoc.extractedText,
      sourceType: selectedDoc.sourceType,
      active: selectedDoc.active
    });
  }, [selectedDoc]);
  useEffect(() => {
    if (!selectedLead) return;
    setLeadWorkflowDraft({
      stage: selectedLead.workflow?.stage ?? "new",
      ownerUserId: selectedLead.workflow?.ownerUserId ?? "",
      nextFollowUpAt: toDateTimeInputValue(selectedLead.workflow?.nextFollowUpAt),
      preferredCallbackAt: toDateTimeInputValue(selectedLead.workflow?.preferredCallbackAt),
      preferredCallbackNote: selectedLead.workflow?.preferredCallbackNote ?? "",
      followUpStatus: selectedLead.workflow?.followUpStatus ?? "pending",
      lastContactedAt: toDateTimeInputValue(selectedLead.workflow?.lastContactedAt),
      closeReason: selectedLead.workflow?.closeReason ?? "",
      closeReasonNote: selectedLead.workflow?.closeReasonNote ?? ""
    });
    setLeadNoteDraft("");
  }, [selectedLead]);
  useEffect(() => {
    setLeadQuotationTemplateId((current) => leadQuotationTemplates.some((template) => template.id === current) ? current : (leadQuotationTemplates[0]?.id ?? ""));
  }, [selectedLead, leadQuotationTemplates]);
  useEffect(() => {
    if (!selectedQuotationTemplate) {
      setQuotationTemplateDraft(emptyQuotationTemplateDraft);
      return;
    }
    setQuotationTemplateDraft(templateToDraft(selectedQuotationTemplate));
  }, [selectedQuotationTemplate]);
  useEffect(() => {
    if (selectedSiteSectionKey !== "hero") return;
    if (!heroSlides.length) {
      if (selectedHeroSlideId !== null) setSelectedHeroSlideId(null);
      return;
    }
    if (!selectedHeroSlideId || !heroSlides.some((slide) => slide.id === selectedHeroSlideId)) {
      setSelectedHeroSlideId(heroSlides[0].id);
    }
  }, [selectedSiteSectionKey, heroSlides, selectedHeroSlideId]);
  useEffect(() => {
    if (tab === "settings" && !backupActions.backupLoading && !backupActions.backupStatus) {
      void backupActions.fetchBackupStatus();
    }
  }, [tab, backupActions.backupLoading, backupActions.backupStatus, backupActions.fetchBackupStatus]);

  function csvCell(value: unknown) {
    const normalized = value == null ? "" : String(value);
    return '"' + normalized.replace(/"/g, '""') + '"';
  }

  async function uploadMediaImage(file: File, folderHint: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderHint", folderHint);
    const response = await api("/api/uploads/product-image", { method: "POST", body: formData });
    const payload = await response.json() as { url: string };
    return payload.url;
  }
  function updateSiteSection(sectionKey: string, patch: Partial<SiteSection>) {
    setSiteDrafts((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        ...patch
      }
    }));
  }

  function updateNamedSiteItem(sectionKey: string, itemKey: string, value: string) {
    const currentItems = siteDrafts[sectionKey]?.items ?? [];
    const plainItems = currentItems.filter((item) => !item.includes("|"));
    const currentNamedItems = parseNamedItems(currentItems);
    const nextItems: Record<string, string> = {
      ...currentNamedItems,
      [itemKey]: value
    };
    updateSiteSection(sectionKey, {
      items: [
        ...plainItems,
        ...Object.entries(nextItems)
          .filter(([key, itemValue]) => key.trim() && itemValue.trim())
          .map(([key, itemValue]) => `${key}|${itemValue}`)
      ]
    });
  }

  function updatePlainSiteItem(sectionKey: string, index: number, value: string, minimumRows = 0) {
    const currentItems = siteDrafts[sectionKey]?.items ?? [];
    const plainItems = currentItems.filter((item) => !item.includes("|"));
    const namedItems = currentItems.filter((item) => item.includes("|"));
    plainItems[index] = value;
    updateSiteSection(sectionKey, {
      items: [
        ...plainItems.filter((item, itemIndex) => item.trim() || itemIndex < minimumRows),
        ...namedItems
      ]
    });
  }

  function updateHeroSlides(updater: (slides: HeroSlide[]) => HeroSlide[]) {
    if (selectedSiteSectionKey !== "hero") return;
    setSiteDrafts((current) => {
      const heroSection = current.hero ?? { key: "hero", title: "", eyebrow: "", body: "", slides: [] };
      return {
        ...current,
        hero: {
          ...heroSection,
          slides: updater([...(heroSection.slides ?? [])])
        }
      };
    });
  }

  function updateHeroSlide(slideId: string, patch: Partial<HeroSlide>) {
    updateHeroSlides((slides) => slides.map((slide) => slide.id === slideId ? { ...slide, ...patch } : slide));
  }

  function createHeroSlide() {
    const id = `hero-slide-${Math.random().toString(36).slice(2, 8)}`;
    const slide: HeroSlide = {
      id,
      eyebrow: "New hero slide",
      title: "New hero headline",
      summary: "Add a short one-line value proposition.",
      imageUrl: "",
      imagePosition: "center center"
    };
    updateHeroSlides((slides) => [...slides, slide]);
    setSelectedHeroSlideId(id);
  }

  function deleteHeroSlide(slideId: string) {
    const slide = heroSlides.find((entry) => entry.id === slideId);
    if (!window.confirm(`Delete ${slide?.title ?? "this hero slide"}?`)) {
      return;
    }
    const nextSlides = heroSlides.filter((slide) => slide.id !== slideId);
    updateHeroSlides(() => nextSlides);
    if (selectedHeroSlideId === slideId) {
      setSelectedHeroSlideId(nextSlides[0]?.id ?? null);
    }
  }

  function moveHeroSlide(dragId: string, targetId: string) {
    if (!dragId || dragId === targetId) {
      setDraggedHeroSlideId(null);
      return;
    }
    updateHeroSlides((slides) => {
      const dragIndex = slides.findIndex((slide) => slide.id === dragId);
      const targetIndex = slides.findIndex((slide) => slide.id === targetId);
      if (dragIndex < 0 || targetIndex < 0 || dragIndex === targetIndex) return slides;
      const next = [...slides];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setSelectedHeroSlideId(dragId);
    setDraggedHeroSlideId(null);
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }

  // WF-08: Bulk update — fires parallel PATCHes for each selected lead
  async function bulkPatchLeads(sessionIds: string[], patch: { stage?: string; ownerUserId?: string | null }) {
    if (!sessionIds.length) return false;
    try {
      await Promise.all(
        sessionIds.map((id) =>
          api(`/api/advisor-sessions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch)
          })
        )
      );
      await refresh("leads", true);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Bulk update failed.");
      return false;
    }
  }
  async function saveLeadWorkflow(options?: { markContactedNow?: boolean }) {
    if (!selectedLead) return;
    try {
      await api(`/api/advisor-sessions/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: leadWorkflowDraft.stage,
          ownerUserId: leadWorkflowDraft.ownerUserId || null,
          nextFollowUpAt: fromDateTimeInputValue(leadWorkflowDraft.nextFollowUpAt),
          lastContactedAt: options?.markContactedNow ? new Date().toISOString() : fromDateTimeInputValue(leadWorkflowDraft.lastContactedAt),
          note: leadNoteDraft.trim() || undefined,
          closeReason: leadWorkflowDraft.closeReason.trim() || null,
          closeReasonNote: leadWorkflowDraft.closeReasonNote.trim() || null
        })
      });
      setNotice(options?.markContactedNow ? "Lead contact logged." : "Lead workflow updated.");
      if (!options?.markContactedNow) markSaved("lead-workflow");
      setError(null);
      setLeadNoteDraft("");
      await refresh(tab, true);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update lead."); }
  }
  async function applyLeadFollowUpAction(action: "one_hour" | "tomorrow_morning" | "align_callback" | "mark_no_answer" | "mark_complete") {
    if (!selectedLead) return;
    const payload: Record<string, string | null> = {};
    if (action === "one_hour") {
      payload.nextFollowUpAt = fromDateTimeInputValue(buildOffsetDateTimeInput(1));
      payload.followUpStatus = "scheduled";
    }
    if (action === "tomorrow_morning") {
      payload.nextFollowUpAt = fromDateTimeInputValue(buildPresetDateTimeInput(1, 10, 30));
      payload.followUpStatus = "scheduled";
    }
    if (action === "align_callback") {
      if (!leadWorkflowDraft.preferredCallbackAt) {
        setError("Set a preferred callback time before using the callback window shortcut.");
        return;
      }
      payload.nextFollowUpAt = fromDateTimeInputValue(leadWorkflowDraft.preferredCallbackAt);
      payload.preferredCallbackAt = fromDateTimeInputValue(leadWorkflowDraft.preferredCallbackAt);
      payload.preferredCallbackNote = leadWorkflowDraft.preferredCallbackNote.trim() || null;
      payload.followUpStatus = "scheduled";
    }
    if (action === "mark_no_answer") {
      payload.followUpStatus = "no_answer";
      payload.nextFollowUpAt = fromDateTimeInputValue(buildPresetDateTimeInput(1, 11, 0));
      payload.lastContactedAt = new Date().toISOString();
      payload.note = "Call attempted. No answer from the lead.";
    }
    if (action === "mark_complete") {
      payload.followUpStatus = "completed";
      payload.nextFollowUpAt = null;
      payload.lastContactedAt = new Date().toISOString();
      payload.note = "Follow-up loop marked complete.";
    }

    try {
      await api(`/api/advisor-sessions/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setNotice(action === "mark_no_answer" ? "Call attempt logged." : action === "mark_complete" ? "Follow-up marked complete." : "Lead follow-up updated.");
      markSaved("lead-workflow");
      setError(null);
      await refresh(tab, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update lead follow-up.");
    }
  }

  async function saveProduct() {
    if (!selectedPublishedProduct) return;
    try {
      setMachineDraftBusy("save");
      await api(`/api/products/${selectedPublishedProduct.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProductPayload(productDraft))
      });
      setNotice("Machine draft saved.");
      markSaved("machine-draft-save");
      setError(null);
      await refresh("machines", true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save machine draft.");
    } finally {
      setMachineDraftBusy(null);
    }
  }
  async function publishMachine() {
    if (!selectedPublishedProduct) return;
    try {
      setMachineDraftBusy("publish");
      await api(`/api/products/${selectedPublishedProduct.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProductPayload(productDraft))
      });
      await api(`/api/products/${selectedPublishedProduct.id}/publish`, { method: "POST" });
      setNotice("Machine published.");
      markSaved("machine-publish");
      setError(null);
      await refresh("machines", true);
      await refresh("dashboard", true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to publish machine.");
    } finally {
      setMachineDraftBusy(null);
    }
  }
  async function discardMachineDraft() {
    if (!selectedPublishedProduct) return;
    try {
      setMachineDraftBusy("discard");
      await api(`/api/products/${selectedPublishedProduct.id}/draft`, { method: "DELETE" });
      setNotice("Draft discarded.");
      setError(null);
      await refresh("machines", true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to discard draft.");
    } finally {
      setMachineDraftBusy(null);
    }
  }
  async function createProduct() {
    try {
      const response = await api("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProductPayload({ ...newProduct, published: false }))
      });
      const created = await response.json() as Product;
      setNotice("Machine created as draft.");
      markSaved("product-create");
      setError(null);
      setNewProduct(makeEmptyProductDraft());
      setShowAddProduct(false);
      setShowProductEditor(true);
      setSelectedProductId(created.id);
      setLoadedTabs((current) => ({ ...current, machines: false, dashboard: false }));
      await refresh("machines", true);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create product."); }
  }
  async function saveQuotationTemplate() {
    if (!selectedQuotationTemplate) return;
    try {
      await api(`/api/quotation-templates/${selectedQuotationTemplate.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildQuotationTemplatePayload(quotationTemplateDraft, data.products)) });
      setNotice("Quotation template updated.");
      markSaved("quotation-template-save");
      setError(null);
      await refresh(tab, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update quotation template.");
    }
  }
  async function createQuotationTemplate() {
    try {
      await api("/api/quotation-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildQuotationTemplatePayload(newQuotationTemplate, data.products)) });
      setNotice("Quotation template created.");
      markSaved("quotation-template-create");
      setError(null);
      setNewQuotationTemplate(emptyQuotationTemplateDraft);
      setShowAddQuotationTemplate(false);
      await refresh(tab, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create quotation template.");
    }
  }
  async function deleteQuotationTemplate() {
    if (!selectedQuotationTemplate || !window.confirm(`Delete ${selectedQuotationTemplate.title}?`)) return;
    try {
      await api(`/api/quotation-templates/${selectedQuotationTemplate.id}`, { method: "DELETE" });
      setNotice("Quotation template deleted.");
      setError(null);
      await refresh(tab, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete quotation template.");
    }
  }
  async function moveQuotationTemplate(dragId: string, targetId: string) {
    if (!dragId || dragId === targetId) {
      setDraggedQuotationTemplateId(null);
      return;
    }
    const currentTemplates = data.quotationTemplates;
    const dragIndex = currentTemplates.findIndex((template) => template.id === dragId);
    const targetIndex = currentTemplates.findIndex((template) => template.id === targetId);
    if (dragIndex < 0 || targetIndex < 0 || dragIndex === targetIndex) {
      setDraggedQuotationTemplateId(null);
      return;
    }
    const nextTemplates = [...currentTemplates];
    const [movedTemplate] = nextTemplates.splice(dragIndex, 1);
    nextTemplates.splice(targetIndex, 0, movedTemplate);
    setData((current) => ({ ...current, quotationTemplates: nextTemplates }));
    setSelectedQuotationTemplateId(movedTemplate.id);
    setDraggedQuotationTemplateId(null);
    try {
      await api("/api/quotation-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: nextTemplates.map((template) => template.id) }) });
      setNotice("Quotation template order updated.");
      setError(null);
      await refresh(tab, true);
    } catch (e) {
      setData((current) => ({ ...current, quotationTemplates: currentTemplates }));
      setError(e instanceof Error ? e.message : "Unable to reorder quotation templates.");
    }
  }
  async function updatePreliminaryQuotation(quotationId: string, status: PreliminaryQuotationStatus) {
    try {
      await api(`/api/preliminary-quotations/${quotationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      setNotice("Preliminary quotation updated.");
      setError(null);
      await refresh(tab, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update preliminary quotation.");
    }
  }
  async function handleProductHeroImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingHeroImage(true);
      const url = await productUploads.uploadMediaImage(file, productDraft.slug || productDraft.title || newProduct.slug || newProduct.title || "machine-hero");
      setProductDraft((current) => ({ ...current, heroImage: url }));
      setNotice("Hero image uploaded. Save page to persist it.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload hero image.");
    } finally {
      setIsUploadingHeroImage(false);
      event.target.value = "";
    }
  }
  async function handleFeaturedImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingFeaturedImage(true);
      const url = await productUploads.uploadMediaImage(file, productDraft.slug || productDraft.title || newProduct.slug || newProduct.title || "machine-image");
      setProductDraft((current) => ({ ...current, featuredImage: url }));
      setNotice("Featured image uploaded. Save asset to persist it.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload featured image.");
    } finally {
      setIsUploadingFeaturedImage(false);
      event.target.value = "";
    }
  }
  async function handleGalleryImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    try {
      setIsUploadingGalleryImages(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        uploadedUrls.push(await productUploads.uploadMediaImage(file, productDraft.slug || productDraft.title || newProduct.slug || newProduct.title || "machine-image"));
      }
      setProductDraft((current) => ({ ...current, media: Array.from(new Set([...splitCsv(current.media), ...uploadedUrls])).join(", ") }));
      setNotice("Gallery images uploaded. Save asset to persist them.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload gallery images.");
    } finally {
      setIsUploadingGalleryImages(false);
      event.target.value = "";
    }
  }
  async function handleNewFeaturedImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingNewFeaturedImage(true);
      const url = await productUploads.uploadMediaImage(file, newProduct.slug || newProduct.title || "new-machine");
      setNewProduct((current) => ({ ...current, featuredImage: url }));
      setNotice("Featured image uploaded for the new asset draft.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload featured image.");
    } finally {
      setIsUploadingNewFeaturedImage(false);
      event.target.value = "";
    }
  }
  async function handleNewHeroImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingNewHeroImage(true);
      const url = await productUploads.uploadMediaImage(file, newProduct.slug || newProduct.title || "new-hero-slide");
      setNewProduct((current) => ({ ...current, heroImage: url }));
      setNotice("Hero image uploaded for the new asset draft.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload hero image.");
    } finally {
      setIsUploadingNewHeroImage(false);
      event.target.value = "";
    }
  }
  async function handleNewGalleryImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    try {
      setIsUploadingNewGalleryImages(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        uploadedUrls.push(await productUploads.uploadMediaImage(file, newProduct.slug || newProduct.title || "new-machine"));
      }
      setNewProduct((current) => ({ ...current, media: Array.from(new Set([...splitCsv(current.media), ...uploadedUrls])).join(", ") }));
      setNotice("Gallery images uploaded for the new asset draft.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload gallery images.");
    } finally {
      setIsUploadingNewGalleryImages(false);
      event.target.value = "";
    }
  }
  async function handleProductBrochureUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingBrochure(true);
      const url = await productUploads.uploadProductBrochure(file, productDraft.slug || productDraft.title || newProduct.slug || newProduct.title || "machine-brochure");
      setProductDraft((current) => ({ ...current, brochureUrl: url }));
      setNotice("Brochure uploaded. Save to persist it.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload brochure.");
    } finally {
      setIsUploadingBrochure(false);
      event.target.value = "";
    }
  }
  async function handleNewProductBrochureUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingNewBrochure(true);
      const url = await productUploads.uploadProductBrochure(file, newProduct.slug || newProduct.title || "machine-brochure");
      setNewProduct((current) => ({ ...current, brochureUrl: url }));
      setNotice("Brochure uploaded for the new machine draft.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload brochure.");
    } finally {
      setIsUploadingNewBrochure(false);
      event.target.value = "";
    }
  }
  async function handleHeroImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedHeroSlide) return;
    try {
      setIsUploadingHeroImage(true);
      const url = await productUploads.uploadMediaImage(file, selectedHeroSlide.title || "hero-slide");
      updateHeroSlide(selectedHeroSlide.id, { imageUrl: url });
      setNotice("Hero slide image uploaded. Save site content to publish it.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload hero image.");
    } finally {
      setIsUploadingHeroImage(false);
      event.target.value = "";
    }
  }
  async function uploadBrandingImage(file: File, assetName: string) {
    return productUploads.uploadBrandingImage(file, assetName);
  }

  async function moveProduct(dragId: string, targetId: string) {
    if (!dragId || dragId === targetId) {
      setDraggedProductId(null);
      return;
    }

    const currentProducts = data.products;
    const dragIndex = currentProducts.findIndex((product) => product.id === dragId);
    const targetIndex = currentProducts.findIndex((product) => product.id === targetId);
    if (dragIndex < 0 || targetIndex < 0 || dragIndex === targetIndex) {
      setDraggedProductId(null);
      return;
    }

    const nextProducts = [...currentProducts];
    const [movedProduct] = nextProducts.splice(dragIndex, 1);
    nextProducts.splice(targetIndex, 0, movedProduct);

    setData((current) => ({ ...current, products: nextProducts }));
    setSelectedProductId(movedProduct.id);
    setDraggedProductId(null);

    try {
      setIsSavingProductOrder(true);
      await api("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: nextProducts.map((product) => product.id) })
      });
      setNotice("Machine order updated.");
      setError(null);
      await refresh(tab, true);
    } catch (e) {
      setData((current) => ({ ...current, products: currentProducts }));
      setError(e instanceof Error ? e.message : "Unable to reorder machines.");
    } finally {
      setIsSavingProductOrder(false);
    }
  }
  async function deleteProduct() { if (!selectedPublishedProduct || !window.confirm(`Delete ${selectedPublishedProduct.title}?`)) return; try { await api(`/api/products/${selectedPublishedProduct.id}`, { method: "DELETE" }); setNotice("Product deleted."); setError(null); setLoadedTabs((current) => ({ ...current, machines: false, dashboard: false })); await refresh("machines", true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete product."); } }
  async function createDoc() { try { await api("/api/knowledge-documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newDoc) }); setNotice("Document created."); markSaved("knowledge-doc-create"); setError(null); setNewDoc({ title: "", summary: "", extractedText: "", sourceType: "text", active: true }); setLoadedTabs((current) => ({ ...current, "knowledge base": false, dashboard: false })); await refresh("knowledge base", true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create document."); } }
  async function saveDoc() {
    if (!selectedDoc) return;
    try {
      await api(`/api/knowledge-documents/${selectedDoc.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(docDraft) });
      setNotice("Document updated."); markSaved("knowledge-doc-save"); setError(null); setLoadedTabs((current) => ({ ...current, "knowledge base": false, dashboard: false })); await refresh("knowledge base", true);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save document."); }
  }
  async function saveSections() { try { await api("/api/site-sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.values(siteDrafts)) }); setNotice("Site content saved."); markSaved("site-content-save"); setError(null); setLoadedTabs((current) => ({ ...current, "site content": false, dashboard: false })); await refresh("site content", true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save site content."); } }

  async function sendLeadQuotation() {
    if (!selectedLead || !selectedLeadQuotationTemplate) return;
    if (selectedLead.workflow?.quoteIssued) {
      const confirmed = window.confirm("This lead already has a quotation. Sending again will create a new quotation reference. Continue?");
      if (!confirmed) return;
    }

    try {
      setLeadQuoteSending(true);
      const response = await api("/api/advisor-sessions/" + selectedLead.id + "/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedLeadQuotationTemplate.id })
      });
      const payload = await response.json() as { quotation: { referenceNumber: string }; delivery: { delivered: boolean } };
      setNotice(payload.delivery.delivered
        ? `Quotation ${payload.quotation.referenceNumber} emailed to ${selectedLead.lead.email}.`
        : `Quotation ${payload.quotation.referenceNumber} created, but email delivery needs review.`);
      setError(null);
      await refresh("leads", true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send quotation.");
    } finally {
      setLeadQuoteSending(false);
    }
  }
  function downloadLocalBackup(kind: "bundle" | "secrets") {
    const target = kind === "bundle" ? "/api/backups/download?kind=bundle" : "/api/backups/download?kind=secrets";
    window.location.href = target;
  }
  async function saveSettings() { try { await api("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settingsDraft) }); setNotice("Settings saved."); markSaved("settings-save"); setError(null); setLoadedTabs((current) => ({ ...current, settings: false, dashboard: false })); await refresh("settings", true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save settings."); } }
  async function createUser() { try { await api("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newUser) }); setNotice("User created."); markSaved("user-create"); setError(null); setNewUser({ name: "", email: "", role: "agent", password: "", notificationPreference: "assigned_only" }); setLoadedTabs((current) => ({ ...current, users: false, settings: false, leads: false, dashboard: false })); await refresh("users", true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create user."); } }
  async function updateUser(id: string, payload: Record<string, string | boolean>) { try { await api(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); setNotice("User updated."); setError(null); setLoadedTabs((current) => ({ ...current, users: false, settings: false, leads: false, dashboard: false })); await refresh("users", true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update user."); } }
  async function deleteUser(id: string) { if (!window.confirm("Delete this user?")) return; try { await api(`/api/users/${id}`, { method: "DELETE" }); setNotice("User deleted."); setError(null); setLoadedTabs((current) => ({ ...current, users: false, settings: false, leads: false, dashboard: false })); await refresh("users", true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete user."); } }
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f6fb_0%,#edf2f8_28%,#f7f9fc_100%)] text-on-surface">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-slate-200/80 bg-[#0d1b2f] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-200/80">Welden Industries</div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-white/10 px-6 py-4">
          {cockpitMetrics.slice(0, 2).map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{metric.label}</div>
              <div className={cn("mt-1 text-xl font-black tracking-tight", metric.tone, metric.tone === "text-on-surface" ? "text-white" : metric.tone)}>{metric.value}</div>
            </div>
          ))}
        </div>
        <nav className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
          {groupedTabs.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{group.label}</div>
              <div className="space-y-1">
                {group.tabs.map((entry) => {
                  const Icon = iconForTab(entry);
                  const active = tab === entry;
                  return (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setTab(entry)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium tracking-tight transition-colors",
                        active
                          ? "bg-white text-slate-950 shadow-[0_14px_32px_-22px_rgba(255,255,255,0.95)]"
                          : "text-slate-300 hover:bg-white/8 hover:text-white"
                      )}
                    >
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", active ? "bg-slate-100 text-primary" : "bg-white/6 text-slate-300")}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{getTabLabel(entry)}</div>
                        <div className={cn("text-xs", active ? "text-slate-500" : "text-slate-500")}>
                          {entry === "dashboard" ? "Today's priorities" : entry === "leads" ? "Lead queue and workspaces" : entry === "machines" ? "Catalog, pages, and preview" : entry === "quotation templates" ? "Commercial output" : "Manage supporting assets"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3 text-sm shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xs font-black uppercase text-sky-100">
                {currentUser.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{currentUser.name}</div>
                <div className="truncate text-xs text-slate-400">{currentUser.email}</div>
              </div>
            </div>
            <div className="inline-flex shrink-0 rounded-full bg-sky-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">{currentUser.role}</div>
          </div>
          <Button className="mt-3 w-full rounded-xl bg-white text-slate-950 hover:bg-slate-100" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200/80 bg-white/86 backdrop-blur-md lg:left-72">
        <div className="mx-auto flex min-h-[6.5rem] max-w-[1600px] items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{pageHeader.eyebrow}</div>
            <div className="mt-1 text-xl font-black tracking-tight text-slate-950 md:text-2xl">{pageHeader.title}</div>
            <div className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{pageHeader.description}</div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {pageHeader.chips.map((chip) => <div key={chip} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">{chip}</div>)}
          </div>
        </div>
      </header>

      <main className="pt-[8.25rem] lg:ml-72">
        <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)] lg:hidden">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {cockpitMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
                  <div className="mt-1 text-xl font-black tracking-tight text-slate-950">{metric.value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTabs.map((entry) => {
                const Icon = iconForTab(entry);
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setTab(entry)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                      tab === entry ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{getTabShortLabel(entry)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {error ? <div className="rounded-md border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div> : null}
          {/* Only show a global skeleton before the first load for a tab, not on every later refresh. */}
          {loadingTab && !loadedTabs[tab] ? (
            <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-white shadow-sm">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-outline-variant/10 px-6 py-5 last:border-0">
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-surface-container-high" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 animate-pulse rounded-md bg-surface-container-high" style={{ animationDelay: `${i * 60}ms` }} />
                    <div className="h-3 w-1/2 animate-pulse rounded-md bg-surface-container-low" style={{ animationDelay: `${i * 60 + 30}ms` }} />
                  </div>
                  <div className="h-7 w-20 animate-pulse rounded-lg bg-surface-container-high" style={{ animationDelay: `${i * 60 + 15}ms` }} />
                </div>
              ))}
            </div>
          ) : null}
          {notice ? <div className="pointer-events-none fixed right-6 top-24 z-[70] max-w-md"><div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-white px-4 py-4 shadow-[0_22px_55px_-28px_rgba(10,80,35,0.45)] ring-1 ring-emerald-100 backdrop-blur"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div><div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Saved</div><div className="mt-1 text-sm font-medium leading-6 text-slate-800">{notice}</div></div></div></div> : null}

          {tab === "dashboard" ? (
            <DashboardView
              dashboardFirstCallOpenCount={dashboardFirstCallOpenCount}
              dashboardQuotedAwaitingCallCount={dashboardQuotedAwaitingCallCount}
              dashboardCallbacksTodayCount={dashboardCallbacksTodayCount}
              dashboardFirstCallDueCount={dashboardFirstCallDueCount}
              dashboardWorkNext={dashboardWorkNext}
              dashboardPublishedProductsCount={dashboardPublishedProductsCount}
              dashboardLiveSectionsCount={dashboardLiveSectionsCount}
              dashboardActiveKnowledgeDocumentsCount={dashboardActiveKnowledgeDocumentsCount}
              dashboardQuotedLeadCount={dashboardQuotedLeadCount}
              dashboardStageCounts={dashboardStageCounts}
              dashboardMachineInterest={dashboardMachineInterest}
              dashboardRetryQueueCount={dashboardRetryQueueCount}
              dashboardEscalatedLeadCount={dashboardEscalatedLeadCount}
              dashboardStaleLeadCount={dashboardStaleLeadCount}
              deploymentHealth={deploymentHealth}
              todayQueue={todayQueue}
              assistantOverview={assistantOverview}
              setTab={setTab}
              setSelectedLeadId={setSelectedLeadId}
              setShowLeadEditor={setShowLeadEditor}
              applyRowQuickAction={applyRowQuickAction}
              rowQuickActionLoading={rowQuickActionLoading}
            />
          ) : null}
              {tab === "leads" ? (
                <LeadsView
                  showLeadEditor={showLeadEditor}
                  selectedLead={selectedLead}
                  selectedLeadMeta={selectedLeadMeta}
                  staleLeadDays={staleLeadDays}
                  setShowLeadEditor={setShowLeadEditor}
                  saveLeadWorkflow={leadActions.saveLeadWorkflow}
                  getSaveButtonLabel={getSaveButtonLabel}
                  leadQuotationTemplates={leadQuotationTemplates}
                  selectedLeadQuotationTemplate={selectedLeadQuotationTemplate}
                  setLeadQuotationTemplateId={setLeadQuotationTemplateId}
                  sendLeadQuotation={leadActions.sendLeadQuotation}
                  leadQuoteSending={leadActions.leadQuoteSending}
                  leadQuoteDelivery={leadActions.leadQuoteDelivery}
                  applyLeadFollowUpAction={leadActions.applyLeadFollowUpAction}
                  leadWorkflowDraft={leadWorkflowDraft}
                  setLeadWorkflowDraft={setLeadWorkflowDraft}
                  users={data.users}
                  leadNoteDraft={leadNoteDraft}
                  setLeadNoteDraft={setLeadNoteDraft}
                  filteredLeads={filteredLeads}
                  leadsWithMeta={leadsWithMetaFiltered}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  serverSearchLoading={serverSearchLoading}
                  firstCallDueCount={firstCallDueCount}
                  quotedAwaitingCallCount={quotedAwaitingCallCount}
                  callbacksTodayCount={callbacksTodayCount}
                  retryQueueCount={retryQueueCount}
                  setSelectedLeadId={setSelectedLeadId}
                  stageFilters={stageFilters}
                  setStageFilters={setStageFilters}
                  ownerFilter={ownerFilter}
                  setOwnerFilter={setOwnerFilter}
                  slaFilter={slaFilter}
                  setSlaFilter={setSlaFilter}
                  machineFilter={machineFilter}
                  setMachineFilter={setMachineFilter}
                  machineCategories={machineCategories}
                  currentUserRole={currentUser.role}
                  activeFilterCount={activeFilterCount}
                  clearAllFilters={clearAllFilters}
                  applyRowQuickAction={applyRowQuickAction}
                  rowQuickActionLoading={rowQuickActionLoading}
                  assistantOverview={assistantOverview}
                  logLeadCallOutcome={leadActions.logLeadCallOutcome}
                  bulkPatchLeads={bulkPatchLeads}
                  leadsTotal={data.advisorSessionsTotal}
                  loadMoreLeads={loadMoreLeads}
                  loadingMoreLeads={loadingMoreLeads}
                />
              ) : null}
          <AdminResidualViews ctx={{
            tab,
            currentUser,
            showAddProduct,
            showProductEditor,
            selectedProduct,
            selectedPublishedProduct,
            selectedProductDraftRecord,
            newProduct,
            setNewProduct,
            productDraft,
            setProductDraft,
            createProduct,
            saveProduct,
            publishMachine,
            discardMachineDraft,
            machineDraftBusy,
            deleteProduct,
            getCreateButtonLabel,
            getSaveButtonLabel,
            setShowAddProduct,
            setShowProductEditor,
            setSelectedProductId,
            productSearch,
            setProductSearch,
            filteredProducts,
            data,
            isSavingProductOrder,
            draggedProductId,
            setDraggedProductId,
            moveProduct,
            handleNewFeaturedImageUpload,
            isUploadingNewFeaturedImage,
            handleNewHeroImageUpload,
            isUploadingNewHeroImage,
            handleNewGalleryImageUpload,
            isUploadingNewGalleryImages,
            handleNewProductBrochureUpload,
            isUploadingNewBrochure,
            handleFeaturedImageUpload,
            isUploadingFeaturedImage,
            handleProductHeroImageUpload,
            isUploadingHeroImage,
            handleGalleryImageUpload,
            isUploadingGalleryImages,
            handleProductBrochureUpload,
            isUploadingBrochure,
            machineDetailItems,
            updateNamedSiteItem,
            saveMachineDetailLabels: saveSections,
            showAddQuotationTemplate,
            showQuotationTemplateEditor,
            newQuotationTemplate,
            setNewQuotationTemplate,
            createQuotationTemplate,
            setShowAddQuotationTemplate,
            setShowQuotationTemplateEditor,
            quotationSearch,
            setQuotationSearch,
            filteredQuotationTemplates,
            draggedQuotationTemplateId,
            setDraggedQuotationTemplateId,
            moveQuotationTemplate,
            setSelectedQuotationTemplateId,
            selectedQuotationTemplateId,
            selectedQuotationTemplate,
            quotationTemplateDraft,
            setQuotationTemplateDraft,
            selectedQuotationTemplateLinkedProduct,
            saveQuotationTemplate,
            deleteQuotationTemplate,
            showAddKnowledgeDoc,
            showKnowledgeDocEditor,
            setShowAddKnowledgeDoc,
            setShowKnowledgeDocEditor,
            newDoc,
            setNewDoc,
            createDoc,
            selectedDoc,
            docDraft,
            setDocDraft,
            saveDoc,
            setSelectedDocId,
            showSiteContentEditor,
            setShowSiteContentEditor,
            visibleSiteSections,
            selectedSiteSection,
            selectedSiteSectionKey,
            setSelectedSiteSectionKey,
            updateSiteSection,
            saveSections,
            heroSlides,
            createHeroSlide,
            selectedHeroSlide,
            setSelectedHeroSlideId,
            draggedHeroSlideId,
            setDraggedHeroSlideId,
            moveHeroSlide,
            deleteHeroSlide,
            updateHeroSlide,
            handleHeroImageUpload,
            updatePlainSiteItem,
          }} />
          {tab === "users" ?
            <UsersView
              users={data.users}
              currentUser={currentUser}
              newUser={newUser}
              setNewUser={setNewUser}
              updateUser={updateUser}
              deleteUser={deleteUser}
              createUser={createUser}
              getCreateButtonLabel={getCreateButtonLabel}
            />
          : null}

          {tab === "settings" ? (
            <SettingsView
              users={data.users}
              settingsDraft={settingsDraft}
              setSettingsDraft={setSettingsDraft}
              dataSettings={data.settings}
              backupStatus={backupActions.backupStatus}
              backupArtifacts={backupActions.backupArtifacts}
              backupLoading={backupActions.backupLoading}
              backupRunning={backupActions.backupRunning}
              backupError={backupActions.backupError}
              fetchBackupStatus={backupActions.fetchBackupStatus}
              runBackupNow={backupActions.runBackupNow}
              downloadLocalBackup={backupActions.downloadLocalBackup}
              saveSettings={saveSettings}
              uploadBrandingImage={uploadBrandingImage}
              getSaveButtonLabel={getSaveButtonLabel}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}



















































































































































