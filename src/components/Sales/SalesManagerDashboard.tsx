"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Typography, Table, Tag, Avatar, Progress, Spin, Empty } from "antd";
import DashboardGreeting from "@/components/Dashboard/DashboardGreeting";
import {
  TeamOutlined,
  TrophyOutlined,
  DollarOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const { Text } = Typography;

type Trend = "up" | "down" | "neutral";

type StatCard = {
  value: string;
  change: string;
  trend: Trend;
};

type TeamMemberRow = {
  key: string;
  name: string;
  deals: number;
  revenue: string;
  conversion: number;
  trend: Trend;
  status: string;
};

type ActivityRow = {
  id: string;
  user: string;
  action: string;
  target: string;
  value: string;
  time: string;
  type: string;
};

type ManagerDashboardData = {
  stats: {
    teamMembers: StatCard;
    teamDealsClosed: StatCard;
    teamRevenue: StatCard;
    avgConversion: StatCard;
  };
  monthlyTeamData: { month: string; revenue: number; deals: number }[];
  pipelineStages: { stage: string; count: number; color: string; max: number }[];
  repPerformanceData: { name: string; deals: number; revenue: number }[];
  recentActivities: ActivityRow[];
  teamMembers: TeamMemberRow[];
};

const cardStyle = {
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  border: "1px solid #f0f0f0",
  transition: "all 0.3s ease",
  cursor: "pointer" as const,
};

export default function SalesManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ManagerDashboardData | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/sales/manager-dashboard", { credentials: "include" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Failed to load dashboard");
        setData(j);
      } catch (e) {
        console.error(e);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statsCards = useMemo(() => {
    const s = data?.stats;
    return [
      {
        title: "Team Members",
        value: s?.teamMembers.value ?? "0",
        change: s?.teamMembers.change ?? "—",
        trend: s?.teamMembers.trend ?? "neutral",
        icon: <TeamOutlined />,
        color: "#4f46e5",
        bgColor: "#eef2ff",
      },
      {
        title: "Team Deals Closed",
        value: s?.teamDealsClosed.value ?? "0",
        change: s?.teamDealsClosed.change ?? "—",
        trend: s?.teamDealsClosed.trend ?? "neutral",
        icon: <TrophyOutlined />,
        color: "#52c41a",
        bgColor: "#f6ffed",
      },
      {
        title: "Team Revenue",
        value: s?.teamRevenue.value ?? "$0",
        change: s?.teamRevenue.change ?? "—",
        trend: s?.teamRevenue.trend ?? "neutral",
        icon: <DollarOutlined />,
        color: "#722ed1",
        bgColor: "#f9f0ff",
      },
      {
        title: "Avg. Conversion",
        value: s?.avgConversion.value ?? "0%",
        change: s?.avgConversion.change ?? "—",
        trend: s?.avgConversion.trend ?? "neutral",
        icon: <RiseOutlined />,
        color: "#f59e0b",
        bgColor: "#fffbe6",
      },
    ];
  }, [data]);

  const monthlyTeamData = data?.monthlyTeamData ?? [];
  const pipelineStages = data?.pipelineStages ?? [];
  const repPerformanceData = data?.repPerformanceData ?? [];
  const recentActivities = data?.recentActivities ?? [];
  const teamMembers = data?.teamMembers ?? [];

  const teamColumns = [
    {
      title: "Sales Rep",
      key: "name",
      render: (record: TeamMemberRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar style={{ backgroundColor: "#4f46e5", flexShrink: 0 }}>{record.name[0]?.toUpperCase()}</Avatar>
          <Text strong style={{ fontSize: 14 }}>
            {record.name}
          </Text>
        </div>
      ),
    },
    {
      title: "Deals Closed",
      dataIndex: "deals",
      key: "deals",
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      render: (v: string) => (
        <Text strong style={{ color: "#52c41a" }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Conversion Rate",
      dataIndex: "conversion",
      key: "conversion",
      render: (v: number) => (
        <div style={{ minWidth: 150 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12 }}>{v}%</Text>
          </div>
          <Progress
            percent={v}
            size="small"
            showInfo={false}
            strokeColor={v >= 35 ? "#52c41a" : v >= 28 ? "#f59e0b" : "#ef4444"}
          />
        </div>
      ),
    },
    {
      title: "Trend",
      dataIndex: "trend",
      key: "trend",
      render: (trend: Trend) =>
        trend === "up" ? (
          <Tag color="success" icon={<ArrowUpOutlined />}>
            Up
          </Tag>
        ) : trend === "down" ? (
          <Tag color="error" icon={<ArrowDownOutlined />}>
            Down
          </Tag>
        ) : (
          <Tag>Flat</Tag>
        ),
    },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 4px" }}>
      <DashboardGreeting />

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {statsCards.map((stat, index) => (
          <Col xs={24} sm={12} xl={6} key={index}>
            <Card
              bordered={false}
              style={cardStyle}
              styles={{ body: { padding: "24px" } }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                    {stat.title}
                  </Text>
                  <div
                    style={{ fontSize: 32, fontWeight: 700, color: "#1f1f1f", lineHeight: 1, marginBottom: 12 }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {stat.trend === "up" && <ArrowUpOutlined style={{ color: "#52c41a", fontSize: 12 }} />}
                    {stat.trend === "down" && <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 12 }} />}
                    <Text
                      style={{
                        fontSize: 12,
                        color:
                          stat.trend === "up" ? "#52c41a" : stat.trend === "down" ? "#ef4444" : "#6b7280",
                        fontWeight: 500,
                      }}
                    >
                      {stat.change}
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: stat.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={14}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Team Revenue Trend</Text>}
            bordered={false}
            style={cardStyle}
            styles={{ body: { padding: "24px 24px 16px" } }}
          >
            {monthlyTeamData.length === 0 || monthlyTeamData.every((d) => d.revenue === 0) ? (
              <Empty description="No revenue data yet" style={{ padding: "48px 0" }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyTeamData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRevSM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={11} />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    formatter={(v: number) => [`$${(v / 1000).toFixed(1)}k`, "Revenue"]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevSM)"
                    name="Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Pipeline Overview</Text>}
            bordered={false}
            style={{ ...cardStyle, height: "100%" }}
            styles={{ body: { padding: "24px" } }}
          >
            {pipelineStages.length === 0 ? (
              <Empty description="No leads in pipeline" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pipelineStages.map((stage) => (
                  <div key={stage.stage}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>{stage.stage}</Text>
                      <Text strong style={{ fontSize: 13 }}>
                        {stage.count}
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round((stage.count / stage.max) * 100)}
                      showInfo={false}
                      strokeColor={stage.color}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={14}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Rep Performance (This Month)</Text>}
            bordered={false}
            style={cardStyle}
            styles={{ body: { padding: "24px 24px 16px" } }}
          >
            {repPerformanceData.length === 0 ? (
              <Empty description="No rep activity this month" style={{ padding: "48px 0" }} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={repPerformanceData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    formatter={(v: number, name: string) => [
                      name === "revenue" ? `$${v}k` : v,
                      name === "revenue" ? "Revenue" : "Deals",
                    ]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="deals" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Deals" />
                  <Bar dataKey="revenue" fill="#52c41a" radius={[6, 6, 0, 0]} name="Revenue ($k)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Recent Team Activity</Text>}
            bordered={false}
            style={{ ...cardStyle, height: "100%" }}
            styles={{ body: { padding: "20px 24px" } }}
          >
            {recentActivities.length === 0 ? (
              <Empty description="No recent activity" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {recentActivities.map((activity) => (
                  <div key={activity.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <Avatar
                      size={34}
                      style={{
                        backgroundColor: activity.type === "success" ? "#52c41a" : "#4f46e5",
                        flexShrink: 0,
                        fontSize: 13,
                      }}
                    >
                      {activity.user[0]?.toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: "#1f1f1f" }}>
                        <Text strong style={{ fontSize: 13 }}>
                          {activity.user}
                        </Text>{" "}
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {activity.action}
                        </Text>{" "}
                        <Text strong style={{ fontSize: 13 }}>
                          {activity.target}
                        </Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
                        {activity.value !== "—" && (
                          <Text strong style={{ fontSize: 12, color: "#52c41a" }}>
                            {activity.value}
                          </Text>
                        )}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {activity.time}
                        </Text>
                      </div>
                    </div>
                    {activity.type === "success" && (
                      <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 15, marginTop: 3 }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Team Leaderboard</Text>}
            bordered={false}
            style={cardStyle}
          >
            {teamMembers.length === 0 ? (
              <Empty description="No team members found" />
            ) : (
              <Table
                columns={teamColumns}
                dataSource={teamMembers}
                pagination={false}
                rowKey="key"
                size="middle"
                scroll={{ x: 640 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
