"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  Spin,
  Empty,
  message,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { tableSerialNumber } from "@/lib/table-pagination";
import { tableEllipsisCell } from "@/lib/table-ellipsis-cell";

type Campaign = {
  id: string;
  campaign_id?: string | null;
  campaign_code?: string | null;
  name: string;
  client_name?: string | null;
  description: string | null;
  industry: string | null;
  geography: string | null;
  target_designation?: string | null;
  lead_type?: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  cpl?: number | null;
  revenue?: number | null;
  booked?: number | null;
  total_allocation?: number | null;
  post_qa?: number | null;
  achieved?: number | null;
  pending_allocation?: number | null;
  region?: string | null;
  weekly_call?: string | null;
  weekly_report?: string | null;
  additional_comments?: string | null;
  assigned_team_leader_id?: string | null;
  assigned_team_leader_name?: string | null;
  employee_size?: string[] | null;
  abm?: boolean | null;
  seniority?: string | null;
  job_function?: string | null;
  creatives_url?: string[] | null;
  leads?: unknown[];
};

function getLeadsCount(leads: unknown[] | undefined): number {
  return Array.isArray(leads) ? leads.length : 0;
}

function getDeliveredCount(leads: unknown[] | undefined): number {
  if (!Array.isArray(leads)) return 0;
  return leads.reduce<number>((count, lead) => {
    const status = (lead as { delivery_status?: unknown })?.delivery_status;
    return status === "delivered" ? count + 1 : count;
  }, 0);
}

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "blue",
};

export default function MISCampaignsPage() {
  const router = useRouter();
  const { status } = useRoleGuard(["mis", "admin"]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [campaignsPageSize, setCampaignsPageSize] = useState(15);
  const [isOffline, setIsOffline] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    setLoading(true);
    try {
      const res = await fetch("/api/mis/campaigns", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCampaigns(data.campaigns ?? []);
    } catch {
      message.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authorized") return;
    fetchDashboard();
  }, [fetchDashboard, status]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchDashboard();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

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
  }, [fetchDashboard]);

  useEffect(() => {
    setCampaignsPage(1);
  }, [search, statusFilter]);

  const list = useMemo(() => {
    let result = campaigns;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.campaign_code ?? "").toLowerCase().includes(q) ||
          (c.lead_type ?? "").toLowerCase().includes(q) ||
          (c.industry ?? "").toLowerCase().includes(q) ||
          (c.geography ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [campaigns, search, statusFilter]);

  const columns: ColumnsType<Campaign> = useMemo(
    () => [
      {
        title: "Sr. No.",
        key: "sr",
        width: 72,
        fixed: "left",
        align: "center",
        render: (_: unknown, __: Campaign, index: number) => (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {tableSerialNumber(campaignsPage, campaignsPageSize, index)}
          </Typography.Text>
        ),
      },
      {
        title: "Campaign Code",
        dataIndex: "campaign_code",
        key: "campaign_code",
        width: 120,
        fixed: "left",
        ellipsis: true,
        render: (val: string | null | undefined) => (
          <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 12, margin: 0 }}>
            {val || "—"}
          </Tag>
        ),
      },
      {
        title: "Campaign",
        dataIndex: "name",
        key: "name",
        width: 200,
        ellipsis: { showTitle: false },
        className: "table-col-campaign-name",
        render: (v: string | null) => tableEllipsisCell(v),
      },
      {
        title: "Lead Type",
        dataIndex: "lead_type",
        key: "lead_type",
        width: 110,
        ellipsis: true,
        render: (v: string | null) => tableEllipsisCell(v),
      },
      {
        title: "Industry",
        dataIndex: "industry",
        key: "industry",
        width: 160,
        ellipsis: { showTitle: false },
        className: "table-col-campaign-name",
        render: (v: string | null) => tableEllipsisCell(v),
      },
      {
        title: "Geography",
        dataIndex: "geography",
        key: "geography",
        width: 110,
        ellipsis: true,
        render: (v: string | null) => tableEllipsisCell(v),
      },
      {
        title: "Start Date",
        dataIndex: "start_date",
        key: "start_date",
        width: 108,
        responsive: ["md"],
        render: (v: string | null) => (
          <Typography.Text style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            {v ? new Date(v).toLocaleDateString() : "—"}
          </Typography.Text>
        ),
      },
      {
        title: "End Date",
        dataIndex: "end_date",
        key: "end_date",
        width: 108,
        responsive: ["md"],
        render: (v: string | null) => (
          <Typography.Text style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            {v ? new Date(v).toLocaleDateString() : "—"}
          </Typography.Text>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 96,
        align: "center",
        filters: [
          { text: "Draft", value: "draft" },
          { text: "Active", value: "active" },
          { text: "Paused", value: "paused" },
          { text: "Completed", value: "completed" },
        ],
        onFilter: (value, record) => record.status === value,
        render: (v: string) => (
          <Tag
            color={CAMPAIGN_STATUS_COLORS[v] ?? "default"}
            style={{ textTransform: "capitalize", margin: 0 }}
          >
            {v}
          </Tag>
        ),
      },
      {
        title: "Leads",
        key: "leads_count",
        width: 80,
        align: "center",
        fixed: "right",
        sorter: (a, b) => getLeadsCount(a.leads) - getLeadsCount(b.leads),
        sortDirections: ["descend", "ascend"] as const,
        render: (_: unknown, rec: Campaign) => (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
            {getLeadsCount(rec.leads)}
          </Typography.Text>
        ),
      },
      {
        title: "Delivered",
        key: "delivered_count",
        width: 96,
        align: "center",
        fixed: "right",
        sorter: (a, b) => getDeliveredCount(a.leads) - getDeliveredCount(b.leads),
        sortDirections: ["descend", "ascend"] as const,
        render: (_: unknown, rec: Campaign) => (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
            {getDeliveredCount(rec.leads)}
          </Typography.Text>
        ),
      },
    ],
    [campaignsPage, campaignsPageSize]
  );

  const tablePagination: TableProps<Campaign>["pagination"] = useMemo(
    () => ({
      current: campaignsPage,
      pageSize: campaignsPageSize,
      showSizeChanger: true,
      pageSizeOptions: ["10", "15", "25", "50"],
      showTotal: (t: number) => `${t} campaigns`,
      responsive: true,
      onChange: (page: number, size: number) => {
        setCampaignsPage(page);
        setCampaignsPageSize(size);
      },
    }),
    [campaignsPage, campaignsPageSize]
  );

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "0 clamp(12px, 2vw, 24px) 32px",
        overflowX: "hidden",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Campaigns
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 4 }}>
          Click a campaign to view details and leads.
        </Typography.Text>
      </div>

      {isOffline && (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Check your internet connection. Data will reload
            automatically once you are back online, or{" "}
            <a
              onClick={(e) => {
                e.preventDefault();
                fetchDashboard();
              }}
            >
              click here to retry now
            </a>
            .
          </Typography.Text>
        </div>
      )}

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={14} lg={12}>
          <Input.Search
            placeholder="Search campaigns (name, code, lead type, industry, geography)"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={5}>
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
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={4} lg={3}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDashboard}
            loading={loading}
            style={{ width: "100%" }}
          >
            Refresh
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : list.length === 0 ? (
        <Empty description="No campaigns" style={{ marginTop: 48 }} />
      ) : (
        <Card
          bodyStyle={{ padding: 0, overflow: "hidden" }}
          style={{
            borderRadius: 8,
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          <Table
            className="table-single-line mis-campaigns-table"
            size="middle"
            rowKey="id"
            dataSource={list}
            columns={columns}
            scroll={{ x: 1280 }}
            tableLayout="fixed"
            sticky
            pagination={tablePagination}
            onRow={(record) => ({
              onClick: () => router.push(`/mis/campaigns/${record.id}`),
              style: { cursor: "pointer" },
              onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = "#fafafa";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = "";
              },
            })}
          />
        </Card>
      )}
    </div>
  );
}

