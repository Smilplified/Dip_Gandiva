"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Tag,
  Avatar,
  Badge,
  Checkbox,
  Table,
  Button,
  Empty,
  message,
} from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "@/context/AuthContext";

const { Text, Title } = Typography;

type QaStats = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalInterested: number;
  conversionPct: number;
};

type CampaignWithLeads = { id: string; name?: string; leads: { qa_status: string | null }[] };

const cardStyle = {
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  border: "1px solid #f0f0f0",
  transition: "all 0.3s ease",
  cursor: "pointer" as const,
};

const statCardHover = (e: React.MouseEvent<HTMLDivElement>, enter: boolean) => {
  const el = e.currentTarget;
  el.style.boxShadow = enter ? "0 4px 16px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.04)";
  el.style.transform = enter ? "translateY(-2px)" : "translateY(0)";
};

const reviewTrendSample = [
  { day: "Mon", reviewed: 24, pending: 12 },
  { day: "Tue", reviewed: 32, pending: 8 },
  { day: "Wed", reviewed: 28, pending: 14 },
  { day: "Thu", reviewed: 41, pending: 6 },
  { day: "Fri", reviewed: 35, pending: 10 },
  { day: "Sat", reviewed: 18, pending: 16 },
  { day: "Sun", reviewed: 22, pending: 12 },
];

const qaStatusPieSample = [
  { name: "Approved", value: 156, color: "#52c41a" },
  { name: "Rejected", value: 24, color: "#ff4d4f" },
  { name: "Pending", value: 42, color: "#faad14" },
];

const tasksData = [
  { id: 1, task: "Review Campaign A leads (12 pending)", dueTime: "10:00 AM", priority: "high", completed: false },
  { id: 2, task: "Approve quality scores for Campaign B", dueTime: "11:30 AM", priority: "high", completed: false },
  { id: 3, task: "Export QA report", dueTime: "02:00 PM", priority: "medium", completed: false },
  { id: 4, task: "Update QA guidelines", dueTime: "03:30 PM", priority: "medium", completed: true },
  { id: 5, task: "Sync with TL on rejections", dueTime: "04:00 PM", priority: "low", completed: false },
];

const activityFeedData = [
  { id: 1, user: "You", action: "approved", target: "24 leads", value: "Campaign A", time: "5 mins ago", type: "success" },
  { id: 2, user: "System", action: "Campaign B", target: "8 new leads", value: "need review", time: "12 mins ago", type: "info" },
  { id: 3, user: "You", action: "rejected", target: "3 leads", value: "Campaign C", time: "25 mins ago", type: "info" },
  { id: 4, user: "TL", action: "requested re-review", target: "Campaign D", value: "", time: "45 mins ago", type: "default" },
  { id: 5, user: "You", action: "exported", target: "QA report", value: "", time: "1 hour ago", type: "default" },
];

export default function QADashboardPage() {
  const { hasRole, isInitialized, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithLeads[]>([]);
  const [stats, setStats] = useState<QaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchData = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);
    setLoading(true);
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        fetch("/api/qa/dashboard", { credentials: "include" }),
        fetch("/api/tl/campaigns/stats", { credentials: "include" }),
      ]);
      const dashboardData = await dashboardRes.json();
      const statsData = await statsRes.json();
      if (!dashboardRes.ok) throw new Error(dashboardData.error || "Failed to load");
      setCampaigns(dashboardData.campaigns ?? []);
      if (statsRes.ok) setStats(statsData);
    } catch {
      message.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("qa") && !hasRole("admin")) return;
    fetchData();
  }, [isInitialized, hasRole, fetchData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
    };
    const handleOffline = () => setIsOffline(true);
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [fetchData]);

  const pendingQaCount = campaigns.reduce(
    (sum, c) => sum + (c.leads?.filter((l) => !l.qa_status || String(l.qa_status).trim() === "").length ?? 0),
    0
  );

  const campaignsWithPending = campaigns
    .map((c) => ({
      id: c.id,
      name: (c as { name?: string }).name ?? `Campaign ${c.id.slice(0, 8)}`,
      pending: c.leads?.filter((l) => !l.qa_status || String(l.qa_status).trim() === "").length ?? 0,
      total: c.leads?.length ?? 0,
    }))
    .filter((c) => c.pending > 0);

  const statsCards = [
    {
      title: "Total Campaigns",
      value: String(stats?.totalCampaigns ?? 0),
      change: "All campaigns",
      trend: "neutral" as const,
      icon: <FundProjectionScreenOutlined />,
      color: "#1890ff",
      bgColor: "#e6f4ff",
    },
    {
      title: "Active Campaigns",
      value: String(stats?.activeCampaigns ?? 0),
      change: "Running",
      trend: "up" as const,
      icon: <RiseOutlined />,
      color: "#52c41a",
      bgColor: "#f6ffed",
    },
    {
      title: "Total Leads",
      value: String(stats?.totalLeads ?? 0),
      change: "Across campaigns",
      trend: "neutral" as const,
      icon: <TeamOutlined />,
      color: "#722ed1",
      bgColor: "#f9f0ff",
    },
    {
      title: "Pending QA Review",
      value: String(pendingQaCount),
      change: `${stats?.conversionPct ?? 0}% conversion`,
      trend: pendingQaCount > 0 ? "up" as const : "neutral" as const,
      icon: <AuditOutlined />,
      color: "#eb2f96",
      bgColor: "#fff0f6",
    },
  ];

  const campaignReviewData = campaigns.map((c) => {
    const leads = c.leads ?? [];
    const reviewed = leads.filter((l) => {
      const s = String(l.qa_status ?? "").trim().toLowerCase();
      return s && s !== "";
    }).length;
    const pending = leads.filter((l) => {
      const s = String(l.qa_status ?? "").trim();
      return !s;
    }).length;
    return {
      campaign: (c as { name?: string }).name ?? `Campaign ${c.id.slice(0, 8)}`,
      reviewed,
      pending,
    };
  }).filter((r) => r.reviewed > 0 || r.pending > 0);

  const qaStatusFromCampaigns = (() => {
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    campaigns.forEach((c) => {
      c.leads?.forEach((l) => {
        const s = String(l.qa_status ?? "").trim().toLowerCase();
        if (!s) pending++;
        else if (s === "approved" || s === "pass") approved++;
        else rejected++;
      });
    });
    const out = [];
    if (approved > 0) out.push({ name: "Approved", value: approved, color: "#52c41a" });
    if (rejected > 0) out.push({ name: "Rejected", value: rejected, color: "#ff4d4f" });
    if (pending > 0) out.push({ name: "Pending", value: pending, color: "#faad14" });
    return out.length > 0 ? out : [{ name: "No data", value: 1, color: "#d9d9d9" }];
  })();

  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("qa") && !hasRole("admin")) {
    return null;
  }

  return (
    <div style={{ padding: "0 4px", maxWidth: 1600, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1f1f1f" }}>
          QA Dashboard
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 6 }}>
          Welcome back, {profile?.full_name || "QA"}. Review and edit leads across campaigns.
        </Text>
      </div>

      {isOffline && (
        <div style={{ marginBottom: 24 }}>
          <Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Data will reload when back online, or{" "}
            <a onClick={(e) => { e.preventDefault(); fetchData(); }}>retry now</a>.
          </Text>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
            {statsCards.map((stat, index) => (
              <Col xs={24} sm={12} xl={6} key={index}>
                <Card
                  bordered={false}
                  style={{ ...cardStyle, height: "100%" }}
                  styles={{ body: { padding: "24px" } }}
                  onMouseEnter={(e) => statCardHover(e, true)}
                  onMouseLeave={(e) => statCardHover(e, false)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>{stat.title}</Text>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "#1f1f1f", lineHeight: 1, marginBottom: 12 }}>{stat.value}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {stat.trend === "up" && <ArrowUpOutlined style={{ color: "#52c41a", fontSize: 12 }} />}
                        <Text style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>{stat.change}</Text>
                      </div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: stat.bgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: stat.color }}>
                      {stat.icon}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
            <Col xs={24} xl={8}>
              <Card title={<Text strong style={{ fontSize: 16 }}>QA Status Distribution</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px", overflow: "visible" } }}>
                <div className="qa-status-pie-wrapper" style={{ overflow: "visible", minHeight: 320 }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={qaStatusFromCampaigns}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent, cx, cy }) => {
                          const pct = (percent * 100).toFixed(0);
                          const isSingleSlice = percent >= 0.99;
                          if (isSingleSlice) {
                            return (
                              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 14, fontWeight: 500 }}>
                                {name} {pct}%
                              </text>
                            );
                          }
                          return `${name} ${pct}%`;
                        }}
                        labelLine={{ stroke: "#d9d9d9", strokeWidth: 1 }}
                      >
                      {qaStatusFromCampaigns.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Text strong style={{ fontSize: 16 }}>Review Trend</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px" } }}>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={reviewTrendSample} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorQAReviewed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorQAPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#faad14" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#faad14" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#8c8c8c" fontSize={11} />
                    <YAxis stroke="#8c8c8c" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="reviewed" stroke="#52c41a" strokeWidth={2} fillOpacity={1} fill="url(#colorQAReviewed)" name="Reviewed" />
                    <Area type="monotone" dataKey="pending" stroke="#faad14" strokeWidth={2} fillOpacity={1} fill="url(#colorQAPending)" name="Pending" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Text strong style={{ fontSize: 16 }}>Campaign Review Status</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px" } }}>
                {campaignReviewData.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No campaign data yet" style={{ margin: "48px 0" }} />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={campaignReviewData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="campaign"
                        stroke="#8c8c8c"
                        fontSize={11}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => (v && v.length > 18 ? `${v.slice(0, 18)}…` : v)}
                      />
                      <YAxis stroke="#8c8c8c" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="reviewed" fill="#52c41a" radius={[8, 8, 0, 0]} name="Reviewed" />
                      <Bar dataKey="pending" fill="#faad14" radius={[8, 8, 0, 0]} name="Pending" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
            <Col xs={24} xl={12}>
              <Card
                title={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Text strong style={{ fontSize: 16 }}>My Tasks</Text><Badge count={tasksData.filter((t) => !t.completed).length} style={{ backgroundColor: "#722ed1" }} /></div>}
                bordered={false}
                style={cardStyle}
                styles={{ body: { padding: "20px 24px" } }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {tasksData.map((task) => (
                    <div key={task.id} style={{ padding: "14px 16px", backgroundColor: task.completed ? "#fafafa" : "#fff", border: "1px solid #f0f0f0", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                      <Checkbox checked={task.completed} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: task.completed ? "#8c8c8c" : "#1f1f1f", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined style={{ marginRight: 4 }} />{task.dueTime}</Text>
                      </div>
                      <Tag color={task.priority === "high" ? "red" : task.priority === "medium" ? "orange" : "default"} style={{ fontSize: 11, margin: 0 }}>{task.priority.toUpperCase()}</Tag>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title={<Text strong style={{ fontSize: 16 }}>Activity Feed</Text>} bordered={false} style={cardStyle} styles={{ body: { padding: "20px 24px" } }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {activityFeedData.map((activity) => (
                    <div key={activity.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Avatar size={36} style={{ backgroundColor: activity.type === "success" ? "#52c41a" : "#722ed1", flexShrink: 0 }}>{activity.user[0]}</Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: "#1f1f1f" }}>
                          <Text strong style={{ fontSize: 13 }}>{activity.user}</Text>{" "}
                          <Text type="secondary" style={{ fontSize: 13 }}>{activity.action}</Text>{" "}
                          <Text strong style={{ fontSize: 13 }}>{activity.target}</Text>
                          {activity.value && <Text type="secondary" style={{ fontSize: 13 }}> {activity.value}</Text>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>{activity.time}</Text>
                      </div>
                      {activity.type === "success" && <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16, marginTop: 4 }} />}
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24}>
              <Card
                title={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Text strong style={{ fontSize: 16 }}>Campaigns with Pending QA</Text><Text type="secondary" style={{ fontSize: 13 }}>Review these leads</Text></div>}
                bordered={false}
                style={cardStyle}
              >
                {campaignsWithPending.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No pending QA reviews. All leads are up to date." />
                ) : (
                  <Table
                    dataSource={campaignsWithPending}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    columns={[
                      {
                        title: "Campaign",
                        key: "name",
                        render: (_, r) => (
                          <Link href={`/qa/campaigns/${r.id}`} style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</Link>
                        ),
                      },
                      { title: "Pending", dataIndex: "pending", key: "pending", width: 100, render: (v: number) => <Tag color="orange">{v} leads</Tag> },
                      { title: "Total Leads", dataIndex: "total", key: "total", width: 110 },
                      {
                        title: "",
                        key: "action",
                        render: (_, r) => (
                          <Link href={`/qa/campaigns/${r.id}`}>
                            <Button type="primary" size="small" icon={<RightOutlined />}>Review</Button>
                          </Link>
                        ),
                      },
                    ]}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
