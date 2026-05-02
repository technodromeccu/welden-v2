"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardSnapshot, Role } from "@/lib/types";
import { adminTabGroups, getDashboardViewForTab, hasDataForTab, type DashboardView, tabsByRole } from "@/components/admin/shared/admin-panel-helpers";
import { useAdminApi } from "@/hooks/admin/useAdminApi";

export function useAdminSnapshot(initialData: DashboardSnapshot, role: Role) {
  const api = useAdminApi();
  const [data, setData] = useState(initialData);
  const availableTabs = useMemo(() => tabsByRole[role], [role]);
  const groupedTabs = useMemo(() => adminTabGroups.map((group) => ({ ...group, tabs: group.tabs.filter((entry) => availableTabs.includes(entry as never)) })).filter((group) => group.tabs.length > 0), [availableTabs]);
  const [tab, setTab] = useState<string>(availableTabs[0]);
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>(() => Object.fromEntries(availableTabs.map((entry) => [entry, hasDataForTab(initialData, entry)])));
  const [loadingTab, setLoadingTab] = useState(false);
  // PERF-01: track how many sessions have been loaded so the Load More button knows the next offset
  const [leadsOffset, setLeadsOffset] = useState(initialData.advisorSessions.length);
  const [loadingMoreLeads, setLoadingMoreLeads] = useState(false);

  const mergeSnapshot = useCallback((snapshot: DashboardSnapshot, view: DashboardView = "full") => {
    setData((current) => {
      const next: DashboardSnapshot = {
        ...current,
        dashboardSummary: snapshot.dashboardSummary ?? current.dashboardSummary,
        deploymentHealth: snapshot.deploymentHealth ?? current.deploymentHealth,
        settings: snapshot.settings
      };

      switch (view) {
        case "dashboard":
          return next;
        case "leads":
          return {
            ...next,
            users: snapshot.users,
            advisorSessions: snapshot.advisorSessions,
            advisorSessionsTotal: snapshot.advisorSessionsTotal ?? current.advisorSessionsTotal
          };
        case "machines":
          return {
            ...next,
            products: snapshot.products,
            productDrafts: snapshot.productDrafts,
            siteSections: snapshot.siteSections
          };
        case "site content":
          return {
            ...next,
            siteSections: snapshot.siteSections
          };
        case "quotation templates":
          return {
            ...next,
            products: snapshot.products,
            quotationTemplates: snapshot.quotationTemplates
          };
        case "knowledge base":
          return {
            ...next,
            knowledgeDocuments: snapshot.knowledgeDocuments
          };
        case "users":
          return {
            ...next,
            users: snapshot.users
          };
        case "settings":
          return {
            ...next,
            users: snapshot.users
          };
        case "full":
        default:
          return {
            ...next,
            users: snapshot.users,
            products: snapshot.products,
            productDrafts: snapshot.productDrafts,
            siteSections: snapshot.siteSections,
            knowledgeDocuments: snapshot.knowledgeDocuments,
            advisorSessions: snapshot.advisorSessions,
            advisorSessionsTotal: snapshot.advisorSessionsTotal ?? current.advisorSessionsTotal,
            quotationTemplates: snapshot.quotationTemplates,
            preliminaryQuotations: snapshot.preliminaryQuotations
          };
      }
    });
  }, []);

  const refresh = useCallback(async (targetTab = tab, force = false) => {
    const view = getDashboardViewForTab(targetTab) as DashboardView;
    if (!force && loadedTabs[targetTab]) {
      return;
    }

    try {
      setLoadingTab(true);
      const snapshot = await (await api("/api/dashboard?view=" + encodeURIComponent(view))).json() as DashboardSnapshot;
      mergeSnapshot(snapshot, view);
      // Reset offset tracking after a full refresh — we now have a fresh first page
      if (view === "leads") {
        setLeadsOffset(snapshot.advisorSessions.length);
      }
      setLoadedTabs((current) => ({ ...current, [targetTab]: true }));
    } finally {
      setLoadingTab(false);
    }
  }, [api, loadedTabs, mergeSnapshot, tab]);

  // PERF-01: append the next page of sessions to the existing list
  const loadMoreLeads = useCallback(async () => {
    if (loadingMoreLeads) return;
    setLoadingMoreLeads(true);
    try {
      const snapshot = await (await api(
        "/api/dashboard?view=leads&offset=" + leadsOffset
      )).json() as DashboardSnapshot;

      setData((current) => ({
        ...current,
        dashboardSummary: snapshot.dashboardSummary ?? current.dashboardSummary,
        users: snapshot.users.length ? snapshot.users : current.users,
        // Append new sessions — deduplication by id handles rare overlap from concurrent writes
        advisorSessions: [
          ...current.advisorSessions,
          ...snapshot.advisorSessions.filter(
            (s) => !current.advisorSessions.some((existing) => existing.id === s.id)
          )
        ],
        advisorSessionsTotal: snapshot.advisorSessionsTotal ?? current.advisorSessionsTotal,
        settings: snapshot.settings
      }));

      setLeadsOffset((prev) => prev + snapshot.advisorSessions.length);
    } finally {
      setLoadingMoreLeads(false);
    }
  }, [api, leadsOffset, loadingMoreLeads]);

  useEffect(() => {
    setTab((current) => (availableTabs.includes(current as never) ? current : availableTabs[0]));
    setLoadedTabs((current) => ({ ...Object.fromEntries(availableTabs.map((entry) => [entry, current[entry] ?? hasDataForTab(initialData, entry)])) }));
  }, [availableTabs, initialData]);

  useEffect(() => {
    if (!loadedTabs[tab]) {
      void refresh(tab, true);
    }
  }, [loadedTabs, refresh, tab]);

  return {
    api,
    data,
    setData,
    availableTabs,
    groupedTabs,
    tab,
    setTab,
    loadedTabs,
    setLoadedTabs,
    loadingTab,
    mergeSnapshot,
    refresh,
    loadMoreLeads,
    loadingMoreLeads
  };
}
