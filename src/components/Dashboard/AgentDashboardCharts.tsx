"use client";

import { Card, Row, Col, Typography } from "antd";
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

const { Text } = Typography;

const cardStyle = {
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  border: "1px solid #f0f0f0",
  transition: "all 0.3s ease",
  cursor: "pointer" as const,
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

type CampaignChartRow = { name: string; leads: number; qualified: number };
type PieSlice = { name: string; value: number; color: string };

export function AgentLeadTrendChart() {
  return (
    <Card
      title={<Text strong style={{ fontSize: 16 }}>My Lead Trend</Text>}
      bordered={false}
      style={{ ...cardStyle, height: "100%" }}
      styles={{ body: { padding: "24px 24px 16px" } }}
    >
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
  );
}

export function AgentCampaignLeadsChart({ data }: { data: CampaignChartRow[] }) {
  const chartData = data.length > 0 ? data : [{ name: "—", leads: 0, qualified: 0 }];
  return (
    <Card
      title={<Text strong style={{ fontSize: 16 }}>Campaign Leads</Text>}
      bordered={false}
      style={{ ...cardStyle, height: "100%" }}
      styles={{ body: { padding: "24px 24px 16px" } }}
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
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
  );
}

export function AgentCampaignPieChart({ data }: { data: PieSlice[] }) {
  const pieData = data.length > 0 ? data : [{ name: "No data", value: 1, color: "#d9d9d9" }];
  return (
    <Card
      title={<Text strong style={{ fontSize: 16 }}>Leads by Campaign</Text>}
      bordered={false}
      style={{ ...cardStyle, height: "100%" }}
      styles={{ body: { padding: "24px 24px 16px", overflow: "visible" } }}
    >
      <div className="chart-pie-wrapper" style={{ overflow: "visible", minHeight: 320 }}>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={pieData}
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
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
