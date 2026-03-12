"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  message,
  Input,
  Select,
} from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  SearchOutlined,
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

type AgentCampaignRow = {
  id: string;
  name: string;
  client_name: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  region: string | null;
  created_at: string;
  total_leads: number;
  active_leads: number;
  won_leads: number;
  qualified_leads?: number;
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
  { day: "Mon", leads: 12, won: 3 },
  { day: "Tue", leads: 18, won: 5 },
  { day: "Wed", leads: 14, won: 4 },
  { day: "Thu", leads: 22, won: 7 },
  { day: "Fri", leads: 16, won: 5 },
  { day: "Sat", leads: 10, won: 2 },
  { day: "Sun", leads: 8, won: 2 },
];

const tasksData = [
  { id: 1, task: "Follow up with Campaign A leads", dueTime: "10:00 AM", priority: "high", completed: false },
  { id: 2, task: "Complete call backs - Campaign B", dueTime: "11:30 AM", priority: "high", completed: false },
  { id: 3, task: "Update lead status in CRM", dueTime: "02:00 PM", priority: "medium", completed: false },
  { id: 4, task: "Send proposal to qualified lead", dueTime: "03:30 PM", priority: "medium", completed: true },
  { id: 5, task: "Review tomorrow's call list", dueTime: "04:00 PM", priority: "low", completed: false },
];

const activityFeedData = [
  { id: 1, user: "You", action: "closed", target: "1 lead", value: "Campaign A", time: "5 mins ago", type: "success" },
  { id: 2, user: "You", action: "updated status", target: "3 leads", value: "to Contacted", time: "12 mins ago", type: "info" },
  { id: 3, user: "You", action: "added note to", target: "Lead #1245", value: "", time: "25 mins ago", type: "info" },
  { id: 4, user: "TL", action: "assigned", target: "5 new leads", value: "Campaign B", time: "45 mins ago", type: "default" },
  { id: 5, user: "You", action: "scheduled follow-up", target: "Acme Corp", value: "", time: "1 hour ago", type: "default" },
];

const statusColors: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "blue",
};

export default function AgentDashboardPage() {
  const { profile, hasRole, isInitialized } = useAuth();
  const [campaigns, setCampaigns] = useState<AgentCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const totals = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.total_leads ?? 0), 0);
    const activeLeads = campaigns.reduce((sum, c) => sum + (c.active_leads ?? 0), 0);
    const wonLeads = campaigns.reduce((sum, c) => sum + (c.won_leads ?? 0), 0);
    const conversionPct = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
    return { totalCampaigns, activeCampaigns, totalLeads, activeLeads, wonLeads, conversionPct };
  }, [campaigns]);

  const fetchData = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/campaigns", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load campaigns");
      setCampaigns(data.campaigns ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load assigned campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("agent")) return;
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

  const statsCards = [
    {
      title: "Assigned Campaigns",
      value: String(totals.totalCampaigns),
      change: "Total",
      trend: "neutral" as const,
      icon: <FundProjectionScreenOutlined />,
      color: "#1890ff",
      bgColor: "#e6f4ff",
    },
    {
      title: "Active Campaigns",
      value: String(totals.activeCampaigns),
      change: "Running",
      trend: "up" as const,
      icon: <RiseOutlined />,
      color: "#52c41a",
      bgColor: "#f6ffed",
    },
    {
      title: "Leads",
      value: String(totals.totalLeads),
      change: `${totals.activeLeads} active`,
      trend: "neutral" as const,
      icon: <TeamOutlined />,
      color: "#722ed1",
      bgColor: "#f9f0ff",
    },
    {
      title: "Conversion %",
      value: `${totals.conversionPct}%`,
      change: `${totals.wonLeads} won`,
      trend: "up" as const,
      icon: <CheckCircleOutlined />,
      color: "#faad14",
      bgColor: "#fffbe6",
    },
  ];

  const campaignChartData = campaigns.slice(0, 6).map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    leads: c.total_leads ?? 0,
    qualified: c.qualified_leads ?? c.won_leads ?? 0,
  }));

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    const q = searchText.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.industry ?? "").toLowerCase().includes(q) ||
          (c.geography ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [campaigns, searchText, statusFilter]);

  const campaignPieData = campaigns.length > 0
    ? campaigns.slice(0, 5).map((c, i) => ({
        name: (c.name ?? "Unnamed").trim() || "Unnamed",
        value: c.total_leads ?? 0,
        color: ["#1890ff", "#52c41a", "#722ed1", "#faad14", "#13c2c2"][i % 5],
      })).filter((d) => d.value > 0)
    : [{ name: "No data", value: 1, color: "#d9d9d9" }];

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("agent")) {
    return null;
  }

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1f1f1f" }}>
          Agent Dashboard
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 6 }}>
          Welcome back, {profile?.full_name || "Agent"}. Here are your assigned campaigns and lead progress.
        </Text>
      </div>

      {isOffline && (
        <div style={{ marginBottom: 24 }}>
          <Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Data will reload when back online, or{" "}
            <Button type="link" onClick={fetchData} style={{ padding: 0 }}>retry now</Button>.
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
              <Card title={<Text strong style={{ fontSize: 16 }}>My Lead Trend</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px" } }}>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={leadTrendSample} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorAgentLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAgentWon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#8c8c8c" fontSize={11} />
                    <YAxis stroke="#8c8c8c" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="leads" stroke="#1890ff" strokeWidth={2} fillOpacity={1} fill="url(#colorAgentLeads)" name="Leads" />
                    <Area type="monotone" dataKey="won" stroke="#52c41a" strokeWidth={2} fillOpacity={1} fill="url(#colorAgentWon)" name="Won" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Text strong style={{ fontSize: 16 }}>Campaign Leads</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px" } }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={campaignChartData.length > 0 ? campaignChartData : [{ name: "—", leads: 0, qualified: 0 }]} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#8c8c8c" fontSize={11} />
                    <YAxis stroke="#8c8c8c" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="leads" fill="#1890ff" radius={[8, 8, 0, 0]} name="Leads" />
                    <Bar dataKey="qualified" fill="#52c41a" radius={[8, 8, 0, 0]} name="Qualified" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Text strong style={{ fontSize: 16 }}>Leads by Campaign</Text>} bordered={false} style={{ ...cardStyle, height: "100%" }} styles={{ body: { padding: "24px 24px 16px", overflow: "visible" } }}>
                <div className="chart-pie-wrapper" style={{ overflow: "visible", minHeight: 320 }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={campaignPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent, cx, cy }) => {
                          const pct = (percent * 100).toFixed(0);
                          const displayName = name && name.length > 18 ? `${name.slice(0, 18)}…` : name;
                          const isSingleSlice = percent >= 0.99;
                          if (isSingleSlice) {
                            return (
                              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 14, fontWeight: 500 }}>
                                {displayName} {pct}%
                              </text>
                            );
                          }
                          return `${displayName} ${pct}%`;
                        }}
                        labelLine={{ stroke: "#d9d9d9", strokeWidth: 1 }}
                      >
                      {campaignPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
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
                title={<Text strong style={{ fontSize: 16 }}>My Assigned Campaigns</Text>}
                bordered={false}
                style={cardStyle}
                extra={
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Input
                      placeholder="Search campaigns..."
                      prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                      style={{ width: 220 }}
                    />
                    <Select
                      placeholder="Filter by status"
                      allowClear
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { value: "draft", label: "Draft" },
                        { value: "active", label: "Active" },
                        { value: "paused", label: "Paused" },
                        { value: "completed", label: "Completed" },
                      ]}
                      style={{ width: 160 }}
                    />
                  </div>
                }
              >
                <Table
                  className="table-single-line"
                  dataSource={filteredCampaigns}
                  rowKey="id"
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} campaigns` }}
                  size="middle"
                  scroll={{ x: 900 }}
                  locale={{ emptyText: "No campaigns assigned yet. Your Team Leader can assign you to campaigns." }}
                  columns={[
                    { title: "#", key: "index", width: 56, align: "center" as const, render: (_, __, i) => i + 1 },
                    {
                      title: "Campaign",
                      dataIndex: "name",
                      key: "name",
                      ellipsis: true,
                      render: (val: string, r: AgentCampaignRow) => (
                        <Link href={`/agent/campaigns/${r.id}`} style={{ fontWeight: 600, fontSize: 14 }}>{val}</Link>
                      ),
                    },
                    { title: "Status", dataIndex: "status", key: "status", width: 100, render: (v: string) => <Tag color={statusColors[v] ?? "default"}>{v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v}</Tag> },
                    { title: "Start Date", dataIndex: "start_date", key: "start_date", width: 110, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : "—" },
                    { title: "End Date", dataIndex: "end_date", key: "end_date", width: 110, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : "—" },
                    { title: "Leads", dataIndex: "total_leads", key: "total_leads", width: 100 },
                    { title: "Active", dataIndex: "active_leads", key: "active_leads", width: 90 },
                    {
                      title: "",
                      key: "action",
                      width: 100,
                      render: (_, r: AgentCampaignRow) => (
                        <Link href={`/agent/campaigns/${r.id}`}>
                          <Button type="primary" size="small" icon={<EyeOutlined />}>View</Button>
                        </Link>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
