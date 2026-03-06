"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Spin,
  Avatar,
  Badge,
  Checkbox,
  Table,
  Button,
  Empty,
} from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PercentageOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
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

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  total_agents: number;
};

type Stats = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalInterested: number;
  conversionPct: number;
};

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

const leadTrendSample = [
  { date: "Mon", leads: 28, conversions: 9 },
  { date: "Tue", leads: 35, conversions: 12 },
  { date: "Wed", leads: 42, conversions: 15 },
  { date: "Thu", leads: 38, conversions: 13 },
  { date: "Fri", leads: 45, conversions: 18 },
  { date: "Sat", leads: 32, conversions: 10 },
  { date: "Sun", leads: 29, conversions: 8 },
];

const campaignPerformanceSample = [
  { name: "Campaign A", leads: 142, converted: 48 },
  { name: "Campaign B", leads: 98, converted: 32 },
  { name: "Campaign C", leads: 76, converted: 28 },
  { name: "Campaign D", leads: 65, converted: 18 },
  { name: "Campaign E", leads: 54, converted: 15 },
];

const tasksData = [
  { id: 1, task: "Review Campaign A performance", dueTime: "10:00 AM", priority: "high", completed: false },
  { id: 2, task: "Assign new agents to Campaign B", dueTime: "11:30 AM", priority: "high", completed: false },
  { id: 3, task: "Export weekly lead report", dueTime: "02:00 PM", priority: "medium", completed: false },
  { id: 4, task: "Update pipeline stages", dueTime: "03:30 PM", priority: "medium", completed: true },
  { id: 5, task: "Sync with QA on quality scores", dueTime: "04:00 PM", priority: "low", completed: false },
];

const activityFeedData = [
  { id: 1, user: "System", action: "Campaign", target: "Enterprise Q1", value: "activated", time: "5 mins ago", type: "success" },
  { id: 2, user: "Agent", action: "moved lead in", target: "Campaign B", value: "to Qualified", time: "12 mins ago", type: "info" },
  { id: 3, user: "You", action: "created", target: "Campaign C", value: "", time: "25 mins ago", type: "info" },
  { id: 4, user: "QA", action: "approved", target: "12 leads", value: "in Campaign A", time: "45 mins ago", type: "default" },
  { id: 5, user: "Agent", action: "closed", target: "3 deals", value: "Campaign B", time: "1 hour ago", type: "default" },
];

const statusColors: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "blue",
};

export default function TeamLeaderDashboardPage() {
  const router = useRouter();
  const { hasRole, isInitialized, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignRow[]>([]);
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
      const [statsRes, campaignsRes] = await Promise.all([
        fetch("/api/tl/campaigns/stats", { credentials: "include" }),
        fetch("/api/tl/campaigns", { credentials: "include" }),
      ]);
      const statsData = await statsRes.json();
      const campaignsData = await campaignsRes.json();
      if (statsRes.ok) setStats(statsData);
      if (campaignsRes.ok) {
        const all = campaignsData.campaigns ?? [];
        setRecentCampaigns(all.slice(0, 5));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("team_leader") && !hasRole("tl")) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [isInitialized, hasRole, router, fetchData]);

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

  const statsCards = [
    {
      title: "Total Campaigns",
      value: String(stats?.totalCampaigns ?? 0),
      change: "All time",
      trend: "neutral" as const,
      icon: <FundProjectionScreenOutlined />,
      color: "#1890ff",
      bgColor: "#e6f4ff",
    },
    {
      title: "Active Campaigns",
      value: String(stats?.activeCampaigns ?? 0),
      change: "Running now",
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
      title: "Conversion",
      value: `${stats?.conversionPct ?? 0}%`,
      change: stats?.totalInterested != null ? `${stats.totalInterested} interested` : "—",
      trend: "up" as const,
      icon: <PercentageOutlined />,
      color: "#faad14",
      bgColor: "#fffbe6",
    },
  ];

  const campaignStatusPie = [
    { name: "Active", value: stats?.activeCampaigns ?? 0, color: "#52c41a" },
    { name: "Paused", value: Math.max(0, (stats?.totalCampaigns ?? 0) - (stats?.activeCampaigns ?? 0) - 1), color: "#faad14" },
    { name: "Draft", value: 1, color: "#8c8c8c" },
    { name: "Completed", value: 0, color: "#1890ff" },
  ].filter((d) => d.value > 0);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("team_leader") && !hasRole("tl")) {
    return null;
  }

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1f1f1f" }}>
          Team Leader Dashboard
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 6 }}>
          Welcome back, {profile?.full_name || "Team Leader"}. Manage campaigns, team, and pipeline.
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
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
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
              <Card title={<Text strong style={{ fontSize: 16 }}>Lead Trend</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px" } }}>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={leadTrendSample} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTLLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTLConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#8c8c8c" fontSize={11} />
                    <YAxis stroke="#8c8c8c" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="leads" stroke="#1890ff" strokeWidth={2} fillOpacity={1} fill="url(#colorTLLeads)" name="Leads" />
                    <Area type="monotone" dataKey="conversions" stroke="#52c41a" strokeWidth={2} fillOpacity={1} fill="url(#colorTLConv)" name="Conversions" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Text strong style={{ fontSize: 16 }}>Campaign Performance</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px" } }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={campaignPerformanceSample} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#8c8c8c" fontSize={11} />
                    <YAxis stroke="#8c8c8c" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="leads" fill="#1890ff" radius={[8, 8, 0, 0]} name="Leads" />
                    <Bar dataKey="converted" fill="#52c41a" radius={[8, 8, 0, 0]} name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Text strong style={{ fontSize: 16 }}>Campaign Status</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px" } }}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={campaignStatusPie.length > 0 ? campaignStatusPie : [{ name: "No data", value: 1, color: "#d9d9d9" }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "#d9d9d9", strokeWidth: 1 }}
                    >
                      {(campaignStatusPie.length > 0 ? campaignStatusPie : [{ name: "No data", value: 1, color: "#d9d9d9" }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
            <Col xs={24} xl={12}>
              <Card
                title={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Text strong style={{ fontSize: 16 }}>My Tasks</Text><Badge count={tasksData.filter((t) => !t.completed).length} style={{ backgroundColor: "#1890ff" }} /></div>}
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
                      <Avatar size={36} style={{ backgroundColor: activity.type === "success" ? "#52c41a" : "#1890ff", flexShrink: 0 }}>{activity.user[0]}</Avatar>
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
                title={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Text strong style={{ fontSize: 16 }}>Recent Campaigns</Text>{recentCampaigns.length > 0 ? <Link href="/tl/campaigns">View all</Link> : null}</div>}
                bordered={false}
                style={cardStyle}
              >
                {recentCampaigns.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No campaigns yet">
                    <Button type="primary" onClick={() => router.push("/tl/campaigns/create")}>Create Campaign</Button>
                  </Empty>
                ) : (
                  <Table
                    dataSource={recentCampaigns}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    columns={[
                      {
                        title: "Sr. No",
                        key: "srno",
                        width: 70,
                        render: (_: unknown, __: unknown, index: number) => index + 1,
                      },
                      {
                        title: "Campaign",
                        key: "name",
                        render: (_, r) => (
                          <Link href={`/tl/campaigns/${r.id}`} style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</Link>
                        ),
                      },
                      { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <Tag color={statusColors[s] ?? "default"}>{s}</Tag> },
                      { title: "Leads", dataIndex: "total_leads", key: "total_leads", width: 90 },
                      { title: "Agents", dataIndex: "total_agents", key: "total_agents", width: 90 },
                      {
                        title: "",
                        key: "action",
                        render: (_, r) => (
                          <Link href={`/tl/campaigns/${r.id}`}>
                            <Button type="link" icon={<RightOutlined />}>View</Button>
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
