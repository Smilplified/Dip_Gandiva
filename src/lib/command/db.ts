/**
 * Typed DB helpers for Command Center tables.
 * Uses explicit `as` casts because Supabase v2.97 type inference
 * resolves new tables to `never` until types are regenerated.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  CommandProfile,
  CommandRoleRow,
  CommandAlertRow,
  CommandLeadHistoryRow,
} from "./types";

type Client = SupabaseClient<Database>;
type DbAny = (supabase: Client) => ReturnType<Client["from"]>;
const db = ((supabase: Client) => supabase) as DbAny;

// ─── Cursor-based pagination ──────────────────────────────────────────────────

export interface CursorPage {
  limit: number;
  cursor?: string | null; // opaque base64 token
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Encode {id, created_at} → opaque base64 cursor token */
export function encodeCursor(id: string, createdAt: string): string {
  return Buffer.from(JSON.stringify({ id, created_at: createdAt })).toString("base64url");
}

/** Decode cursor token → {id, created_at}. Returns null on parse failure. */
export function decodeCursor(
  token: string
): { id: string; created_at: string } | null {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      id: string;
      created_at: string;
    };
  } catch {
    return null;
  }
}

/** Clamp a limit to [1, 100], defaulting to 25. */
export function clampLimit(raw: unknown): number {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? "25"), 10);
  if (isNaN(n)) return 25;
  return Math.max(1, Math.min(100, n));
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function getProfile(
  supabase: Client,
  userId: string
): Promise<(CommandProfile & { client_id: string | null }) | null> {
  const { data } = (await db(supabase)
    .from("users")
    .select("organization_id, client_id")
    .eq("id", userId)
    .single()) as { data: (CommandProfile & { client_id: string | null }) | null };
  return data;
}

export async function getRoleNames(
  supabase: Client,
  userId: string
): Promise<string[]> {
  const { data } = (await db(supabase)
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId)) as { data: CommandRoleRow[] | null };
  return (data ?? []).flatMap((r) => (r.roles ? [r.roles.name] : []));
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface AlertQueryOptions {
  organizationId: string;
  campaignId?: string | null;
  allowedCampaignIds?: string[] | null;
  severity?: string | null;
  resolved?: boolean | null;
  limit?: number;
  cursor?: string | null;
}

export async function queryAlerts(
  supabase: Client,
  opts: AlertQueryOptions
): Promise<PageResult<CommandAlertRow>> {
  const limit = clampLimit(opts.limit ?? 25);

  let q = db(supabase)
    .from("alerts")
    .select(
      `id, alert_type, severity, title, message, is_resolved,
       resolved_at, resolution_note, campaign_id, lead_id, created_at,
       campaigns(name)`
    )
    .eq("organization_id", opts.organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // fetch one extra to check hasMore

  if (opts.campaignId) q = q.eq("campaign_id", opts.campaignId);
  if (opts.allowedCampaignIds && opts.allowedCampaignIds.length > 0) {
    q = q.in("campaign_id", opts.allowedCampaignIds);
  }
  if (opts.allowedCampaignIds && opts.allowedCampaignIds.length === 0) {
    return { items: [], nextCursor: null, hasMore: false };
  }
  if (opts.severity) q = q.eq("severity", opts.severity);
  if (opts.resolved !== undefined && opts.resolved !== null) {
    q = q.eq("is_resolved", opts.resolved);
  }

  if (opts.cursor) {
    const decoded = decodeCursor(opts.cursor);
    if (decoded) {
      q = q.or(
        `created_at.lt.${decoded.created_at},and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`
      );
    }
  }

  const { data, error } = (await q) as {
    data: CommandAlertRow[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(last.id, last.created_at)
      : null;

  return { items, nextCursor, hasMore };
}

export async function getAllowedCampaignIdsForClientViewer(
  supabase: Client,
  organizationId: string,
  clientId: string | null
): Promise<string[]> {
  if (!clientId) return [];
  const { data, error } = (await db(supabase)
    .from("campaigns")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)) as { data: { id: string }[] | null; error: { message: string } | null };
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id);
}

export async function resolveAlert(
  supabase: Client,
  alertId: string,
  userId: string,
  resolutionNote?: string
): Promise<CommandAlertRow | null> {
  const { data, error } = (await db(supabase)
    .from("alerts")
    .update({
      is_resolved: true,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_note: resolutionNote ?? null,
    })
    .eq("id", alertId)
    .select()
    .single()) as { data: CommandAlertRow | null; error: { message: string } | null };

  if (error) throw new Error(error.message);
  return data;
}

// ─── Lead History ──────────────────────────────────────────────────────────────

export async function queryLeadHistory(
  supabase: Client,
  leadId: string,
  opts?: CursorPage
): Promise<PageResult<CommandLeadHistoryRow>> {
  const limit = clampLimit(opts?.limit ?? 50);

  let q = db(supabase)
    .from("lead_history")
    .select(
      "id, change_type, old_value, new_value, reason, ip_address, created_at, changed_by"
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (opts?.cursor) {
    const decoded = decodeCursor(opts.cursor);
    if (decoded) {
      q = q.or(
        `created_at.lt.${decoded.created_at},and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`
      );
    }
  }

  const { data, error } = (await q) as {
    data: CommandLeadHistoryRow[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(last.id, last.created_at)
      : null;

  return { items, nextCursor, hasMore };
}

// ─── Campaign metrics upsert ──────────────────────────────────────────────────

export async function upsertCampaignMetrics(
  supabase: Client,
  campaignId: string,
  metrics: Record<string, unknown>
): Promise<void> {
  const { data: existing } = (await db(supabase)
    .from("campaign_metrics")
    .select("id")
    .eq("campaign_id", campaignId)
    .single()) as { data: { id: string } | null };

  if (existing) {
    await db(supabase)
      .from("campaign_metrics")
      .update({ ...metrics, updated_at: new Date().toISOString() })
      .eq("campaign_id", campaignId);
  } else {
    await db(supabase)
      .from("campaign_metrics")
      .insert({ campaign_id: campaignId, ...metrics });
  }
}

export async function appendCampaignMetricsHistory(
  supabase: Client,
  campaignId: string,
  payload: {
    date?: string;
    total_leads_delivered?: number | null;
    channel_split?: Record<string, unknown> | null;
    deficit_leads?: number | null;
    lead_increment?: number | null;
    lead_replace?: number | null;
    total_campaign_spend?: number | null;
    updated_by?: string | null;
  }
): Promise<void> {
  const { error } = (await db(supabase)
    .from("campaign_metrics_history")
    .insert({
      campaign_id: campaignId,
      date: payload.date ?? new Date().toISOString().slice(0, 10),
      total_leads_delivered: payload.total_leads_delivered ?? 0,
      channel_split: payload.channel_split ?? {},
      deficit_leads: payload.deficit_leads ?? 0,
      lead_increment: payload.lead_increment ?? 0,
      lead_replace: payload.lead_replace ?? 0,
      total_campaign_spend: payload.total_campaign_spend ?? 0,
      updated_by: payload.updated_by ?? null,
    })) as { error: { message: string } | null };
  if (error) throw new Error(error.message);
}

export interface CampaignMetricsHistoryItem {
  id: string;
  date: string;
  total_leads_delivered: number | null;
  channel_split: Record<string, unknown> | null;
  deficit_leads: number | null;
  lead_increment: number | null;
  lead_replace: number | null;
  total_campaign_spend: number | null;
  updated_by: string | null;
  created_at: string;
  updated_by_user?: { id: string; full_name: string | null; email: string | null } | null;
}

export async function queryCampaignMetricsHistory(
  supabase: Client,
  campaignId: string,
  limit = 120
): Promise<CampaignMetricsHistoryItem[]> {
  const safeLimit = Math.max(1, Math.min(365, limit));
  const { data, error } = (await db(supabase)
    .from("campaign_metrics_history")
    .select("id, date, total_leads_delivered, channel_split, deficit_leads, lead_increment, lead_replace, total_campaign_spend, updated_by, created_at, users:updated_by(id, full_name, email)")
    .eq("campaign_id", campaignId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit)) as {
    data: Array<{
      id: string;
      date: string;
      total_leads_delivered: number | null;
      channel_split: Record<string, unknown> | null;
      deficit_leads: number | null;
      lead_increment: number | null;
      lead_replace: number | null;
      total_campaign_spend: number | null;
      updated_by: string | null;
      created_at: string;
      users: { id: string; full_name: string | null; email: string | null } | null;
    }> | null;
    error: { message: string } | null;
  };
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    total_leads_delivered: r.total_leads_delivered,
    channel_split: r.channel_split,
    deficit_leads: r.deficit_leads,
    lead_increment: r.lead_increment,
    lead_replace: r.lead_replace,
    total_campaign_spend: r.total_campaign_spend,
    updated_by: r.updated_by,
    created_at: r.created_at,
    updated_by_user: r.users ?? null,
  }));
}

// ─── Campaign analytics ───────────────────────────────────────────────────────

interface CampaignMetricsRow {
  sponsor_name: string | null;
  total_leads_allocated: number | null;
  total_campaign_spend: number | null;
  total_leads_delivered: number | null;
  deficit_leads: number | null;
  channel_split: unknown;
  total_leads: number | null;
  qa_pending_count: number | null;
  qualified_count: number | null;
  registered_count: number | null;
  attended_count: number | null;
  disqualified_count: number | null;
  no_show_count: number | null;
}

interface LeadAnalyticsRow {
  id: string;
  status: string;
  consent_status: string | null;
  channel: string | null;
  created_at: string;
}

interface AlertAnalyticsRow {
  id: string;
  alert_type: string;
  severity: string;
  is_resolved: boolean;
  created_at: string;
}

interface HistoryAnalyticsRow {
  id: string;
  change_type: string;
  created_at: string;
}

export async function getCampaignAnalytics(supabase: Client, campaignId: string) {
  const metricsResult = (await db(supabase)
    .from("campaign_metrics")
    .select("*")
    .eq("campaign_id", campaignId)
    .single()) as { data: CampaignMetricsRow | null };

  const leadsResult = (await supabase
    .from("leads")
    .select("id, status, consent_status, channel, created_at")
    .eq("campaign_id", campaignId)) as unknown as {
    data: LeadAnalyticsRow[] | null;
  };

  const leads = leadsResult.data ?? [];
  const leadIds = leads.map((l) => l.id);

  const histResult =
    leadIds.length > 0
      ? ((await db(supabase)
          .from("lead_history")
          .select("id, change_type, created_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(100)) as { data: HistoryAnalyticsRow[] | null })
      : { data: [] as HistoryAnalyticsRow[] };

  const alertResult = (await db(supabase)
    .from("alerts")
    .select("id, alert_type, severity, is_resolved, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(50)) as { data: AlertAnalyticsRow[] | null };

  return {
    metrics: metricsResult.data,
    leads,
    history: histResult.data ?? [],
    alerts: alertResult.data ?? [],
  };
}
