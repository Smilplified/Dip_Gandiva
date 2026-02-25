"use client";

import { Card, Row, Col, Statistic, Typography, Progress, Table, Tag } from "antd";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  RiseOutlined,
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
  Cell,
} from "recharts";

const { Text } = Typography;

const salesStats = [
  {
    title: "Total Revenue",
    value: "$124,580",
    change: "+12.5%",
    icon: <DollarOutlined />,
    color: "#1677ff",
  },
  {
    title: "Orders This Month",
    value: "186",
    change: "+24",
    icon: <ShoppingCartOutlined />,
    color: "#52c41a",
  },
  {
    title: "Quota Progress",
    value: "78%",
    change: "of $160k target",
    icon: <TrophyOutlined />,
    color: "#722ed1",
  },
  {
    title: "Win Rate",
    value: "34%",
    change: "+2.1%",
    icon: <RiseOutlined />,
    color: "#fa8c16",
  },
];

const revenueData = [
  { month: "Jan", revenue: 4200, orders: 42 },
  { month: "Feb", revenue: 5800, orders: 58 },
  { month: "Mar", revenue: 5100, orders: 51 },
  { month: "Apr", revenue: 7200, orders: 72 },
  { month: "May", revenue: 8900, orders: 89 },
  { month: "Jun", revenue: 12400, orders: 124 },
];

const topProductsData = [
  { product: "Enterprise Plan", revenue: 45200, fill: "#1677ff" },
  { product: "Professional Plan", revenue: 32100, fill: "#52c41a" },
  { product: "Starter Plan", revenue: 18900, fill: "#722ed1" },
  { product: "Add-ons", revenue: 12400, fill: "#fa8c16" },
  { product: "Consulting", revenue: 15980, fill: "#13c2c2" },
];

const topDealsData = [
  { company: "Acme Corp", value: "$24,500", stage: "Proposal", rep: "Sarah" },
  { company: "TechStart Inc", value: "$18,200", stage: "Negotiation", rep: "Mike" },
  { company: "Global Solutions", value: "$42,000", stage: "Closed Won", rep: "Emma" },
  { company: "Innovate Labs", value: "$15,800", stage: "Qualification", rep: "James" },
  { company: "DataFlow Systems", value: "$31,200", stage: "Proposal", rep: "Lisa" },
];

const stageColors: Record<string, string> = {
  Qualification: "blue",
  Proposal: "cyan",
  Negotiation: "orange",
  "Closed Won": "green",
  "Closed Lost": "red",
};

export default function SalesDashboardPage() {
  const columns = [
    {
      title: "Company",
      dataIndex: "company",
      key: "company",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      render: (text: string) => (
        <Text style={{ color: "#52c41a", fontWeight: 600 }}>{text}</Text>
      ),
    },
    {
      title: "Stage",
      dataIndex: "stage",
      key: "stage",
      render: (stage: string) => (
        <Tag color={stageColors[stage] || "default"}>{stage}</Tag>
      ),
    },
    {
      title: "Rep",
      dataIndex: "rep",
      key: "rep",
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Sales Dashboard</h1>
        <p style={{ margin: "4px 0 0", color: "#8c8c8c", fontSize: 14 }}>
          Track revenue, orders, and pipeline performance at a glance.
        </p>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {salesStats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              <Statistic
                title={
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {stat.title}
                  </Text>
                }
                value={stat.value}
                prefix={
                  <span
                    style={{
                      marginRight: 8,
                      color: stat.color,
                      fontSize: 20,
                    }}
                  >
                    {stat.icon}
                  </span>
                }
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {stat.change}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text strong style={{ fontSize: 16 }}>Revenue Trend</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>Last 6 months</Text>
              </div>
            }
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSalesRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#8c8c8c" fontSize={12} />
                <YAxis stroke="#8c8c8c" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1677ff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSalesRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Quota Progress</Text>}
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ padding: "16px 0" }}>
              <Progress
                type="circle"
                percent={78}
                strokeColor="#1677ff"
                format={(percent) => (
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>{percent}%</span>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>of $160k</div>
                  </div>
                )}
              />
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <Text type="secondary">$124,580 / $160,000</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Revenue by Product</Text>}
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProductsData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" stroke="#8c8c8c" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <YAxis type="category" dataKey="product" stroke="#8c8c8c" fontSize={12} width={110} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
                  {topProductsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: 16 }}>Top Deals</Text>}
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <Table
              className="table-single-line"
              columns={columns}
              dataSource={topDealsData}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              size="middle"
              rowKey="company"
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
