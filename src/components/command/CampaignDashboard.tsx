"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Tabs,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Table,
  message,
  Skeleton,
  Alert,
  Typography,
  Progress,
  Space,
  Badge,
  Button,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  AlertOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import AlertsPanel from "./AlertsPanel";
import LeadAuditPanel from "./LeadAuditPanel";
import { useAuth } from "@/context/AuthContext";

const { Text, Title } = Typography;

interface CampaignAnalytics {
  metrics: {
    sponsor_name?: string;
    total_leads_allocated?: number;
    total_campaign_spend?: number;
    total_leads_delivered?: number;
    deficit_leads?: number;
    lead_increment?: number;
    lead_replace?: number;
    daily_reporting?: Record<string, unknown>;
    channel_split?: Record<string, number>;
  } | null;
  leads: {
    total: number;
    statusBreakdown: Record<string, number>;
    consentBreakdown: Record<string, number>;
    channelBreakdown: Record<string, number>;
    dailyLeads: { date: string; count: number }[];
  };
  alerts: { id: string; severity: string; is_resolved: boolean }[];
}

interface LeadRow {
  id: string;
  name: string | null;
  company_name: string | null;
  email: string | null;
  status: string;
  consent_status: string | null;
  channel: string | null;
  created_at: string;
  risk_flags: unknown;
}

interface CampaignDetail {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  client_name: string | null;
  industry: string | null;
  geography: string | null;
  lead_type: string | null;
  cpl: number | null;
  total_allocation: number | null;
  achieved: number | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  clients?: { company_name?: string | null }[] | { company_name?: string | null } | null;
  campaign_metrics?: {
    sponsor_name?: string | null;
    total_leads_allocated?: number | null;
    total_campaign_spend?: number | null;
    total_leads_delivered?: number | null;
    daily_reporting?: Record<string, unknown> | null;
    channel_split?: Record<string, unknown> | null;
    deficit_leads?: number | null;
    lead_increment?: number | null;
    lead_replace?: number | null;
  }[] | {
    sponsor_name?: string | null;
    total_leads_allocated?: number | null;
    total_campaign_spend?: number | null;
    total_leads_delivered?: number | null;
    daily_reporting?: Record<string, unknown> | null;
    channel_split?: Record<string, unknown> | null;
    deficit_leads?: number | null;
    lead_increment?: number | null;
    lead_replace?: number | null;
  };
}

interface CampaignDashboardProps {
  campaignId: string;
}

interface CampaignMetricsHistoryRow {
  id: string;
  date: string;
  total_leads_delivered: number | null;
  total_campaign_spend: number | null;
  deficit_leads: number | null;
  lead_increment: number | null;
  lead_replace: number | null;
  channel_split: Record<string, unknown> | null;
  updated_by_user?: { full_name: string | null; email: string | null } | null;
  created_at: string;
}

const STATUS_COLORS_PIE = [
  "#1890ff", "#52c41a", "#faad14", "#ff4d4f",
  "#722ed1", "#13c2c2", "#fa8c16", "#a0d911",
];

const CONSENT_COLORS: Record<string, string> = {
  verified: "#52c41a",
  missing: "#ff4d4f",
  pending: "#faad14",
  disputed: "#722ed1",
};

export default function CampaignDashboard({ campaignId }: CampaignDashboardProps) {
  const { hasRole } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [metricsHistory, setMetricsHistory] = useState<CampaignMetricsHistoryRow[]>([]);
  const [auditLeadId, setAuditLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const isClientViewer = hasRole("client_viewer");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, analyticsRes] = await Promise.all([
        fetch(`/api/command/campaigns/${campaignId}`),
        fetch(`/api/command/campaigns/${campaignId}/analytics`),
      ]);

      const campData = await campRes.json() as { campaign?: CampaignDetail };
      const analyticsData = await analyticsRes.json() as CampaignAnalytics;

      setCampaign(campData.campaign ?? null);
      setAnalytics(analyticsData);
    } catch {
      message.error("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await fetch(
        `/api/command/leads?campaign_id=${campaignId}&limit=100`
      );
      const data = await res.json() as { leads?: LeadRow[] };
      setLeads(data.leads ?? []);
    } catch {
      message.error("Failed to load leads");
    } finally {
      setLeadsLoading(false);
    }
  }, [campaignId]);

  const fetchMetricsHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/command/campaigns/${campaignId}/history?limit=180`);
      const data = (await res.json()) as { history?: CampaignMetricsHistoryRow[] };
      setMetricsHistory(data.history ?? []);
    } catch {
      message.error("Failed to load campaign history");
    } finally {
      setHistoryLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "leads") {
      void fetchLeads();
    }
    if (activeTab === "history") {
      void fetchMetricsHistory();
    }
  }, [activeTab, fetchLeads, fetchMetricsHistory]);

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />;
  if (!campaign) return <Alert message="Campaign not found" type="error" />;
  const metrics = Array.isArray(campaign.campaign_metrics)
    ? campaign.campaign_metrics[0]
    : campaign.campaign_metrics;
  const clientFromRelation = Array.isArray(campaign.clients)
    ? campaign.clients[0]?.company_name
    : campaign.clients?.company_name;
  const resolvedClientName = campaign.client_name ?? clientFromRelation ?? null;

  const totalAllocated = metrics?.total_leads_allocated ?? campaign.total_allocation ?? 0;
  const deliveredLeads = metrics?.total_leads_delivered ?? analytics?.leads.total ?? 0;
  const achievementPct = totalAllocated > 0 ? Math.round((deliveredLeads / totalAllocated) * 100) : 0;
  const achievementDisplay = Math.min(100, Math.max(0, achievementPct));

  const dailyReporting =
    metrics?.daily_reporting && typeof metrics.daily_reporting === "object"
      ? (metrics.daily_reporting as Record<string, unknown>)
      : {};
  const channelSplitFromMetrics =
    metrics?.channel_split && typeof metrics.channel_split === "object"
      ? (metrics.channel_split as Record<string, number>)
      : {};

  const openAlerts = analytics?.alerts.filter((a) => !a.is_resolved).length ?? 0;
  const criticalAlerts = analytics?.alerts.filter(
    (a) => !a.is_resolved && a.severity === "critical"
  ).length ?? 0;

  const statusData = Object.entries(analytics?.leads.statusBreakdown ?? {}).map(
    ([name, value]) => ({ name, value })
  );

  const consentData = Object.entries(analytics?.leads.consentBreakdown ?? {}).map(
    ([name, value]) => ({ name, value, fill: CONSENT_COLORS[name] ?? "#8c8c8c" })
  );

  const channelSource =
    Object.keys(channelSplitFromMetrics).length > 0
      ? channelSplitFromMetrics
      : (analytics?.leads.channelBreakdown ?? {});
  const channelData = Object.entries(channelSource).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
    value: Number(value) || 0,
  }));

  const dailyLeadSeries =
    (analytics?.leads.dailyLeads?.length ?? 0) > 0
      ? (analytics?.leads.dailyLeads ?? [])
      : Object.entries(dailyReporting)
          .map(([date, v]) => {
            const row = v as { delivered?: number; allocated?: number };
            return { date, count: Number(row?.delivered ?? row?.allocated ?? 0) };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

  const leadColumns: ColumnsType<LeadRow> = [
    {
      title: "Lead",
      key: "lead",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name ?? "—"}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{row.company_name ?? "—"}</div>
        </div>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email", width: 180,
      render: (e: string) => <span style={{ fontSize: 12 }}>{e ?? "—"}</span> },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (s: string) => <Tag color="blue">{s.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "Consent",
      dataIndex: "consent_status",
      width: 100,
      render: (cs: string) => (
        <Tag color={
          cs === "verified" ? "green" :
          cs === "missing" ? "red" :
          cs === "disputed" ? "purple" : "orange"
        }>
          {cs ?? "pending"}
        </Tag>
      ),
    },
    {
      title: "Channel",
      dataIndex: "channel",
      width: 100,
      render: (ch: string) => <Tag>{ch ?? "email"}</Tag>,
    },
    {
      title: "Risk",
      key: "risk",
      width: 70,
      render: (_, row) => {
        const flags = (row.risk_flags as unknown[]) ?? [];
        return flags.length > 0 ? (
          <Badge count={flags.length} style={{ backgroundColor: "#ff4d4f" }} />
        ) : (
          <CheckCircleOutlined style={{ color: "#52c41a" }} />
        );
      },
    },
    {
      title: "Audit",
      key: "audit",
      width: 80,
      fixed: "right" as const,
      render: (_, row) => (
        <Tooltip title="Open audit panel">
          <Button
            size="small"
            icon={<SafetyOutlined />}
            onClick={() => setAuditLeadId(row.id)}
          >
            Audit
          </Button>
        </Tooltip>
      ),
    },
  ];

  const historyColumns: ColumnsType<CampaignMetricsHistoryRow> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 110,
    },
    {
      title: "Delivered",
      dataIndex: "total_leads_delivered",
      key: "total_leads_delivered",
      width: 100,
      render: (v: number | null) => v ?? 0,
    },
    {
      title: "Spend",
      dataIndex: "total_campaign_spend",
      key: "total_campaign_spend",
      width: 120,
      render: (v: number | null) => `₹${Number(v ?? 0).toLocaleString()}`,
    },
    {
      title: "Deficit",
      dataIndex: "deficit_leads",
      key: "deficit_leads",
      width: 90,
      render: (v: number | null) => v ?? 0,
    },
    {
      title: "Increment/Replace",
      key: "inc_replace",
      width: 140,
      render: (_, r) => `${r.lead_increment ?? 0} / ${r.lead_replace ?? 0}`,
    },
    {
      title: "Channel Split",
      key: "channel_split",
      render: (_, r) => {
        const split = r.channel_split ?? {};
        const tags = Object.entries(split).map(([k, v]) => `${k}:${String(v)}`);
        return tags.length ? tags.join(" · ") : "—";
      },
    },
    {
      title: "Updated By",
      key: "updated_by_user",
      width: 180,
      render: (_, r) => r.updated_by_user?.full_name ?? r.updated_by_user?.email ?? "—",
    },
    {
      title: "Changed",
      key: "changed",
      width: 220,
      render: (_, row, index) => {
        const prev = metricsHistory[index + 1];
        if (!prev) return <Tag color="blue">Initial Snapshot</Tag>;
        const changed: string[] = [];
        if ((row.total_leads_delivered ?? 0) !== (prev.total_leads_delivered ?? 0)) changed.push("Delivered");
        if ((row.total_campaign_spend ?? 0) !== (prev.total_campaign_spend ?? 0)) changed.push("Spend");
        if ((row.deficit_leads ?? 0) !== (prev.deficit_leads ?? 0)) changed.push("Deficit");
        if ((row.lead_increment ?? 0) !== (prev.lead_increment ?? 0)) changed.push("Increment");
        if ((row.lead_replace ?? 0) !== (prev.lead_replace ?? 0)) changed.push("Replace");
        if (JSON.stringify(row.channel_split ?? {}) !== JSON.stringify(prev.channel_split ?? {})) changed.push("Channel Split");
        return changed.length ? (
          <Space size={[4, 4]} wrap>
            {changed.map((c) => (
              <Tag key={c} color="purple">{c}</Tag>
            ))}
          </Space>
        ) : (
          <Tag>None</Tag>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: "overview",
      label: (
        <span>
          <EyeOutlined /> Overview
        </span>
      ),
      children: (
        <div>
          {/* Header stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {[
              {
                title: "Total Leads",
                value: analytics?.leads.total ?? 0,
                suffix: `/ ${totalAllocated || "∞"}`,
                color: "#1890ff",
              },
              {
                title: "Achieved",
                value: achievementPct,
                suffix: "%",
                color: achievementPct >= 80 ? "#52c41a" : "#faad14",
              },
              {
                title: "Delivered",
                value: deliveredLeads,
                color: "#52c41a",
              },
              {
                title: "Deficit",
                value: analytics?.metrics?.deficit_leads ?? 0,
                color: "#ff4d4f",
              },
              {
                title: "Spend (₹)",
                value: analytics?.metrics?.total_campaign_spend ?? 0,
                color: "#722ed1",
              },
              {
                title: "Open Alerts",
                value: openAlerts,
                color: criticalAlerts > 0 ? "#ff4d4f" : "#faad14",
              },
            ].map((stat) => (
              <Col xs={12} sm={8} xl={4} key={stat.title}>
                <Card
                  size="small"
                  bordered
                  style={{ textAlign: "center", borderRadius: 10 }}
                >
                  <Statistic
                    title={<Text style={{ fontSize: 12 }}>{stat.title}</Text>}
                    value={stat.value}
                    suffix={stat.suffix}
                    valueStyle={{ color: stat.color, fontSize: 22, fontWeight: 700 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Campaign details */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card title="Campaign & Metrics" size="small" bordered style={{ borderRadius: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Client", value: resolvedClientName },
                    { label: "Industry", value: campaign.industry },
                    { label: "Geography", value: campaign.geography },
                    { label: "Lead Type", value: campaign.lead_type },
                    { label: "CPL", value: campaign.cpl ? `₹${campaign.cpl}` : null },
                    { label: "Start", value: campaign.start_date },
                    { label: "End", value: campaign.end_date },
                    { label: "Sponsor", value: metrics?.sponsor_name ?? null },
                    { label: "Leads Allocated", value: metrics?.total_leads_allocated ?? null },
                    { label: "Spend Budget", value: metrics?.total_campaign_spend != null ? `₹${metrics.total_campaign_spend}` : null },
                    { label: "Total Delivered", value: metrics?.total_leads_delivered ?? null },
                    { label: "Deficit", value: metrics?.deficit_leads ?? null },
                    { label: "Lead Increment", value: metrics?.lead_increment ?? null },
                    { label: "Lead Replace", value: metrics?.lead_replace ?? null },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <Text type="secondary">{label}</Text>
                      <Text strong>{value ?? "—"}</Text>
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Achievement</Text>
                    <Progress
                      percent={achievementDisplay}
                      format={() => `${achievementPct}%`}
                      strokeColor={achievementPct >= 80 ? "#52c41a" : achievementPct >= 50 ? "#faad14" : "#ff4d4f"}
                      size="small"
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                      Daily Reporting
                    </Text>
                    {Object.keys(dailyReporting).length === 0 ? (
                      <Text type="secondary">—</Text>
                    ) : (
                      <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: 8 }}>
                        {Object.entries(dailyReporting).map(([date, v]) => {
                          const row = v as { allocated?: number; delivered?: number };
                          return (
                            <div key={date} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                              <Text>{date}</Text>
                              <Text>
                                Allocated: <strong>{row?.allocated ?? 0}</strong> · Delivered: <strong>{row?.delivered ?? 0}</strong>
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                      Channel Split
                    </Text>
                    {channelData.length === 0 ? (
                      <Text type="secondary">—</Text>
                    ) : (
                      <Space wrap>
                        {channelData.map((c) => (
                          <Tag key={c.name} color="blue">{c.name}: {c.value}</Tag>
                        ))}
                      </Space>
                    )}
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={16}>
              <Card title="Daily Lead Volume" size="small" bordered style={{ borderRadius: 10 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyLeadSeries}>
                    <defs>
                      <linearGradient id="colorDailyLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#8c8c8c" fontSize={11} />
                    <YAxis stroke="#8c8c8c" fontSize={11} />
                    <RTooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#1890ff"
                      strokeWidth={2}
                      fill="url(#colorDailyLeads)"
                      name="Leads"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "channels",
      label: "Channels",
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Lead Status Breakdown" size="small" bordered style={{ borderRadius: 10 }}>
                {statusData.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center" }}>
                    <Text type="secondary">No status data available</Text>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS_PIE[i % STATUS_COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <RTooltip />
                  <Legend />
                </PieChart>
                </ResponsiveContainer>
                )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Channel Split" size="small" bordered style={{ borderRadius: 10 }}>
              {channelData.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <Text type="secondary">No channel data available</Text>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={channelData} margin={{ left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#8c8c8c" fontSize={12} />
                  <YAxis stroke="#8c8c8c" fontSize={12} />
                  <RTooltip />
                  <Bar dataKey="value" fill="#1890ff" radius={[6, 6, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: "leads",
      label: `Leads (${analytics?.leads.total ?? 0})`,
      children: (
        <div>
          <Table
            columns={leadColumns}
            dataSource={leads}
            rowKey="id"
            loading={leadsLoading}
            size="small"
            scroll={{ x: 900 }}
            pagination={{ pageSize: 20, showTotal: (t) => `${t} leads` }}
            onRow={(row) => ({
              onClick: () => setAuditLeadId(row.id),
              style: { cursor: "pointer" },
            })}
          />
        </div>
      ),
    },
    {
      key: "compliance",
      label: (
        <span>
          <SafetyOutlined /> Compliance
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Consent Status" size="small" bordered style={{ borderRadius: 10 }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={consentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {consentData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Consent Summary" size="small" bordered style={{ borderRadius: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 4px" }}>
                {Object.entries(analytics?.leads.consentBreakdown ?? {}).map(
                  ([status, count]) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Tag
                        color={
                          status === "verified" ? "green" :
                          status === "missing" ? "red" :
                          status === "disputed" ? "purple" : "orange"
                        }
                        style={{ fontWeight: 600, fontSize: 12 }}
                      >
                        {status.toUpperCase()}
                      </Tag>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Progress
                          percent={
                            analytics?.leads.total
                              ? Math.round((count / analytics.leads.total) * 100)
                              : 0
                          }
                          size="small"
                          style={{ width: 100, margin: 0 }}
                          showInfo={false}
                          strokeColor={CONSENT_COLORS[status] ?? "#8c8c8c"}
                        />
                        <Text strong style={{ minWidth: 30, textAlign: "right" }}>
                          {count}
                        </Text>
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: "alerts",
      label: (
        <span>
          <AlertOutlined />
          {" "}Alerts
          {openAlerts > 0 && (
            <Badge
              count={openAlerts}
              style={{ marginLeft: 8, backgroundColor: criticalAlerts > 0 ? "#ff4d4f" : "#faad14" }}
            />
          )}
        </span>
      ),
      children: <AlertsPanel campaignId={campaignId} />,
    },
    {
      key: "history",
      label: "History",
      children: (
        <Card size="small" bordered style={{ borderRadius: 10 }}>
          <Table
            rowKey="id"
            columns={historyColumns}
            dataSource={metricsHistory}
            loading={historyLoading}
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 15, showTotal: (t) => `${t} updates` }}
          />
        </Card>
      ),
    },
    ...(!isClientViewer
      ? [
          {
            key: "qa",
            label: (
              <span>
                <ExclamationCircleOutlined /> QA
              </span>
            ),
            children: (
              <Card size="small" bordered style={{ borderRadius: 10 }}>
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <ExclamationCircleOutlined style={{ fontSize: 40, color: "#d9d9d9" }} />
                  <Title level={5} style={{ color: "#8c8c8c", marginTop: 12 }}>
                    QA Module
                  </Title>
                  <Text type="secondary">
                    Quality assurance reviews and scoring will appear here.
                  </Text>
                </div>
              </Card>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              {campaign.name}
            </Title>
            <Tag
              color={
                campaign.status === "active" ? "green" :
                campaign.status === "paused" ? "orange" :
                campaign.status === "completed" ? "blue" : "default"
              }
            >
              {campaign.status.toUpperCase()}
            </Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {campaign.campaign_id} &nbsp;·&nbsp; {resolvedClientName ?? "—"}
          </Text>
        </div>

        <Space>
          {criticalAlerts > 0 && (
            <Tag color="red" icon={<AlertOutlined />}>
              {criticalAlerts} CRITICAL
            </Tag>
          )}
          <Button size="small" onClick={() => void fetchData()}>
            Refresh
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="small"
        type="card"
      />

      <LeadAuditPanel
        leadId={auditLeadId}
        open={Boolean(auditLeadId)}
        onClose={() => setAuditLeadId(null)}
        onLeadUpdated={() => {
          void fetchData();
          if (activeTab === "leads") void fetchLeads();
        }}
      />
    </div>
  );
}
