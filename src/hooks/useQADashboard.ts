"use client";

import { useQuery } from "@tanstack/react-query";

export type QaStats = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalInterested: number;
  conversionPct: number;
};

export type CampaignWithLeads = {
  id: string;
  name?: string;
  leads: { qa_status: string | null }[];
};

async function fetchQADashboard(): Promise<{ campaigns: CampaignWithLeads[] }> {
  const res = await fetch("/api/qa/dashboard", { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load dashboard");
  return data;
}

async function fetchTLStats(): Promise<QaStats> {
  const res = await fetch("/api/tl/campaigns/stats", { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load stats");
  return data;
}

export function useQADashboard(enabled: boolean) {
  const dashboardQuery = useQuery({
    queryKey: ["qa", "dashboard"],
    queryFn: fetchQADashboard,
    enabled,
    staleTime: 60 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: ["qa", "dashboard", "stats"],
    queryFn: fetchTLStats,
    enabled,
    staleTime: 60 * 1000,
  });

  return {
    dashboard: dashboardQuery,
    stats: statsQuery,
    isLoading: dashboardQuery.isLoading || statsQuery.isLoading,
    isFetching: dashboardQuery.isFetching || statsQuery.isFetching,
    error: dashboardQuery.error ?? statsQuery.error,
    refetch: () => {
      dashboardQuery.refetch();
      statsQuery.refetch();
    },
  };
}
