"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Tooltip,
  message,
  Spin,
  Typography,
  Input,
  Select,
  Empty,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import {
  CheckCircleOutlined,
  FundProjectionScreenOutlined,
  TeamOutlined,
  SendOutlined,
  EyeOutlined,
  UserAddOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { usePaginatedListQuery } from "@/hooks/usePaginatedListQuery";
import { useServerTablePagination } from "@/hooks/useServerTablePagination";
import { tableEllipsisCell } from "@/lib/table-ellipsis-cell";
import { tableSerialNumber } from "@/lib/table-pagination";

type CampaignRow = {
  id: string;
  campaign_code: string | null;
  name: string;
  client_name: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  total_leads: number;
  total_agents: number;
  qualified_leads: number;
  delivered_leads: number;
  assigned_team_leader_name: string | null;
};

const statCardStyle = {
  borderRadius: 16,
  border: "1px solid #f0f0f0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  height: "100%",
} as const;

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "blue",
};

export default function TLCampaignsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasTLAccess, hasRole, isInitialized } = useAuth();
  const isOperationsManager = hasRole("operations_manager");
  const [isOffline, setIsOffline] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { page, pageSize, applyPaginationMeta, resetPage, tablePagination } =
    useServerTablePagination();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, statusFilter, resetPage]);

  const listEnabled =
    isInitialized &&
    hasTLAccess() &&
    !isOffline &&
    typeof navigator !== "undefined" &&
    navigator.onLine;

  const statsQuery = useQuery({
    queryKey: ["tl", "campaigns", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/tl/campaigns/stats", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load stats");
      return data as {
        totalCampaigns: number;
        totalLeads: number;
        qualifiedLeads: number;
        deliveredLeads: number;
      };
    },
    enabled: listEnabled,
  });

  const {
    items: campaigns,
    pagination,
    isLoading: campaignsLoading,
    isFetching: campaignsFetching,
    error: campaignsError,
    refetch: refetchCampaigns,
  } = usePaginatedListQuery<CampaignRow>({
    queryKeyPrefix: ["tl", "campaigns", "list"],
    url: "/api/tl/campaigns",
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
      message.error(
        campaignsError instanceof Error ? campaignsError.message : "Failed to load campaigns"
      );
    }
  }, [campaignsError]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasTLAccess()) {
      router.replace("/login");
    }
  }, [isInitialized, hasTLAccess, router]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      void statsQuery.refetch();
      void refetchCampaigns();
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
  }, [statsQuery, refetchCampaigns]);

  const loading = (campaignsLoading || statsQuery.isLoading) && campaigns.length === 0;
  const summaryStats = {
    totalCampaigns: statsQuery.data?.totalCampaigns ?? 0,
    totalLeads: statsQuery.data?.totalLeads ?? 0,
    qualifiedLeads: statsQuery.data?.qualifiedLeads ?? 0,
    deliveredLeads: statsQuery.data?.deliveredLeads ?? 0,
  };

  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["tl", "campaigns"] });
  }, [queryClient]);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      try {
        const res = await fetch(`/api/tl/campaigns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed");
        message.success("Campaign updated");
        refreshLists();
      } catch {
        message.error("Failed to update campaign");
      }
    },
    [refreshLists]
  );

  const columns: ColumnsType<CampaignRow> = useMemo(
    () => [
      {
        title: "Sr. No.",
        key: "sr",
        width: 72,
        fixed: "left",
        align: "center",
        render: (_: unknown, __: CampaignRow, index: number) =>
          tableSerialNumber(page, pageSize, index),
      },
      {
        title: "Campaign Code",
        dataIndex: "campaign_code",
        key: "campaign_code",
        width: 120,
        fixed: "left",
        ellipsis: true,
        render: (val: string | null) => (
          <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 12, margin: 0 }}>
            {val || "—"}
          </Tag>
        ),
      },
      {
        title: "Campaign Name",
        dataIndex: "name",
        key: "name",
        width: 180,
        ellipsis: { showTitle: false },
        className: "table-col-campaign-name",
        render: (val: string, r: CampaignRow) => (
          <Tooltip title={val}>
            <Link href={`/tl/campaigns/${r.id}`} style={{ fontWeight: 600 }} className="table-text-ellipsis">
              {val}
            </Link>
          </Tooltip>
        ),
      },
      ...(isOperationsManager
        ? []
        : [
            {
              title: "Industry",
              dataIndex: "industry",
              key: "industry",
              width: 120,
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
          ]),
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
        render: (val: string) => (
          <Tag color={CAMPAIGN_STATUS_COLORS[val] ?? "default"} style={{ textTransform: "capitalize", margin: 0 }}>
            {val}
          </Tag>
        ),
      },
      {
        title: "Total Leads",
        dataIndex: "total_leads",
        key: "total_leads",
        width: 88,
        align: "center",
        sorter: (a, b) => a.total_leads - b.total_leads,
        render: (v: number) => (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
            {v ?? 0}
          </Typography.Text>
        ),
      },
      {
        title: "Agents",
        dataIndex: "total_agents",
        key: "total_agents",
        width: 72,
        align: "center",
        sorter: (a, b) => a.total_agents - b.total_agents,
        render: (v: number) => v ?? 0,
      },
      {
        title: "Team Leader",
        dataIndex: "assigned_team_leader_name",
        key: "assigned_team_leader_name",
        width: 140,
        responsive: ["lg"],
        ellipsis: true,
        render: (v: string | null) =>
          v ? (
            <Tag color="purple" style={{ margin: 0, maxWidth: "100%" }}>
              {v}
            </Tag>
          ) : isOperationsManager ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Unassigned
            </Typography.Text>
          ) : (
            "—"
          ),
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
        title: "Qualified",
        dataIndex: "qualified_leads",
        key: "qualified_leads",
        width: 88,
        align: "center",
        fixed: "right",
        sorter: (a, b) => (a.qualified_leads ?? 0) - (b.qualified_leads ?? 0),
        render: (v: number) => (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600, color: v > 0 ? "#389e0d" : undefined }}>
            {v ?? 0}
          </Typography.Text>
        ),
      },
      {
        title: "Delivered",
        dataIndex: "delivered_leads",
        key: "delivered_leads",
        width: 96,
        align: "center",
        fixed: "right",
        sorter: (a, b) => (a.delivered_leads ?? 0) - (b.delivered_leads ?? 0),
        render: (v: number) => (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600, color: v > 0 ? "#1677ff" : undefined }}>
            {v ?? 0}
          </Typography.Text>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 160,
        fixed: "right",
        render: (_: unknown, r: CampaignRow) => (
          <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => router.push(`/tl/campaigns/${r.id}`)}
              />
            </Tooltip>
            {isOperationsManager ? (
              <Tooltip title="Assign Team Leader">
                <Button
                  type="text"
                  size="small"
                  icon={<UserAddOutlined />}
                  onClick={() => router.push(`/tl/campaigns/${r.id}?assignTl=1`)}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Assign Agents">
                <Button
                  type="text"
                  size="small"
                  icon={<UserAddOutlined />}
                  onClick={() => router.push(`/tl/campaigns/${r.id}?assign=1`)}
                />
              </Tooltip>
            )}
            {r.status === "draft" || r.status === "paused" ? (
              <Tooltip title="Activate">
                <Button
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleStatusChange(r.id, "active")}
                />
              </Tooltip>
            ) : r.status === "active" ? (
              <Tooltip title="Pause">
                <Button
                  type="text"
                  size="small"
                  icon={<PauseCircleOutlined />}
                  onClick={() => handleStatusChange(r.id, "paused")}
                />
              </Tooltip>
            ) : null}
          </div>
        ),
      },
    ],
    [page, pageSize, handleStatusChange, isOperationsManager, router]
  );

  const campaignSummary = summaryStats;

  const summaryCards = useMemo(
    () => [
      {
        title: "Total Campaigns",
        value: campaignSummary.totalCampaigns,
        icon: <FundProjectionScreenOutlined />,
        color: "#1890ff",
        bgColor: "#e6f4ff",
      },
      {
        title: "Total Leads",
        value: campaignSummary.totalLeads,
        icon: <TeamOutlined />,
        color: "#722ed1",
        bgColor: "#f9f0ff",
      },
      {
        title: "Total Qualified",
        value: campaignSummary.qualifiedLeads,
        icon: <CheckCircleOutlined />,
        color: "#52c41a",
        bgColor: "#f6ffed",
      },
      {
        title: "Total Delivered",
        value: campaignSummary.deliveredLeads,
        icon: <SendOutlined />,
        color: "#1677ff",
        bgColor: "#e6f4ff",
      },
    ],
    [campaignSummary]
  );

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "completed", label: "Completed" },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasTLAccess()) {
    return null;
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
        <Typography.Title level={4} style={{ margin: 0 }}>
          Campaigns
        </Typography.Title>
        <Typography.Text type="secondary">
          {isOperationsManager
            ? "Manage campaigns and assign Team Leaders"
            : "Manage your assigned campaigns and assign agents"}
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
                refreshLists();
              }}
            >
              click here to retry now
            </a>
            .
          </Typography.Text>
        </div>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {summaryCards.map((card) => (
          <Col xs={24} sm={12} xl={6} key={card.title}>
            <Card bordered={false} style={statCardStyle} styles={{ body: { padding: "20px 24px" } }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                    {card.title}
                  </Typography.Text>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#1f1f1f", lineHeight: 1.2 }}>
                    {loading ? "—" : card.value.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: card.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: card.color,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="All Campaigns"
        bodyStyle={{ padding: 0, overflow: "hidden" }}
        style={{ overflow: "hidden" }}
      >
        <div style={{ padding: "12px 16px 0" }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={14} lg={12}>
              <Input
                placeholder="Search campaigns..."
                prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={5}>
              <Select
                placeholder="Filter by status"
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                style={{ width: "100%" }}
              />
            </Col>
          </Row>
        </div>

        <Table
          className="table-single-line tl-campaigns-table"
          columns={columns}
          dataSource={campaigns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1480 }}
          tableLayout="fixed"
          sticky
          loading={loading}
          pagination={tablePagination}
          locale={{
            emptyText: (
              <Empty
                description="No campaigns yet. Create your first campaign."
                style={{ margin: "20px 0" }}
              />
            ),
          }}
          style={{ marginTop: 12 }}
        />
      </Card>
    </div>
  );
}
