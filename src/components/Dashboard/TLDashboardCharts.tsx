"use client";

import { Card, Typography } from "antd";
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

type PieSlice = { name: string; value: number; color: string };

export function TLLeadTrendChart() {
  return (
    <Card
      title={<Text strong style={{ fontSize: 16 }}>Lead Trend</Text>}
      bordered={false}
      style={{ ...cardStyle, height: "100%" }}
      styles={{ body: { padding: "24px 24px 16px" } }}
    >
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
  );
}

export function TLCampaignPerformanceChart() {
  return (
    <Card
      title={<Text strong style={{ fontSize: 16 }}>Campaign Performance</Text>}
      bordered={false}
      style={{ ...cardStyle, height: "100%" }}
      styles={{ body: { padding: "24px 24px 16px" } }}
    >
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
  );
}

export function TLCampaignStatusPieChart({ data }: { data: PieSlice[] }) {
  const pieData = data.length > 0 ? data : [{ name: "No data", value: 1, color: "#d9d9d9" }];
  return (
    <Card
      title={<Text strong style={{ fontSize: 16 }}>Campaign Status</Text>}
      bordered={false}
      style={{ ...cardStyle, height: "100%" }}
      styles={{ body: { padding: "24px 24px 16px" } }}
    >
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: "#d9d9d9", strokeWidth: 1 }}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
