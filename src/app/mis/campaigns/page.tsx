"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { usePaginatedListQuery } from "@/hooks/usePaginatedListQuery";
import { useServerTablePagination } from "@/hooks/useServerTablePagination";
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
  scored_leads_count?: number;
  delivered_leads_count?: number;
};

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "blue",
};

export default function MISCampaignsPage() {
  const router = useRouter();
  const { status } = useRoleGuard(["mis", "admin"]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { page, pageSize, applyPaginationMeta, resetPage, tablePagination } =
    useServerTablePagination();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, statusFilter, resetPage]);

  const listEnabled =
    status === "authorized" &&
    !isOffline &&
    typeof navigator !== "undefined" &&
    navigator.onLine;

  const {
    items: campaigns,
    pagination,
    isLoading,
    error: campaignsError,
    refetch,
  } = usePaginatedListQuery<Campaign>({
    queryKeyPrefix: ["mis", "campaigns", "list"],
    url: "/api/mis/campaigns",
    params: {
      page,
      limit: pageSize,
      q: debouncedSearch || undefined,
      status: statusFilter || undefined,
    },
    listField: "campaigns",
    enabled: listEnabled,
  });

  useEffect(() => {
    if (pagination) applyPaginationMeta(pagination);
  }, [pagination, applyPaginationMeta]);

  useEffect(() => {
    if (campaignsError) {
      message.error("Failed to load campaigns");
    }
  }, [campaignsError]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      void refetch();
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
  }, [refetch]);

  const loading = isLoading && campaigns.length === 0;

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
            {tableSerialNumber(page, pageSize, index)}
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
        dataIndex: "scored_leads_count",
        key: "scored_leads_count",
        width: 80,
        align: "center",
        fixed: "right",
        sorter: (a, b) => (a.scored_leads_count ?? 0) - (b.scored_leads_count ?? 0),
        sortDirections: ["descend", "ascend"] as const,
        render: (v: number | undefined) => (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
            {v ?? 0}
          </Typography.Text>
        ),
      },
      {
        title: "Delivered",
        dataIndex: "delivered_leads_count",
        key: "delivered_leads_count",
        width: 96,
        align: "center",
        fixed: "right",
        sorter: (a, b) => (a.delivered_leads_count ?? 0) - (b.delivered_leads_count ?? 0),
        sortDirections: ["descend", "ascend"] as const,
        render: (v: number | undefined) => (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
            {v ?? 0}
          </Typography.Text>
        ),
      },
    ],
    [page, pageSize]
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
                void refetch();
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
            onClick={() => void refetch()}
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
      ) : campaigns.length === 0 ? (
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
            dataSource={campaigns}
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

