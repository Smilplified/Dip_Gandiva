import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  status: string;
  qa_status?: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  campaign_id: string;
  call_back?: string | null;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[]).map((r) =>
      r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_")
    );
    const canViewMisDashboard = roleNames.includes("mis") || roleNames.includes("admin");
    if (!canViewMisDashboard) {
      return NextResponse.json({ error: "Forbidden: MIS or Admin role required" }, { status: 403 });
    }

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const [campaignsRes, leadsRes] = await Promise.all([
      admin
        .from("campaigns")
        .select("id, name, status")
        .eq("organization_id", orgId),
      admin
        .from("leads")
        .select("id, status, qa_status, assigned_agent_id, created_at, campaign_id, call_back, organization_id")
        .eq("organization_id", orgId),
    ]);

    if (campaignsRes.error) {
      return NextResponse.json({ error: campaignsRes.error.message }, { status: 500 });
    }
    if (leadsRes.error) {
      return NextResponse.json({ error: leadsRes.error.message }, { status: 500 });
    }

    const campaigns = (campaignsRes.data ?? []) as CampaignRow[];
    const leads = (leadsRes.data ?? []) as LeadRow[];

    const totalCampaigns = campaigns.length;
    const totalLeadsUploaded = leads.length;
    const leadsAssignedToAgents = leads.filter((l) => !!l.assigned_agent_id).length;

    const completedStatuses = new Set(["closed_won", "closed_lost", "completed"]);
    const completedLeads = leads.filter((l) =>
      completedStatuses.has(String(l.status || "").toLowerCase())
    ).length;
    const pendingLeads = Math.max(0, totalLeadsUploaded - completedLeads);

    let qaApprovedLeads = 0;
    let qaRejectedLeads = 0;
    let callBackLeads = 0;

    const leadStatusMap = new Map<string, number>();
    const agentMap = new Map<
      string,
      {
        totalLeads: number;
        assignedLeads: number;
        pendingLeads: number;
        completedLeads: number;
        qaApprovedLeads: number;
        qaRejectedLeads: number;
        callBackLeads: number;
      }
    >();

    const pushAgent = (agentId: string | null) => {
      const key = agentId || "__unassigned__";
      if (!agentMap.has(key)) {
        agentMap.set(key, {
          totalLeads: 0,
          assignedLeads: 0,
          pendingLeads: 0,
          completedLeads: 0,
          qaApprovedLeads: 0,
          qaRejectedLeads: 0,
          callBackLeads: 0,
        });
      }
      return agentMap.get(key)!;
    };

    leads.forEach((l) => {
      const status = String(l.status || "").toLowerCase();
      leadStatusMap.set(status || "unknown", (leadStatusMap.get(status || "unknown") ?? 0) + 1);

      const qaRaw = String(l.qa_status ?? "").trim().toLowerCase();
      const isApproved = qaRaw === "approved" || qaRaw === "pass";
      const isPendingQa = !qaRaw;

      const callBackRaw = String(l.call_back ?? "").trim().toLowerCase();
      const hasCallBack =
        !!callBackRaw &&
        ["yes", "y", "true", "1", "callback", "call_back"].includes(callBackRaw);

      if (isApproved) qaApprovedLeads += 1;
      else if (!isPendingQa && qaRaw) qaRejectedLeads += 1;
      if (hasCallBack) callBackLeads += 1;

      const agentBucket = pushAgent(l.assigned_agent_id);
      agentBucket.totalLeads += 1;
      if (l.assigned_agent_id) {
        agentBucket.assignedLeads += 1;
      }
      if (completedStatuses.has(status)) {
        agentBucket.completedLeads += 1;
      } else {
        agentBucket.pendingLeads += 1;
      }
      if (isApproved) agentBucket.qaApprovedLeads += 1;
      else if (!isPendingQa && qaRaw) agentBucket.qaRejectedLeads += 1;
      if (hasCallBack) agentBucket.callBackLeads += 1;
    });

    const stats = {
      totalCampaigns,
      totalLeadsUploaded,
      leadsAssignedToAgents,
      pendingLeads,
      completedLeads,
      qaApprovedLeads,
      qaRejectedLeads,
      callBackLeads,
    };

    const leadStatus = Array.from(leadStatusMap.entries()).map(
      ([status, count]) => ({ status, count })
    );

    const campaignPerformanceMap = new Map<
      string,
      { name: string; totalLeads: number; closedWonLeads: number }
    >();
    const campaignNameById = new Map<string, string>();
    campaigns.forEach((c) => {
      campaignNameById.set(c.id, c.name);
    });

    leads.forEach((l) => {
      const key = l.campaign_id;
      if (!campaignPerformanceMap.has(key)) {
        campaignPerformanceMap.set(key, {
          name: campaignNameById.get(key) ?? "Unnamed",
          totalLeads: 0,
          closedWonLeads: 0,
        });
      }
      const bucket = campaignPerformanceMap.get(key)!;
      bucket.totalLeads += 1;
      if (String(l.status || "").toLowerCase() === "closed_won") {
        bucket.closedWonLeads += 1;
      }
    });

    const campaignPerformance = Array.from(campaignPerformanceMap.values()).sort(
      (a, b) => b.totalLeads - a.totalLeads
    );

    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 13);
    const dateKey = (d: Date) => d.toISOString().slice(0, 10);

    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dailyMap.set(dateKey(d), 0);
    }

    leads.forEach((l) => {
      const created = new Date(l.created_at);
      const key = dateKey(created);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      }
    });

    const dailyUploads = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    const agentIds = Array.from(agentMap.keys()).filter(
      (k) => k !== "__unassigned__"
    );
    let agentNames: Record<string, string> = {};
    if (agentIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", agentIds);
      (usersData ?? []).forEach((u: any) => {
        agentNames[u.id] = u.full_name || u.email || "Unknown";
      });
    }

    const agentDistribution = Array.from(agentMap.entries()).map(
      ([key, bucket]) => ({
        agent_id: key === "__unassigned__" ? null : key,
        agent_name:
          key === "__unassigned__"
            ? "Unassigned"
            : agentNames[key] ?? "Unknown",
        ...bucket,
      })
    );

    return NextResponse.json({
      stats,
      dailyUploads,
      campaignPerformance,
      leadStatus,
      agentDistribution,
    });
  } catch (err) {
    console.error("MIS dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

