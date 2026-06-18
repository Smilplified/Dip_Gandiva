import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeRoleName } from "@/lib/auth/config";
import {
  hasOrgWideCampaignAccess,
  hasTLAccess,
  isOperationsManagerRole,
} from "@/lib/auth/tl-access";
import { fetchCampaignIdsForTeamLeader } from "@/lib/campaign/team-leader-assignments";
import { aggregateCommandLeadStatsByCampaign } from "@/lib/command/db";
import { aggregateTlLeadCountsByCampaign } from "@/lib/tl/dashboard-leads";
import {
  buildCampaignRevenueSnapshot,
  resolveCampaignChannel,
  aggregateRevenueReportSummary,
  type CampaignRevenueSnapshot,
} from "@/lib/campaign-revenue-metrics";
import { postgrestIlikePattern, postgrestOrIlikeFilters } from "@/lib/postgrest-filter";
import { resolveUserDisplayNames } from "@/lib/campaign/team-leader-display";

export type RevenueReportFilters = {
  q?: string;
  status?: string;
  lead_type?: string;
  channel?: string;
  campaign_type?: string;
  campaign_name?: string;
  client_name?: string;
  team_leader_id?: string;
  agent_id?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
};

export type RevenueReportCampaignRow = {
  id: string;
  campaign_id: string;
  campaign_code: string | null;
  name: string;
  client_id: string | null;
  client_name: string | null;
  client_code: string | null;
  campaign_owner: string | null;
  channel: string | null;
  aggregator: string | null;
  campaign_type: string | null;
  lead_type: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  geography: string | null;
  weekly_call: string | null;
  weekly_report: string | null;
  additional_comments: string | null;
  assigned_team_leader_name: string | null;
  agent_names: string[];
  metrics: CampaignRevenueSnapshot;
};

type CampaignDbRow = {
  id: string;
  campaign_id: string;
  campaign_code: string | null;
  name: string;
  client_id: string | null;
  client_name: string | null;
  lead_type: string | null;
  campaign_type: string | null;
  lead_aggregated: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  geography: string | null;
  cpl: number | null;
  revenue: number | null;
  booked: number | null;
  total_allocation: number | null;
  post_qa: number | null;
  achieved: number | null;
  pending_allocation: number | null;
  weekly_call: string | null;
  weekly_report: string | null;
  additional_comments: string | null;
  assigned_team_leader_id: string | null;
  created_by: string | null;
  created_at: string;
  campaign_metrics:
    | {
        sponsor_name: string | null;
        total_campaign_spend: number | null;
        total_leads_delivered: number | null;
        channel_split: Record<string, unknown> | null;
      }
    | {
        sponsor_name: string | null;
        total_campaign_spend: number | null;
        total_leads_delivered: number | null;
        channel_split: Record<string, unknown> | null;
      }[]
    | null;
};

export function canAccessRevenueReport(roleNames: string[]): boolean {
  if (roleNames.some((r) => isOperationsManagerRole(r))) return true;
  if (hasTLAccess(roleNames)) return true;
  if (hasOrgWideCampaignAccess(roleNames)) return true;
  return roleNames.some((r) => {
    const n = normalizeRoleName(r);
    return n === "agent" || n === "client_viewer";
  });
}

export function parseRevenueReportFilters(
  searchParams: URLSearchParams
): RevenueReportFilters {
  const sortDir = searchParams.get("sort_dir")?.toLowerCase();
  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    lead_type: searchParams.get("lead_type")?.trim() || undefined,
    channel: searchParams.get("channel")?.trim() || undefined,
    campaign_type: searchParams.get("campaign_type")?.trim() || undefined,
    campaign_name: searchParams.get("campaign_name")?.trim() || undefined,
    client_name: searchParams.get("client_name")?.trim() || undefined,
    team_leader_id: searchParams.get("team_leader_id")?.trim() || undefined,
    agent_id: searchParams.get("agent_id")?.trim() || undefined,
    date_from: searchParams.get("date_from")?.trim() || undefined,
    date_to: searchParams.get("date_to")?.trim() || undefined,
    sort_by: searchParams.get("sort_by")?.trim() || undefined,
    sort_dir: sortDir === "asc" || sortDir === "desc" ? sortDir : "desc",
  };
}

function firstMetric(metrics: CampaignDbRow["campaign_metrics"]) {
  if (!metrics) return null;
  return Array.isArray(metrics) ? metrics[0] : metrics;
}

const SORTABLE_COLUMNS: Record<string, string> = {
  name: "name",
  client_name: "client_name",
  status: "status",
  start_date: "start_date",
  end_date: "end_date",
  cpl: "cpl",
  revenue: "revenue",
  booked: "booked",
  total_allocation: "total_allocation",
  post_qa: "post_qa",
  achieved: "achieved",
};

export async function resolveRevenueReportCampaignIds(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  roleNames: string[],
  clientId: string | null,
  filters: RevenueReportFilters
): Promise<string[]> {
  const seeAllOrg = hasOrgWideCampaignAccess(roleNames);
  const isAgent = roleNames.some((r) => normalizeRoleName(r) === "agent");
  const isClientViewer = roleNames.some((r) => normalizeRoleName(r) === "client_viewer");

  let scopedIds: string[] | null = null;

  if (isClientViewer) {
    if (!clientId) return [];
    const { data } = await supabase
      .from("campaigns")
      .select("id")
      .eq("organization_id", orgId)
      .eq("client_id", clientId);
    scopedIds = ((data ?? []) as { id: string }[]).map((r) => r.id);
  } else if (isAgent) {
    const { data } = await supabase
      .from("campaign_assignments")
      .select("campaign_id")
      .eq("agent_id", userId)
      .eq("is_active", true);
    scopedIds = [
      ...new Set(((data ?? []) as { campaign_id: string }[]).map((r) => r.campaign_id)),
    ];
  } else if (!seeAllOrg) {
    scopedIds = await fetchCampaignIdsForTeamLeader(supabase, userId, orgId);
    const { data: legacy } = await supabase
      .from("campaigns")
      .select("id")
      .eq("organization_id", orgId)
      .eq("assigned_team_leader_id", userId);
    for (const row of (legacy ?? []) as { id: string }[]) {
      if (!scopedIds.includes(row.id)) scopedIds.push(row.id);
    }
  }

  if (filters.agent_id) {
    const { data } = await supabase
      .from("campaign_assignments")
      .select("campaign_id")
      .eq("agent_id", filters.agent_id)
      .eq("is_active", true);
    const agentCampaignIds = new Set(
      ((data ?? []) as { campaign_id: string }[]).map((r) => r.campaign_id)
    );
    if (scopedIds) {
      scopedIds = scopedIds.filter((id) => agentCampaignIds.has(id));
    } else {
      scopedIds = [...agentCampaignIds];
    }
  }

  if (filters.team_leader_id) {
    const junctionIds = await fetchCampaignIdsForTeamLeader(
      supabase,
      filters.team_leader_id,
      orgId
    );
    const tlSet = new Set(junctionIds);
    const { data: legacy } = await supabase
      .from("campaigns")
      .select("id")
      .eq("organization_id", orgId)
      .eq("assigned_team_leader_id", filters.team_leader_id);
    for (const row of (legacy ?? []) as { id: string }[]) tlSet.add(row.id);
    if (scopedIds) {
      scopedIds = scopedIds.filter((id) => tlSet.has(id));
    } else {
      scopedIds = [...tlSet];
    }
  }

  if (scopedIds && scopedIds.length === 0) return [];

  let query = supabase
    .from("campaigns")
    .select("id")
    .eq("organization_id", orgId);

  if (scopedIds) {
    query = query.in("id", scopedIds);
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.lead_type) {
    const pattern = postgrestIlikePattern(filters.lead_type);
    if (pattern) query = query.ilike("lead_type", pattern);
  }
  if (filters.campaign_type) query = query.eq("campaign_type", filters.campaign_type);
  if (filters.campaign_name) {
    const pattern = postgrestIlikePattern(filters.campaign_name);
    if (pattern) query = query.ilike("name", pattern);
  }
  if (filters.client_name) {
    const pattern = postgrestIlikePattern(filters.client_name);
    if (pattern) query = query.ilike("client_name", pattern);
  }
  if (filters.date_from) query = query.gte("start_date", filters.date_from);
  if (filters.date_to) query = query.lte("start_date", filters.date_to);

  const search = filters.q ?? "";
  if (search.length > 0) {
    const orFilter = postgrestOrIlikeFilters(
      ["name", "campaign_code", "client_name", "lead_type", "industry", "geography"],
      search
    );
    if (orFilter) query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let ids = ((data ?? []) as { id: string }[]).map((r) => r.id);

  if (filters.channel) {
    const channelNeedle = filters.channel.toLowerCase();
    const fullRows = await fetchRevenueReportRows(supabase, orgId, ids);
    ids = fullRows
      .filter((r) => (r.channel ?? "").toLowerCase().includes(channelNeedle))
      .map((r) => r.id);
  }

  return ids;
}

export async function fetchRevenueReportRows(
  supabase: SupabaseClient,
  orgId: string,
  campaignIds: string[]
): Promise<RevenueReportCampaignRow[]> {
  if (campaignIds.length === 0) return [];

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `
      id, campaign_id, campaign_code, name, client_id, client_name, lead_type, campaign_type,
      lead_aggregated, status, start_date, end_date, geography, cpl, revenue, booked,
      total_allocation, post_qa, achieved, pending_allocation, weekly_call, weekly_report,
      additional_comments, assigned_team_leader_id, created_by, created_at,
      campaign_metrics(
        sponsor_name, total_campaign_spend, total_leads_delivered, channel_split
      )
    `
    )
    .eq("organization_id", orgId)
    .in("id", campaignIds);

  if (error) throw new Error(error.message);

  const campaigns = (data ?? []) as CampaignDbRow[];
  const ids = campaigns.map((c) => c.id);

  const clientIds = [
    ...new Set(campaigns.map((c) => c.client_id).filter(Boolean) as string[]),
  ];
  const userIds = [
    ...new Set(
      campaigns
        .flatMap((c) => [c.created_by, c.assigned_team_leader_id])
        .filter(Boolean) as string[]
    ),
  ];

  const [leadCounts, leadStats, clientsRes, userNames, assignmentsRes, tlJunctionRes] =
    await Promise.all([
      aggregateTlLeadCountsByCampaign(supabase, orgId, ids),
      aggregateCommandLeadStatsByCampaign(supabase, orgId, ids),
      clientIds.length > 0
        ? supabase.from("clients").select("id, client_code").in("id", clientIds)
        : Promise.resolve({ data: [] as { id: string; client_code: string | null }[] }),
      resolveUserDisplayNames(supabase, userIds),
      supabase
        .from("campaign_assignments")
        .select("campaign_id, agent_id")
        .in("campaign_id", ids)
        .eq("is_active", true),
      supabase
        .from("campaign_team_leader_assignments")
        .select("campaign_id, team_leader_id")
        .in("campaign_id", ids)
        .eq("is_active", true),
    ]);

  const clientCodeById: Record<string, string | null> = {};
  for (const c of (clientsRes.data ?? []) as { id: string; client_code: string | null }[]) {
    clientCodeById[c.id] = c.client_code;
  }

  const agentIds = [
    ...new Set(
      ((assignmentsRes.data ?? []) as { agent_id: string }[]).map((a) => a.agent_id)
    ),
  ];
  const tlIds = [
    ...new Set(
      ((tlJunctionRes.data ?? []) as { team_leader_id: string }[]).map((t) => t.team_leader_id)
    ),
  ];
  const extraNames = await resolveUserDisplayNames(supabase, [...agentIds, ...tlIds]);

  const agentsByCampaign: Record<string, string[]> = {};
  for (const row of (assignmentsRes.data ?? []) as {
    campaign_id: string;
    agent_id: string;
  }[]) {
    if (!agentsByCampaign[row.campaign_id]) agentsByCampaign[row.campaign_id] = [];
    const label = extraNames[row.agent_id] ?? row.agent_id;
    if (!agentsByCampaign[row.campaign_id].includes(label)) {
      agentsByCampaign[row.campaign_id].push(label);
    }
  }

  const tlByCampaign: Record<string, string[]> = {};
  for (const row of (tlJunctionRes.data ?? []) as {
    campaign_id: string;
    team_leader_id: string;
  }[]) {
    if (!tlByCampaign[row.campaign_id]) tlByCampaign[row.campaign_id] = [];
    const label = extraNames[row.team_leader_id] ?? row.team_leader_id;
    if (!tlByCampaign[row.campaign_id].includes(label)) {
      tlByCampaign[row.campaign_id].push(label);
    }
  }

  const rows: RevenueReportCampaignRow[] = campaigns.map((c) => {
    const metric = firstMetric(c.campaign_metrics);
    const counts = leadCounts[c.id] ?? { total: 0, qualified: 0, delivered: 0 };
    const dq = leadStats[c.id]?.dq ?? 0;
    const channel = resolveCampaignChannel(metric?.channel_split ?? null, c.campaign_type);
    const snapshot = buildCampaignRevenueSnapshot(c, counts, {
      leadsRejected: dq,
      totalCampaignSpend: metric?.total_campaign_spend,
      deliveredLeads: metric?.total_leads_delivered,
    });

    const tlNames = tlByCampaign[c.id] ?? [];
    if (c.assigned_team_leader_id) {
      const legacy = userNames[c.assigned_team_leader_id] ?? extraNames[c.assigned_team_leader_id];
      if (legacy && !tlNames.includes(legacy)) tlNames.unshift(legacy);
    }

    const owner =
      metric?.sponsor_name?.trim() ||
      (c.created_by ? userNames[c.created_by] ?? null : null);

    return {
      id: c.id,
      campaign_id: c.campaign_id,
      campaign_code: c.campaign_code,
      name: c.name,
      client_id: c.client_id,
      client_name: c.client_name,
      client_code: c.client_id ? clientCodeById[c.client_id] ?? null : null,
      campaign_owner: owner,
      channel,
      aggregator: c.lead_aggregated,
      campaign_type: c.campaign_type,
      lead_type: c.lead_type,
      start_date: c.start_date,
      end_date: c.end_date,
      status: c.status,
      geography: c.geography,
      weekly_call: c.weekly_call,
      weekly_report: c.weekly_report,
      additional_comments: c.additional_comments,
      assigned_team_leader_name: tlNames.length > 0 ? tlNames.join(", ") : null,
      agent_names: agentsByCampaign[c.id] ?? [],
      metrics: snapshot,
    };
  });

  return rows;
}

export function sortRevenueReportRows(
  rows: RevenueReportCampaignRow[],
  sortBy: string | undefined,
  sortDir: "asc" | "desc"
): RevenueReportCampaignRow[] {
  const key = sortBy && SORTABLE_COLUMNS[sortBy] ? sortBy : "start_date";
  const dir = sortDir === "asc" ? 1 : -1;

  const getValue = (row: RevenueReportCampaignRow): string | number => {
    if (key === "cpl") return row.metrics.cpl ?? 0;
    if (key === "revenue") return row.metrics.revenue ?? 0;
    if (key === "booked") return row.metrics.booked ?? 0;
    if (key === "achieved") return row.metrics.achieved ?? 0;
    if (key === "post_qa") return row.metrics.post_qa;
    if (key === "total_allocation") return row.metrics.total_allocation;
    const raw = (row as Record<string, unknown>)[key];
    if (typeof raw === "number") return raw;
    return String(raw ?? "");
  };

  return [...rows].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export async function fetchRevenueReportFilterOptions(
  supabase: SupabaseClient,
  orgId: string,
  campaignIds: string[]
) {
  if (campaignIds.length === 0) {
    return {
      statuses: [],
      lead_types: [],
      channels: [],
      campaign_types: [],
      clients: [],
      team_leaders: [] as Array<{ id: string; name: string }>,
      agents: [] as Array<{ id: string; name: string }>,
    };
  }

  const rows = await fetchRevenueReportRows(supabase, orgId, campaignIds);

  const statuses = new Set<string>();
  const leadTypes = new Set<string>();
  const channels = new Set<string>();
  const campaignTypes = new Set<string>();
  const clients = new Set<string>();

  for (const row of rows) {
    if (row.status) statuses.add(row.status);
    if (row.lead_type) leadTypes.add(row.lead_type);
    if (row.channel) channels.add(row.channel);
    if (row.campaign_type) campaignTypes.add(row.campaign_type);
    if (row.client_name) clients.add(row.client_name);
  }

  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("agent_id")
    .in("campaign_id", campaignIds)
    .eq("is_active", true);

  const agentIds = [
    ...new Set(((assignments ?? []) as { agent_id: string }[]).map((a) => a.agent_id)),
  ];

  const { data: tlRows } = await supabase
    .from("campaign_team_leader_assignments")
    .select("team_leader_id")
    .in("campaign_id", campaignIds)
    .eq("is_active", true);

  const tlIds = [
    ...new Set(((tlRows ?? []) as { team_leader_id: string }[]).map((t) => t.team_leader_id)),
  ];

  const names = await resolveUserDisplayNames(supabase, [...agentIds, ...tlIds]);

  return {
    statuses: [...statuses].sort(),
    lead_types: [...leadTypes].sort(),
    channels: [...channels].sort(),
    campaign_types: [...campaignTypes].sort(),
    clients: [...clients].sort(),
    team_leaders: tlIds.map((id) => ({ id, name: names[id] ?? id })),
    agents: agentIds.map((id) => ({ id, name: names[id] ?? id })),
  };
}

export type RevenueReportClientGroup = {
  key: string;
  client_id: string | null;
  client_code: string | null;
  client_name: string | null;
  campaign_count: number;
  metrics: CampaignRevenueSnapshot;
  campaigns: RevenueReportCampaignRow[];
};

export function groupRevenueReportByClient(
  rows: RevenueReportCampaignRow[]
): RevenueReportClientGroup[] {
  const byClient = new Map<string, RevenueReportCampaignRow[]>();

  for (const row of rows) {
    const key = row.client_id ?? row.client_name?.trim() ?? "unknown";
    const bucket = byClient.get(key) ?? [];
    bucket.push(row);
    byClient.set(key, bucket);
  }

  return [...byClient.entries()]
    .map(([key, campaigns]) => {
      const sorted = [...campaigns].sort((a, b) =>
        (b.start_date ?? "").localeCompare(a.start_date ?? "")
      );
      const first = sorted[0];
      const summary = aggregateRevenueReportSummary(sorted.map((c) => c.metrics));

      return {
        key,
        client_id: first.client_id,
        client_code: first.client_code,
        client_name: first.client_name,
        campaign_count: sorted.length,
        metrics: {
          cpl: summary.avg_cpl,
          revenue: summary.total_revenue,
          booked: summary.total_booked,
          pending_revenue: summary.total_pending_revenue,
          total_allocation: summary.total_allocation,
          post_qa: summary.total_post_qa,
          achieved: summary.total_achieved,
          pending_allocation: sorted.reduce(
            (sum, c) => sum + (c.metrics.pending_allocation ?? 0),
            0
          ),
          leads_rejected: summary.total_leads_rejected,
          cpc: null,
        },
        campaigns: sorted,
      };
    })
    .sort((a, b) => (a.client_name ?? "").localeCompare(b.client_name ?? ""));
}

export function revenueRowToExportRecord(row: RevenueReportCampaignRow): Record<string, unknown> {
  return {
    "Client Name": row.client_name ?? "",
    "Client Code": row.client_code ?? "",
    "Campaign Owner": row.campaign_owner ?? "",
    Channel: row.channel ?? "",
    Aggregator: row.aggregator ?? "",
    "Campaign Name": row.name,
    "Lead Type": row.lead_type ?? "",
    "Start Date": row.start_date ?? "",
    "End Date": row.end_date ?? "",
    Status: row.status,
    CPL: row.metrics.cpl ?? "",
    Revenue: row.metrics.revenue ?? "",
    Booked: row.metrics.booked ?? "",
    "Pending Revenue": row.metrics.pending_revenue ?? "",
    "Total Allocation": row.metrics.total_allocation,
    "Post QA": row.metrics.post_qa,
    Achieved: row.metrics.achieved ?? "",
    "Pending Allocation": row.metrics.pending_allocation ?? "",
    "Leads Rejected": row.metrics.leads_rejected,
    Region: row.geography ?? "",
    CPC: row.metrics.cpc ?? "",
    "Weekly Call": row.weekly_call ?? "",
    "Weekly Report": row.weekly_report ?? "",
    "Additional Comments": row.additional_comments ?? "",
    "Team Leader": row.assigned_team_leader_name ?? "",
    Agents: row.agent_names.join(", "),
  };
}
