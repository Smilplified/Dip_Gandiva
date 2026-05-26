"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BarChartOutlined,
  CalendarOutlined,
  CrownOutlined,
  FireOutlined,
  FundProjectionScreenOutlined,
  ReloadOutlined,
  RiseOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import type {
  AgentPerformance,
  CampaignPerformance,
  TeamPerformanceResponse,
  TLSummary,
} from "@/app/api/tl/team-performance/route";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// Matches the channel name in TeamBuilderDnDView
const TEAM_ASSIGNMENT_CHANNEL = "team-assignment-updated";
// How often the performance page silently re-polls (ms)
const PERF_REFRESH_MS = 90_000;

// ─── Design tokens ─────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid #f0f0f0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const CHART_COLORS = ["#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96", "#13c2c2"];

function sectionTitle(title: string, icon: React.ReactNode) {
  return (
    <Space size={8} style={{ marginBottom: 16 }}>
      <span style={{ color: "#1677ff", fontSize: 18 }}>{icon}</span>
      <Title level={5} style={{ margin: 0 }}>
        {title}
      </Title>
    </Space>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  color,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card
      style={{ ...cardStyle, height: "100%" }}
      styles={{ body: { padding: "20px 22px" } }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <Space size={14} align="start">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `${color}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {title}
            </Text>
            <div
              style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}
            >
              {value}
            </div>
            {subtitle && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {subtitle}
              </Text>
            )}
          </div>
        </Space>
      )}
    </Card>
  );
}

// ─── Ranking badge ─────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span style={{ fontSize: 18 }}>🥇</span>
    );
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
  return (
    <Tag style={{ minWidth: 28, textAlign: "center", borderRadius: 20 }}>{rank}</Tag>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function TeamPerformanceDashboard() {
  const [data, setData] = useState<TeamPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(3, "month"),
    dayjs(),
  ]);
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("start_date", dateRange[0].format("YYYY-MM-DD"));
    params.set("end_date", dateRange[1].format("YYYY-MM-DD"));
    if (campaignFilter) params.set("campaign_id", campaignFilter);
    if (userFilter) params.set("user_id", userFilter);
    return `/api/tl/team-performance?${params.toString()}`;
  }, [dateRange, campaignFilter, userFilter]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const res = await fetch(buildUrl(), { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load performance data");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildUrl]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Silent refresh on a polling interval
  useEffect(() => {
    const id = window.setInterval(() => void load(true), PERF_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Listen for team assignment changes broadcast from the Team Builder page
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(TEAM_ASSIGNMENT_CHANNEL);
      channel.onmessage = () => void load(true);
    } catch {
      // BroadcastChannel not supported — fall back to polling only
    }
    return () => {
      if (channel) {
        channel.onmessage = null;
        channel.close();
      }
    };
  }, [load]);

  // ── Campaign & user options for filters ────────────────────────────────────
  const campaignOptions = useMemo(
    () =>
      (data?.campaigns ?? []).map((c) => ({
        value: c.campaign_id,
        label: c.campaign_name,
      })),
    [data]
  );

  const userOptions = useMemo(
    () =>
      (data?.agents ?? []).map((a) => ({
        value: a.agent_id,
        label: a.agent_name,
      })),
    [data]
  );

  // ── Agent table columns ────────────────────────────────────────────────────
  const agentColumns: ColumnsType<AgentPerformance> = [
    {
      title: "Rank",
      key: "rank",
      width: 60,
      render: (_: unknown, __: AgentPerformance, i: number) => <RankBadge rank={i + 1} />,
    },
    {
      title: "Agent",
      key: "agent",
      render: (_: unknown, row: AgentPerformance) => (
        <Space size={10}>
          <Avatar
            size={34}
            style={{ background: "#52c41a", flexShrink: 0, fontSize: 13 }}
          >
            {row.agent_name
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {row.agent_name}
            </Text>
            {row.agent_code && (
              <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                {row.agent_code}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: "TL",
      dataIndex: "tl_name",
      key: "tl_name",
      render: (v: string | null) =>
        v ? (
          <Tag color="blue" style={{ borderRadius: 20 }}>
            {v}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Campaigns",
      dataIndex: "campaigns_worked",
      key: "campaigns_worked",
      sorter: (a: AgentPerformance, b: AgentPerformance) =>
        a.campaigns_worked - b.campaigns_worked,
      render: (v: number) => (
        <Tag style={{ borderRadius: 20, minWidth: 28, textAlign: "center" }}>{v}</Tag>
      ),
      align: "center",
    },
    {
      title: "Total Uploaded",
      dataIndex: "total_leads",
      key: "total_leads",
      sorter: (a: AgentPerformance, b: AgentPerformance) => a.total_leads - b.total_leads,
      defaultSortOrder: "descend",
      render: (v: number) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "#1677ff",
            background: "#e6f4ff",
            borderRadius: 8,
            padding: "2px 10px",
          }}
        >
          {v.toLocaleString()}
        </span>
      ),
      align: "center",
    },
    {
      title: "Today",
      dataIndex: "today_leads",
      key: "today_leads",
      sorter: (a: AgentPerformance, b: AgentPerformance) =>
        a.today_leads - b.today_leads,
      render: (v: number) => (
        <span
          style={{
            fontWeight: 600,
            color: v > 0 ? "#52c41a" : "#bfbfbf",
            background: v > 0 ? "#f6ffed" : "transparent",
            borderRadius: 8,
            padding: "2px 10px",
          }}
        >
          {v}
        </span>
      ),
      align: "center",
    },
    {
      title: "This Week",
      dataIndex: "week_leads",
      key: "week_leads",
      align: "center",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "This Month",
      dataIndex: "month_leads",
      key: "month_leads",
      align: "center",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "Avg / Day",
      dataIndex: "avg_per_day",
      key: "avg_per_day",
      sorter: (a: AgentPerformance, b: AgentPerformance) =>
        a.avg_per_day - b.avg_per_day,
      align: "center",
      render: (v: number) => v.toFixed(1),
    },
    {
      title: "Last Upload",
      dataIndex: "last_upload_date",
      key: "last_upload_date",
      render: (v: string | null) =>
        v ? (
          <Text style={{ fontSize: 12 }}>
            {dayjs(v).format("DD MMM YYYY")}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  // ── Campaign table columns ─────────────────────────────────────────────────
  const campaignColumns: ColumnsType<CampaignPerformance> = [
    {
      title: "Campaign",
      key: "campaign",
      render: (_: unknown, row: CampaignPerformance) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>
            {row.campaign_name}
          </Text>
          {row.campaign_code && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {row.campaign_code}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Allocation",
      dataIndex: "total_allocation",
      key: "total_allocation",
      align: "center",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "Uploaded",
      dataIndex: "total_uploaded",
      key: "total_uploaded",
      align: "center",
      sorter: (a: CampaignPerformance, b: CampaignPerformance) =>
        a.total_uploaded - b.total_uploaded,
      defaultSortOrder: "descend",
      render: (v: number) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#1677ff",
            background: "#e6f4ff",
            borderRadius: 8,
            padding: "2px 10px",
          }}
        >
          {v.toLocaleString()}
        </span>
      ),
    },
    {
      title: "Progress",
      key: "progress",
      width: 180,
      render: (_: unknown, row: CampaignPerformance) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Progress
            percent={row.progress_pct}
            size="small"
            strokeColor={
              row.progress_pct >= 100
                ? "#52c41a"
                : row.progress_pct >= 60
                  ? "#1677ff"
                  : "#fa8c16"
            }
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {row.progress_pct}% of allocation
          </Text>
        </Space>
      ),
    },
    {
      title: "Agents",
      dataIndex: "agents_count",
      key: "agents_count",
      align: "center",
      render: (v: number) => v,
    },
  ];

  // ── TL summary columns ────────────────────────────────────────────────────
  const tlColumns: ColumnsType<TLSummary> = [
    {
      title: "Rank",
      key: "rank",
      width: 60,
      render: (_: unknown, __: TLSummary, i: number) => <RankBadge rank={i + 1} />,
    },
    {
      title: "Team Leader",
      key: "tl",
      render: (_: unknown, row: TLSummary) => (
        <Space size={10}>
          <Avatar
            size={34}
            style={{
              background: "linear-gradient(135deg,#1677ff,#4096ff)",
              fontSize: 13,
            }}
            icon={<CrownOutlined />}
          />
          <Text strong>{row.tl_name}</Text>
        </Space>
      ),
    },
    {
      title: "Agents",
      dataIndex: "agent_count",
      key: "agent_count",
      align: "center",
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Total Leads",
      dataIndex: "total_leads",
      key: "total_leads",
      sorter: (a: TLSummary, b: TLSummary) => a.total_leads - b.total_leads,
      defaultSortOrder: "descend",
      align: "center",
      render: (v: number) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#1677ff",
            background: "#e6f4ff",
            borderRadius: 8,
            padding: "2px 10px",
          }}
        >
          {v.toLocaleString()}
        </span>
      ),
    },
    {
      title: "Today",
      dataIndex: "today_leads",
      key: "today_leads",
      align: "center",
      render: (v: number) => (
        <span style={{ color: v > 0 ? "#52c41a" : "#bfbfbf", fontWeight: 600 }}>
          {v}
        </span>
      ),
    },
    {
      title: "This Week",
      dataIndex: "week_leads",
      key: "week_leads",
      align: "center",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "This Month",
      dataIndex: "month_leads",
      key: "month_leads",
      align: "center",
      render: (v: number) => v.toLocaleString(),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  const sum = data?.summary;
  const isOM = data?.scope === "organization";

  return (
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      {/* ── Filters ── */}
      <Card style={{ ...cardStyle, background: "#fafafa" }} styles={{ body: { padding: "14px 18px" } }}>
        <Space wrap size={12}>
          <RangePicker
            value={dateRange}
            onChange={(vals) => {
              if (vals?.[0] && vals?.[1])
                setDateRange([vals[0], vals[1]]);
            }}
            presets={[
              { label: "Last 7 days", value: [dayjs().subtract(7, "d"), dayjs()] },
              { label: "Last 30 days", value: [dayjs().subtract(30, "d"), dayjs()] },
              { label: "Last 3 months", value: [dayjs().subtract(3, "month"), dayjs()] },
              { label: "This month", value: [dayjs().startOf("month"), dayjs()] },
            ]}
            allowClear={false}
            style={{ width: 280 }}
          />
          <Select
            placeholder="All campaigns"
            allowClear
            style={{ width: 220 }}
            options={campaignOptions}
            value={campaignFilter}
            onChange={(v) => setCampaignFilter(v ?? null)}
            showSearch
            optionFilterProp="label"
          />
          <Select
            placeholder="All agents"
            allowClear
            style={{ width: 200 }}
            options={userOptions}
            value={userFilter}
            onChange={(v) => setUserFilter(v ?? null)}
            showSearch
            optionFilterProp="label"
          />
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={() => void load()}
            loading={loading || refreshing}
          >
            Apply
          </Button>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => void load(true)}
            loading={refreshing}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* ── KPI cards ── */}
      {loading && !data ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <Col xs={12} sm={8} lg={4} key={k}>
              <Card style={cardStyle}>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : error ? (
        <Card style={cardStyle}>
          <Empty description={error}>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => void load()}>
              Retry
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} lg={4}>
              <KpiCard
                icon={<TeamOutlined />}
                color="#1677ff"
                title="Total Leads Uploaded"
                value={(sum?.total_leads ?? 0).toLocaleString()}
                subtitle={`in date range`}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <KpiCard
                icon={<FireOutlined />}
                color="#52c41a"
                title="Leads Today"
                value={(sum?.today_leads ?? 0).toLocaleString()}
                subtitle="uploaded today"
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <KpiCard
                icon={<CalendarOutlined />}
                color="#722ed1"
                title="This Week"
                value={(sum?.week_leads ?? 0).toLocaleString()}
                subtitle="last 7 days"
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <KpiCard
                icon={<FundProjectionScreenOutlined />}
                color="#fa8c16"
                title="Active Campaigns"
                value={sum?.active_campaigns ?? 0}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <KpiCard
                icon={<RiseOutlined />}
                color="#13c2c2"
                title="Avg Upload / Day"
                value={sum?.avg_per_day?.toFixed(1) ?? "0"}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <KpiCard
                icon={<WarningOutlined />}
                color="#eb2f96"
                title="Pending Allocation"
                value={(sum?.pending_allocation ?? 0).toLocaleString()}
              />
            </Col>
          </Row>

          {/* Top performer banner */}
          {sum?.top_performer && (
            <Card
              style={{
                ...cardStyle,
                background: "linear-gradient(135deg,#fff7e6 0%,#fffbf0 100%)",
                borderColor: "#ffd591",
              }}
              styles={{ body: { padding: "14px 20px" } }}
            >
              <Space size={12}>
                <span style={{ fontSize: 28 }}>🏆</span>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Top Performer
                  </Text>
                  <Title level={5} style={{ margin: 0 }}>
                    {sum.top_performer.name}
                    <Tag
                      color="gold"
                      style={{ marginLeft: 10, borderRadius: 20, fontSize: 13 }}
                    >
                      {sum.top_performer.total.toLocaleString()} leads
                    </Tag>
                  </Title>
                </div>
              </Space>
            </Card>
          )}

          {/* ── Charts row ── */}
          <Row gutter={[20, 20]}>
            {/* Daily upload trend */}
            <Col xs={24} xl={isOM ? 14 : 24}>
              <Card style={cardStyle} styles={{ body: { padding: "20px 20px 10px" } }}>
                {sectionTitle("Daily Upload Trend", <BarChartOutlined />)}
                {(data?.daily_trend ?? []).length === 0 ? (
                  <Empty description="No data in range" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart
                      data={data?.daily_trend ?? []}
                      margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1677ff" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(d) => dayjs(d).format("DD MMM")}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RTooltip
                        labelFormatter={(l) => dayjs(l as string).format("DD MMM YYYY")}
                        formatter={(v) => [`${v} leads`, "Uploaded"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        stroke="#1677ff"
                        strokeWidth={2}
                        fill="url(#tpGrad)"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>

            {/* TL comparison chart (OM only) */}
            {isOM && (data?.tl_summaries ?? []).length > 0 && (
              <Col xs={24} xl={10}>
                <Card style={cardStyle} styles={{ body: { padding: "20px 20px 10px" } }}>
                  {sectionTitle("Team Comparison", <TeamOutlined />)}
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={(data?.tl_summaries ?? []).slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="tl_name"
                        tick={{ fontSize: 11 }}
                        width={90}
                      />
                      <RTooltip formatter={(v) => [`${v} leads`, "Total"]} />
                      <Bar dataKey="total_leads" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {(data?.tl_summaries ?? []).slice(0, 8).map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            )}
          </Row>

          {/* ── Campaign performance chart ── */}
          {(data?.campaigns ?? []).length > 0 && (
            <Card style={cardStyle} styles={{ body: { padding: "20px 20px 10px" } }}>
              {sectionTitle("Campaign Performance", <FundProjectionScreenOutlined />)}
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(data?.campaigns ?? []).slice(0, 12)}
                  margin={{ top: 4, right: 8, bottom: 40, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="campaign_name"
                    tick={{ fontSize: 11 }}
                    angle={-28}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip />
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 6 }}
                  />
                  <Bar
                    dataKey="total_allocation"
                    name="Allocation"
                    fill="#e5e7eb"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="total_uploaded"
                    name="Uploaded"
                    fill="#1677ff"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ── TL Summary table (OM only) ── */}
          {isOM && (data?.tl_summaries ?? []).length > 0 && (
            <Card style={cardStyle} styles={{ body: { padding: "20px 20px 8px" } }}>
              {sectionTitle("TL-wise Summary", <CrownOutlined />)}
              <Table<TLSummary>
                columns={tlColumns}
                dataSource={data?.tl_summaries ?? []}
                rowKey="tl_id"
                pagination={false}
                size="small"
                scroll={{ x: 640 }}
              />
            </Card>
          )}

          {/* ── Agent performance table ── */}
          <Card style={cardStyle} styles={{ body: { padding: "20px 20px 8px" } }}>
            {sectionTitle("Agent-wise Performance", <UserOutlined />)}
            {(data?.agents ?? []).length === 0 ? (
              <Empty description="No agent data for selected filters" />
            ) : (
              <Table<AgentPerformance>
                columns={agentColumns}
                dataSource={data?.agents ?? []}
                rowKey="agent_id"
                pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
                size="small"
                scroll={{ x: 960 }}
                rowClassName={(_, i) =>
                  i < 3 ? "top-performer-row" : ""
                }
              />
            )}
          </Card>

          {/* ── Campaign table ── */}
          <Card style={cardStyle} styles={{ body: { padding: "20px 20px 8px" } }}>
            {sectionTitle("Campaign-wise Performance", <FundProjectionScreenOutlined />)}
            {(data?.campaigns ?? []).length === 0 ? (
              <Empty description="No campaign data" />
            ) : (
              <Table<CampaignPerformance>
                columns={campaignColumns}
                dataSource={data?.campaigns ?? []}
                rowKey="campaign_id"
                pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
                size="small"
                scroll={{ x: 700 }}
              />
            )}
          </Card>
        </>
      )}

      <style jsx global>{`
        .top-performer-row td {
          background: #fffbe6 !important;
        }
      `}</style>
    </Space>
  );
}
