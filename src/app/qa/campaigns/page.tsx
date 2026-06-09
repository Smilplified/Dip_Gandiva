"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  Spin,
  Empty,
  Space,
  message,
} from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useServerTablePagination } from "@/hooks/useServerTablePagination";
import { buildListApiUrl } from "@/lib/build-list-api-url";
import { tableSerialNumber } from "@/lib/table-pagination";
import { tableEllipsisCell } from "@/lib/table-ellipsis-cell";
import { downloadExcel, enrichLeadsForExport } from "@/lib/leadsExport";
import type { Lead } from "@/types/lead.types";

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
  leads?: Lead[];
  last_lead_activity_at?: string | null;
  leads_uploaded?: number;
  leads_audited?: number;
  leads_pending_audit?: number;
};

type Summary = {
  total_leads_uploaded: number;
  total_audited: number;
  pending_audit: number;
  campaign_count: number;
};

function KpiCard({
  title,
  value,
  sub,
  color,
}: {
  title: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card
      style={{
        borderRadius: 12,
        border: "1px solid #f0f0f0",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        height: "100%",
      }}
      bodyStyle={{ padding: "18px 20px" }}
    >
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {title}
      </Typography.Text>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: 4, lineHeight: 1.2 }}>
        {value}
      </div>
      {sub ? (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
          {sub}
        </Typography.Text>
      ) : null}
    </Card>
  );
}

export default function QACampaignsPage() {
  const router = useRouter();
  const { status } = useRoleGuard(["qa", "admin"]);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { page, pageSize, applyPaginationMeta, resetPage, tablePagination } =
    useServerTablePagination();
  const [isOffline, setIsOffline] = useState(false);

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(3, "month"),
    dayjs(),
  ]);

  useEffect(() => {
    resetPage();
  }, [dateRange, resetPage]);

  const clientTimeZone = useMemo(() => {
    if (typeof Intl === "undefined") return "UTC";
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }, []);

  const buildUrl = useCallback(
    (opts?: { includeLeads?: boolean; exportLimit?: number }) => {
      return buildListApiUrl("/api/qa/campaigns", {
        start_date: dateRange[0].format("YYYY-MM-DD"),
        end_date: dateRange[1].format("YYYY-MM-DD"),
        tz: clientTimeZone,
        page: opts?.exportLimit ? 1 : page,
        limit: opts?.exportLimit ?? pageSize,
        include_leads: opts?.includeLeads ? 1 : undefined,
      });
    },
    [dateRange, clientTimeZone, page, pageSize]
  );

  const listUrl = buildUrl();
  const listEnabled =
    status === "authorized" &&
    !isOffline &&
    typeof navigator !== "undefined" &&
    navigator.onLine;

  const campaignsQuery = useQuery({
    queryKey: ["qa", "campaigns", "list", listUrl],
    queryFn: async () => {
      const res = await fetch(listUrl, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      return data as {
        campaigns?: Campaign[];
        summary?: Summary;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    },
    enabled: listEnabled,
    placeholderData: (previous) => previous,
    refetchInterval: 60 * 60 * 1000,
  });

  const campaigns = useMemo(
    () => campaignsQuery.data?.campaigns ?? [],
    [campaignsQuery.data?.campaigns]
  );
  const summary = campaignsQuery.data?.summary ?? null;

  useEffect(() => {
    if (campaignsQuery.data?.pagination) {
      applyPaginationMeta(campaignsQuery.data.pagination);
    }
  }, [campaignsQuery.data?.pagination, applyPaginationMeta]);

  useEffect(() => {
    if (campaignsQuery.error) {
      message.error(
        campaignsQuery.error instanceof Error
          ? campaignsQuery.error.message
          : "Failed to load campaigns"
      );
    }
  }, [campaignsQuery.error]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      void campaignsQuery.refetch();
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
  }, [campaignsQuery]);

  const loading = campaignsQuery.isLoading && campaigns.length === 0;

  const displayedCampaigns = useMemo(() => {
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

  const rangeLabel = `${dateRange[0].format("DD MMM YYYY")} – ${dateRange[1].format("DD MMM YYYY")}`;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(buildUrl({ includeLeads: true, exportLimit: 100 }), {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load export data");

      let exportCampaigns = (data.campaigns ?? []) as Campaign[];
      const q = search.trim().toLowerCase();
      if (q) {
        exportCampaigns = exportCampaigns.filter(
          (c) =>
            (c.name ?? "").toLowerCase().includes(q) ||
            (c.campaign_code ?? "").toLowerCase().includes(q) ||
            (c.lead_type ?? "").toLowerCase().includes(q) ||
            (c.industry ?? "").toLowerCase().includes(q) ||
            (c.geography ?? "").toLowerCase().includes(q)
        );
      }
      if (statusFilter) {
        exportCampaigns = exportCampaigns.filter((c) => c.status === statusFilter);
      }

      const exportLeads = exportCampaigns.flatMap((c) =>
        enrichLeadsForExport((c.leads ?? []) as Lead[], c.name, c.lead_type)
      );
      if (exportLeads.length === 0) {
        message.warning("No leads to export for the selected date range");
        return;
      }
      const expected = exportCampaigns.reduce(
        (sum, c) => sum + (c.leads_uploaded ?? c.leads?.length ?? 0),
        0
      );
      if (exportLeads.length !== expected) {
        message.error("Export count does not match table — refresh and try again");
        return;
      }
      const stamp = `${dateRange[0].format("YYYY-MM-DD")}_${dateRange[1].format("YYYY-MM-DD")}`;
      downloadExcel(exportLeads, `qa-campaigns-export_${stamp}.xlsx`);
      message.success(
        `Exported ${exportLeads.length} leads from ${exportCampaigns.length} campaigns (${rangeLabel})`
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (status === "loading" || status === "redirecting") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const list = displayedCampaigns;
  const s = summary;
  const campaignStatusColors: Record<string, string> = {
    draft: "default",
    active: "green",
    paused: "orange",
    completed: "blue",
  };

  return (
    <div style={{ width: "100%", padding: "0 24px 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Campaigns
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 4 }}>
          Campaigns with lead uploads in the selected date range (by upload date). Click a row to
          open campaign details.
        </Typography.Text>
      </div>

      {isOffline && (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Data will reload when you are back online, or{" "}
            <a
              onClick={(e) => {
                e.preventDefault();
                void campaignsQuery.refetch();
              }}
            >
              retry now
            </a>
            .
          </Typography.Text>
        </div>
      )}

      <Card
        style={{
          marginBottom: 20,
          borderRadius: 12,
          border: "1px solid #f0f0f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <Row gutter={[12, 12]} align="middle" wrap>
          <Col>
            <Typography.Text type="secondary" style={{ marginRight: 8 }}>
              Upload date range:
            </Typography.Text>
          </Col>
          <Col>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates?.[0] && dates?.[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              allowClear={false}
              format="DD MMM YYYY"
              style={{ width: 280 }}
            />
          </Col>
          <Col flex="auto" style={{ minWidth: 200 }}>
            <Input.Search
              placeholder="Search campaigns (name, code, lead type, industry, geography)"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", maxWidth: 360 }}
            />
          </Col>
          <Col>
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
              style={{ width: 160 }}
            />
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void campaignsQuery.refetch()}
                loading={campaignsQuery.isFetching && !loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
                disabled={loading || list.length === 0}
              >
                Export
              </Button>
            </Space>
          </Col>
        </Row>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 10 }}>
          Showing campaigns with at least one lead uploaded between {rangeLabel} (your local
          timezone).
        </Typography.Text>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            title="Campaign Count"
            value={(s?.campaign_count ?? 0).toLocaleString()}
            sub="With uploads in range"
            color="#1677ff"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            title="Total Leads Uploaded"
            value={(s?.total_leads_uploaded ?? 0).toLocaleString()}
            sub={rangeLabel}
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            title="Total Audited"
            value={(s?.total_audited ?? 0).toLocaleString()}
            sub="QA status set"
            color="#722ed1"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            title="Pending Audit"
            value={(s?.pending_audit ?? 0).toLocaleString()}
            sub="Awaiting QA review"
            color="#fa8c16"
          />
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : list.length === 0 ? (
        <Empty
          description="No campaigns with uploads in this date range"
          style={{ marginTop: 48 }}
        />
      ) : (
        <Card
          bodyStyle={{ padding: 0 }}
          style={{
            borderRadius: 8,
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <Table
            className="table-single-line"
            size="middle"
            rowKey="id"
            dataSource={list}
            scroll={{ x: 1480 }}
            tableLayout="fixed"
            pagination={tablePagination}
            onRow={(record) => ({
              onClick: () => router.push(`/qa/campaigns/${record.id}`),
              style: { cursor: "pointer" },
              onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = "#fafafa";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = "";
              },
            })}
            columns={[
              {
                title: "Sr. No.",
                key: "sr",
                width: 72,
                align: "center" as const,
                fixed: "left" as const,
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
                width: 130,
                fixed: "left" as const,
                render: (val: string | null | undefined) => (
                  <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {val || "—"}
                  </Tag>
                ),
              },
              {
                title: "Campaign",
                dataIndex: "name",
                key: "name",
                ellipsis: true,
                render: (v: string | null) => (
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {v || "—"}
                  </Typography.Text>
                ),
              },
              {
                title: "Lead Type",
                dataIndex: "lead_type",
                key: "lead_type",
                width: 120,
                ellipsis: true,
                render: (v: string | null) => tableEllipsisCell(v),
              },
              {
                title: "Industry",
                dataIndex: "industry",
                key: "industry",
                width: 200,
                ellipsis: true,
                render: (v: string | null) => tableEllipsisCell(v),
              },
              {
                title: "Geography",
                dataIndex: "geography",
                key: "geography",
                width: 120,
                ellipsis: true,
                render: (v: string | null) => tableEllipsisCell(v),
              },
              {
                title: "Start Date",
                dataIndex: "start_date",
                key: "start_date",
                width: 120,
                render: (v: string | null) => (
                  <Typography.Text style={{ fontSize: 13 }}>
                    {v ? new Date(v).toLocaleDateString() : "—"}
                  </Typography.Text>
                ),
              },
              {
                title: "End Date",
                dataIndex: "end_date",
                key: "end_date",
                width: 120,
                render: (v: string | null) => (
                  <Typography.Text style={{ fontSize: 13 }}>
                    {v ? new Date(v).toLocaleDateString() : "—"}
                  </Typography.Text>
                ),
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                width: 100,
                align: "center" as const,
                render: (v: string) => (
                  <Tag
                    color={campaignStatusColors[v] ?? "default"}
                    style={{ textTransform: "capitalize", margin: 0 }}
                  >
                    {v}
                  </Tag>
                ),
              },
              {
                title: "Uploaded",
                key: "leads_uploaded",
                width: 88,
                align: "center" as const,
                fixed: "right" as const,
                sorter: (a: Campaign, b: Campaign) =>
                  (a.leads_uploaded ?? 0) - (b.leads_uploaded ?? 0),
                defaultSortOrder: "descend" as const,
                render: (_: unknown, rec: Campaign) => (
                  <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
                    {(rec.leads_uploaded ?? 0).toLocaleString()}
                  </Typography.Text>
                ),
              },
              {
                title: "Audited",
                key: "leads_audited",
                width: 88,
                align: "center" as const,
                fixed: "right" as const,
                sorter: (a: Campaign, b: Campaign) =>
                  (a.leads_audited ?? 0) - (b.leads_audited ?? 0),
                render: (_: unknown, rec: Campaign) => (
                  <Typography.Text style={{ fontSize: 13, fontWeight: 600, color: "#722ed1" }}>
                    {(rec.leads_audited ?? 0).toLocaleString()}
                  </Typography.Text>
                ),
              },
              {
                title: "Pending",
                key: "leads_pending_audit",
                width: 88,
                align: "center" as const,
                fixed: "right" as const,
                sorter: (a: Campaign, b: Campaign) =>
                  (a.leads_pending_audit ?? 0) - (b.leads_pending_audit ?? 0),
                render: (_: unknown, rec: Campaign) => (
                  <Typography.Text style={{ fontSize: 13, fontWeight: 600, color: "#fa8c16" }}>
                    {(rec.leads_pending_audit ?? 0).toLocaleString()}
                  </Typography.Text>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
