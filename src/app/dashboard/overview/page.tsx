"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Col, Progress, Row, Select, Skeleton, Statistic, Typography } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

const { Title, Text } = Typography;

interface OverviewResponse {
  campaigns: Array<{ id: string; name: string; campaign_id: string }>;
  selectedCampaignId: string | null;
  kpis: { totalLeads: number; qualified: number; registrations: number; attendees: number };
  metrics: {
    total_leads_allocated: number;
    total_campaign_spend: number;
    total_leads_delivered: number;
    deficit_leads: number;
    lead_increment: number;
    lead_replace: number;
  };
  funnel: { leads: number; qa: number; qualified: number; registered: number; attended: number };
  bar: { registrations: number; attendees: number };
  channelSplit: Array<{ name: string; value: number }>;
  channelSplitDaily: Array<{
    date: string;
    campaignName: string;
    email: number;
    telemarketing: number;
  }>;
  trendDaily: Array<{
    date: string;
    leads_delivered: number;
    spend: number;
    deficit: number;
  }>;
  performance: {
    deliveryRate: number;
    deficitRate: number;
    registrationRate: number;
    attendanceRate: number;
  };
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined);
  const [data, setData] = useState<OverviewResponse | null>(null);

  const fetchData = async (id?: string) => {
    setLoading(true);
    try {
      const qs = id ? `?campaign_id=${id}` : "";
      const res = await fetch(`/api/command/overview${qs}`);
      const json = (await res.json()) as OverviewResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(campaignId);
  }, [campaignId]);

  const funnelData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Leads", value: data.funnel.leads },
      { name: "QA", value: data.funnel.qa },
      { name: "Qualified", value: data.funnel.qualified },
      { name: "Registered", value: data.funnel.registered },
      { name: "Attended", value: data.funnel.attended },
    ];
  }, [data]);

  if (loading && !data) return <Skeleton active paragraph={{ rows: 12 }} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Overview</Title>
          <Text type="secondary">Client analytics across campaigns</Text>
        </div>
        <Select
          style={{ width: 300 }}
          placeholder="All Campaigns"
          allowClear
          value={campaignId}
          onChange={(v) => setCampaignId(v)}
          options={[
            { label: "All Campaigns", value: undefined },
            ...((data?.campaigns ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.campaign_id})` }))),
          ]}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: "Total Leads", value: data?.kpis.totalLeads ?? 0, color: "#1677ff" },
          { title: "Qualified", value: data?.kpis.qualified ?? 0, color: "#52c41a" },
          { title: "Registrations", value: data?.kpis.registrations ?? 0, color: "#faad14" },
          { title: "Attendees", value: data?.kpis.attendees ?? 0, color: "#722ed1" },
        ].map((k) => (
          <Col xs={12} md={6} key={k.title}>
            <Card bordered style={{ borderRadius: 12 }}>
              <Statistic title={k.title} value={k.value} valueStyle={{ color: k.color, fontWeight: 700 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Daily Trend (Leads Delivered · Spend · Deficit)" style={{ borderRadius: 12 }}>
            {(data?.trendDaily?.length ?? 0) === 0 ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Text type="secondary">No daily history data</Text>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart
                  data={data?.trendDaily ?? []}
                  margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="4 4" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RTooltip
                    formatter={(value: number, name: string) => {
                      if (name === "Spend (₹)") {
                        return [`₹${Number(value).toLocaleString()}`, name];
                      }
                      return [Number(value).toLocaleString(), name];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    name="Spend (₹)"
                    stroke="#b37feb"
                    fill="#f9f0ff"
                    strokeWidth={2}
                  />
                  <Bar
                    dataKey="leads_delivered"
                    name="Leads Delivered"
                    fill="#69b1ff"
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="deficit"
                    name="Deficit"
                    stroke="#ff4d4f"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Channel Split (Daily, by Campaign)" style={{ borderRadius: 12 }}>
            {(data?.channelSplitDaily?.length ?? 0) === 0 ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Text type="secondary">No channel split data</Text>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={(data?.channelSplitDaily ?? []).map((r) => ({
                    ...r,
                    shortDate: (r.date ?? "").slice(5), // MM-DD for clean axis ticks
                  }))}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                >
                  <XAxis dataKey="shortDate" interval="preserveStartEnd" minTickGap={24} />
                  <YAxis />
                  <RTooltip
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { date?: string; campaignName?: string }
                        | undefined;
                      if (!row) return "";
                      return `${row.date ?? ""} · ${row.campaignName ?? ""}`;
                    }}
                  />
                  <Bar dataKey="email" stackId="channels" fill="#1677ff" name="Email" />
                  <Bar dataKey="telemarketing" stackId="channels" fill="#52c41a" name="Telemarketing" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Leads Funnel" style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={260}>
              <FunnelChart>
                <RTooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Performance Summary" style={{ borderRadius: 12 }}>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "Delivery Rate", value: data?.performance.deliveryRate ?? 0, color: "#1677ff" },
                { label: "Registration Rate", value: data?.performance.registrationRate ?? 0, color: "#52c41a" },
                { label: "Attendance Rate", value: data?.performance.attendanceRate ?? 0, color: "#722ed1" },
                { label: "Deficit Rate", value: data?.performance.deficitRate ?? 0, color: "#ff4d4f" },
              ].map((p) => (
                <div key={p.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text>{p.label}</Text>
                    <Text strong>{p.value}%</Text>
                  </div>
                  <Progress percent={p.value} showInfo={false} strokeColor={p.color} />
                </div>
              ))}
              <Row gutter={12} style={{ marginTop: 4 }}>
                <Col span={12}><Statistic title="Lead Increment" value={data?.metrics.lead_increment ?? 0} /></Col>
                <Col span={12}><Statistic title="Lead Replace" value={data?.metrics.lead_replace ?? 0} /></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Statistic title="Allocated" value={data?.metrics.total_leads_allocated ?? 0} /></Col>
                <Col span={12}><Statistic title="Delivered" value={data?.metrics.total_leads_delivered ?? 0} /></Col>
              </Row>
              <Statistic title="Campaign Spend" value={data?.metrics.total_campaign_spend ?? 0} prefix="₹" />
            </div>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Registrations vs Attendees" style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[{ name: "Conversion", registrations: data?.bar.registrations ?? 0, attendees: data?.bar.attendees ?? 0 }]}>
                <XAxis dataKey="name" />
                <YAxis />
                <RTooltip />
                <Bar dataKey="registrations" fill="#1677ff" radius={[6, 6, 0, 0]} />
                <Bar dataKey="attendees" fill="#52c41a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

