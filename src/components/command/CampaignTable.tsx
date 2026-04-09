"use client";

import { Table, Tag, Progress, Button, Tooltip, Badge, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EyeOutlined,
  EditOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface CampaignMetrics {
  sponsor_name?: string | null;
  total_leads_allocated?: number | null;
  total_leads_delivered?: number | null;
  total_campaign_spend?: number | null;
  daily_reporting?: unknown;
  channel_split?: unknown;
  deficit_leads?: number | null;
  lead_increment?: number | null;
  lead_replace?: number | null;
}

interface Campaign {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  client_name: string | null;
  lead_type: string | null;
  cpl: number | null;
  total_allocation: number | null;
  achieved: number | null;
  industry: string | null;
  geography: string | null;
  campaign_metrics?: CampaignMetrics | CampaignMetrics[];
}

interface CampaignTableProps {
  campaigns: Campaign[];
  loading?: boolean;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "green",
  paused: "orange",
  completed: "blue",
  cancelled: "red",
  draft: "default",
};

export default function CampaignTable({
  campaigns,
  loading,
}: CampaignTableProps) {
  const router = useRouter();
  const { hasRole } = useAuth();

  const canEdit =
    hasRole("internal_operator") ||
    hasRole("internal_admin") ||
    hasRole("admin");

  const getMetrics = (row: Campaign): CampaignMetrics => {
    const m = row.campaign_metrics;
    if (!m) return {};
    if (Array.isArray(m)) return m[0] ?? {};
    return m;
  };

  const columns: ColumnsType<Campaign> = [
    {
      title: "Sr. No",
      key: "sr_no",
      width: 80,
      render: (_: unknown, __: Campaign, index: number) => index + 1,
    },
    {
      title: "Campaign",
      key: "campaign",
      width: 240,
      render: (_, row) => (
        <div>
          <div
            style={{ fontWeight: 600, fontSize: 14, color: "#1677ff", cursor: "pointer" }}
            onClick={() => router.push(`/dashboard/leads?campaign_id=${row.id}`)}
            title="View leads for this campaign"
          >
            {row.name}
          </div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {row.campaign_id} &nbsp;·&nbsp; {row.client_name ?? "—"}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] ?? "default"}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Industry / Geo",
      key: "meta",
      width: 160,
      render: (_, row) => (
        <div>
          <div style={{ fontSize: 13 }}>{row.industry ?? "—"}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {row.geography ?? "—"}
          </div>
        </div>
      ),
    },
    {
      title: "Allocation",
      key: "allocation",
      width: 180,
      render: (_, row) => {
        const m = getMetrics(row);
        const total = row.total_allocation ?? m.total_leads_allocated ?? 0;
        const achieved = row.achieved ?? m.total_leads_delivered ?? 0;
        const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
        return (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{achieved}</span>
              <span style={{ color: "#8c8c8c" }}> / {total}</span>
            </div>
            <Progress
              percent={pct}
              size="small"
              strokeColor={pct >= 80 ? "#52c41a" : pct >= 50 ? "#faad14" : "#ff4d4f"}
              showInfo={false}
              style={{ marginBottom: 0 }}
            />
          </div>
        );
      },
    },
    {
      title: "CPL",
      dataIndex: "cpl",
      key: "cpl",
      width: 80,
      render: (cpl: number | null) => (
        <span style={{ fontWeight: 500 }}>
          {cpl != null ? `₹${cpl.toLocaleString()}` : "—"}
        </span>
      ),
    },
    {
      title: "Delivered",
      key: "delivered",
      width: 100,
      render: (_, row) => {
        const m = getMetrics(row);
        const delivered = m.total_leads_delivered ?? 0;
        const deficit = m.deficit_leads ?? 0;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{delivered}</div>
            {deficit > 0 && (
              <Badge
                count={`-${deficit}`}
                style={{ backgroundColor: "#ff4d4f", fontSize: 10 }}
              />
            )}
          </div>
        );
      },
    },
    {
      title: "Spend",
      key: "spend",
      width: 110,
      render: (_, row) => {
        const m = getMetrics(row);
        const spend = m.total_campaign_spend ?? 0;
        return (
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {spend > 0 ? `₹${spend.toLocaleString()}` : "—"}
          </span>
        );
      },
    },
    {
      title: "Dates",
      key: "dates",
      width: 140,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          <div>{row.start_date ?? "—"}</div>
          <div style={{ color: "#8c8c8c" }}>→ {row.end_date ?? "—"}</div>
        </div>
      ),
    },
    {
      title: "Ops Metrics",
      key: "ops_metrics",
      width: 200,
      render: (_, row) => {
        const m = getMetrics(row);
        const inc = m.lead_increment ?? 0;
        const rep = m.lead_replace ?? 0;
        const hasDaily = m.daily_reporting != null;
        const hasChannel = m.channel_split != null;
        return (
          <div style={{ fontSize: 12, lineHeight: 1.4 }}>
            <div>Inc: <strong>{inc}</strong> · Replace: <strong>{rep}</strong></div>
            <div style={{ color: "#8c8c8c" }}>
              Daily: {hasDaily ? "Yes" : "No"} · Channel: {hasChannel ? "Yes" : "No"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Trend",
      key: "trend",
      width: 60,
      render: (_, row) => {
        const pct =
          (row.total_allocation ?? 0) > 0
            ? ((row.achieved ?? 0) / (row.total_allocation ?? 1)) * 100
            : 0;
        return pct >= 50 ? (
          <Tooltip title="On track">
            <RiseOutlined style={{ color: "#52c41a", fontSize: 18 }} />
          </Tooltip>
        ) : (
          <Tooltip title="Behind target">
            <FallOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />
          </Tooltip>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_, row) => (
        <Space>
          <Tooltip title="View details">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/dashboard/campaigns/${row.id}`)}
            />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Edit campaign">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() =>
                  router.push(`/dashboard/campaigns/${row.id}?edit=true`)
                }
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={campaigns}
      rowKey="id"
      loading={loading}
      size="middle"
      scroll={{ x: 1200 }}
      pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} campaigns` }}
      style={{ background: "#fff", borderRadius: 8 }}
      rowClassName={(row) =>
        row.status === "active" ? "" : "opacity-70"
      }
    />
  );
}
