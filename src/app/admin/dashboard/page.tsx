"use client";

import { Card, Row, Col, Typography, Table, Tag, Avatar, Badge, Checkbox } from "antd";
import DashboardGreeting from "@/components/Dashboard/DashboardGreeting";
import {
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const { Text, Title } = Typography;

const userGrowthData = [
  { month: "Jan", users: 180, logins: 420 },
  { month: "Feb", users: 195, logins: 485 },
  { month: "Mar", users: 210, logins: 520 },
  { month: "Apr", users: 222, logins: 610 },
  { month: "May", users: 235, logins: 680 },
  { month: "Jun", users: 248, logins: 720 },
];

const roleDistributionData = [
  { name: "Agent", value: 142, color: "#4f46e5" },
  { name: "Team Leader", value: 28, color: "#52c41a" },
  { name: "QA", value: 24, color: "#722ed1" },
  { name: "Sales", value: 32, color: "#f59e0b" },
  { name: "Admin", value: 22, color: "#6b7280" },
];

const pipelineData = [
  { stage: "Lead", count: 245 },
  { stage: "Qualified", count: 168 },
  { stage: "Proposal", count: 98 },
  { stage: "Negotiation", count: 56 },
  { stage: "Closed Won", count: 42 },
];

const tasksData = [
  { id: 1, task: "Review new user permissions", dueTime: "10:00 AM", priority: "high", completed: false },
  { id: 2, task: "Approve role change requests", dueTime: "11:30 AM", priority: "high", completed: false },
  { id: 3, task: "Export monthly report", dueTime: "02:00 PM", priority: "medium", completed: false },
  { id: 4, task: "Update system settings", dueTime: "03:30 PM", priority: "medium", completed: true },
  { id: 5, task: "Audit login logs", dueTime: "04:00 PM", priority: "low", completed: false },
];

const recentUsersData = [
  { id: 1, name: "Sarah Johnson", email: "sarah@acme.com", role: "Agent", status: "Active", time: "2 mins ago" },
  { id: 2, name: "Mike Chen", email: "mike@techstart.com", role: "Team Leader", status: "Active", time: "15 mins ago" },
  { id: 3, name: "Emma Wilson", email: "emma@global.io", role: "QA", status: "Active", time: "1 hour ago" },
  { id: 4, name: "James Brown", email: "james@innovate.com", role: "Sales", status: "Active", time: "2 hours ago" },
  { id: 5, name: "Lisa Anderson", email: "lisa@dataflow.com", role: "Agent", status: "Active", time: "3 hours ago" },
];

const activityFeedData = [
  { id: 1, user: "Sarah", action: "added new user", target: "John Doe", role: "Agent", time: "5 mins ago", type: "success" },
  { id: 2, user: "Mike", action: "updated role for", target: "Emma Wilson", role: "QA", time: "12 mins ago", type: "info" },
  { id: 3, user: "Admin", action: "changed settings", target: "Login policy", role: "", time: "25 mins ago", type: "info" },
  { id: 4, user: "James", action: "exported report", target: "Monthly users", role: "", time: "45 mins ago", type: "default" },
  { id: 5, user: "Lisa", action: "approved", target: "Role request", role: "", time: "1 hour ago", type: "default" },
];

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

export default function AdminDashboardPage() {
  const statsData = [
    {
      title: "Total Users",
      value: "248",
      change: "+18 this month",
      trend: "up",
      icon: <UserOutlined />,
      color: "#4f46e5",
      bgColor: "#eef2ff",
    },
    {
      title: "Active Roles",
      value: "6",
      change: "All assigned",
      trend: "neutral",
      icon: <SafetyCertificateOutlined />,
      color: "#52c41a",
      bgColor: "#f6ffed",
    },
    {
      title: "Total Revenue",
      value: "$284.5k",
      change: "+12.5%",
      trend: "up",
      icon: <DollarOutlined />,
      color: "#722ed1",
      bgColor: "#f9f0ff",
    },
    {
      title: "Conversion",
      value: "34%",
      change: "+2.1%",
      trend: "up",
      icon: <RiseOutlined />,
      color: "#f59e0b",
      bgColor: "#fffbe6",
    },
  ];

  const userColumns = [
    {
      title: "User",
      key: "user",
      render: (record: (typeof recentUsersData)[0]) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar style={{ backgroundColor: "#4f46e5" }}>{record.name[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => <Tag color="blue" style={{ fontSize: 12 }}>{role}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color="green" style={{ fontSize: 12 }}>{status}</Tag>
      ),
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      render: (time: string) => <Text type="secondary" style={{ fontSize: 12 }}>{time}</Text>,
    },
  ];

  return (
    <div style={{ padding: "0 4px" }}>
      <DashboardGreeting />

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {statsData.map((stat, index) => (
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
                  <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                    {stat.title}
                  </Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#1f1f1f", lineHeight: 1, marginBottom: 12 }}>
                    {stat.value}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {stat.trend === "up" && <ArrowUpOutlined style={{ color: "#52c41a", fontSize: 12 }} />}
                    {stat.trend === "down" && <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 12 }} />}
                    <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{stat.change}</Text>
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
        <Col xs={24} xl={8}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>User Growth</Text>}
            bordered={false}
            style={{ ...cardStyle, height: "100%" }}
            styles={{ body: { padding: "24px 24px 16px" } }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={userGrowthData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorAdminUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAdminLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorAdminUsers)" name="Users" />
                <Area type="monotone" dataKey="logins" stroke="#52c41a" strokeWidth={2} fillOpacity={1} fill="url(#colorAdminLogins)" name="Logins" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Role Distribution</Text>}
            bordered={false}
            style={{ ...cardStyle, height: "100%" }}
            styles={{ body: { padding: "24px 24px 16px" } }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={roleDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "#d1d5db", strokeWidth: 1 }}
                >
                  {roleDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Pipeline Overview</Text>}
            bordered={false}
            style={{ ...cardStyle, height: "100%" }}
            styles={{ body: { padding: "24px 24px 16px" } }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={pipelineData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="stage" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={12}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text strong style={{ fontSize: 16 }}>My Tasks</Text>
                <Badge count={tasksData.filter((t) => !t.completed).length} style={{ backgroundColor: "#4f46e5" }} />
              </div>
            }
            bordered={false}
            style={cardStyle}
            styles={{ body: { padding: "20px 24px" } }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tasksData.map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: "14px 16px",
                    backgroundColor: task.completed ? "#fafafa" : "#fff",
                    border: "1px solid #f0f0f0",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Checkbox checked={task.completed} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: task.completed ? "#6b7280" : "#1f1f1f", textDecoration: task.completed ? "line-through" : "none" }}>
                      {task.task}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {task.dueTime}
                    </Text>
                  </div>
                  <Tag color={task.priority === "high" ? "red" : task.priority === "medium" ? "orange" : "default"} style={{ fontSize: 11, margin: 0 }}>
                    {task.priority.toUpperCase()}
                  </Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Activity Feed</Text>}
            bordered={false}
            style={cardStyle}
            styles={{ body: { padding: "20px 24px" } }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {activityFeedData.map((activity) => (
                <div key={activity.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Avatar size={36} style={{ backgroundColor: activity.type === "success" ? "#52c41a" : "#4f46e5", flexShrink: 0 }}>
                    {activity.user[0]}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: "#1f1f1f" }}>
                      <Text strong style={{ fontSize: 13 }}>{activity.user}</Text>{" "}
                      <Text type="secondary" style={{ fontSize: 13 }}>{activity.action}</Text>{" "}
                      <Text strong style={{ fontSize: 13 }}>{activity.target}</Text>
                      {activity.role && <Tag style={{ marginLeft: 6, fontSize: 11 }}>{activity.role}</Tag>}
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
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text strong style={{ fontSize: 16 }}>Recent Users</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>Last 24 hours</Text>
              </div>
            }
            bordered={false}
            style={cardStyle}
          >
            <Table columns={userColumns} dataSource={recentUsersData} pagination={false} rowKey="id" size="middle" style={{ fontSize: 13 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
