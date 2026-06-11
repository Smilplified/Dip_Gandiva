"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  Table,
  Button,
  Spin,
  Typography,
  message,
  Row,
  Col,
  DatePicker,
  Input,
  Select,
} from "antd";
import type { Dayjs } from "dayjs";
import { ArrowLeftOutlined, DownloadOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { usePaginatedListQuery } from "@/hooks/usePaginatedListQuery";
import {
  serverTableInitialLoading,
  useServerTablePagination,
  useSyncListPaginationTotal,
} from "@/hooks/useServerTablePagination";
import { buildListApiUrl } from "@/lib/build-list-api-url";
import { downloadExcel } from "@/lib/leadsExport";
import { getLeadTableColumns } from "@/components/Leads/LeadTableColumns";
import type { Lead } from "@/types/lead.types";

type TLLeadRow = Lead & {
  campaign_id?: string;
  campaign_name?: string | null;
  assigned_agent_name?: string | null;
};

const UNASSIGNED_AGENT_ID = "__unassigned__";

type AgentOption = { id: string; name: string };

export default function TeamLeaderLeadsPage() {
  const { hasTLAccess, isInitialized } = useAuth();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { page, pageSize, total, applyPaginationMeta, resetPage, tablePagination } =
    useServerTablePagination();
  const [isOffline, setIsOffline] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(leadSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [leadSearch]);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, dateRange, selectedAgentIds, resetPage]);

  const listEnabled =
    isInitialized && hasTLAccess() && !isOffline && typeof navigator !== "undefined" && navigator.onLine;

  const {
    items: leads,
    pagination,
    response,
    isLoading,
    error,
    refetch,
  } = usePaginatedListQuery<TLLeadRow>({
    queryKeyPrefix: ["tl", "leads"],
    url: "/api/tl/leads",
    params: {
      page,
      limit: pageSize,
      q: debouncedSearch || undefined,
      agent_ids: selectedAgentIds.length > 0 ? selectedAgentIds.join(",") : undefined,
      date_from: dateRange?.[0]?.format("YYYY-MM-DD"),
      date_to: dateRange?.[1]?.format("YYYY-MM-DD"),
    },
    listField: "leads",
    enabled: listEnabled,
  });

  useSyncListPaginationTotal(pagination, applyPaginationMeta);

  useEffect(() => {
    if (error) {
      message.error(error instanceof Error ? error.message : "Failed to load leads");
    }
  }, [error]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      void refetch();
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
  }, [refetch]);

  const agentOptionsFromApi = useMemo(
    () => (response?.agents as AgentOption[] | undefined) ?? [],
    [response?.agents]
  );

  const agentOptions = useMemo(() => {
    const options = agentOptionsFromApi.map((a) => ({ value: a.id, label: a.name }));
    return [{ value: UNASSIGNED_AGENT_ID, label: "Unassigned" }, ...options];
  }, [agentOptionsFromApi]);

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      selectedAgentIds.length > 0 ||
      (dateRange?.[0] && dateRange?.[1])
  );

  const clearFilters = () => {
    setLeadSearch("");
    setDateRange(null);
    setSelectedAgentIds([]);
  };

  const handleExport = async () => {
    if (total === 0) {
      message.warning(
        hasActiveFilters ? "No leads match the current filters to export" : "No leads to export"
      );
      return;
    }
    setExporting(true);
    try {
      const url = buildListApiUrl("/api/tl/leads", {
        export: "all",
        q: debouncedSearch || undefined,
        agent_ids: selectedAgentIds.length > 0 ? selectedAgentIds.join(",") : undefined,
        date_from: dateRange?.[0]?.format("YYYY-MM-DD"),
        date_to: dateRange?.[1]?.format("YYYY-MM-DD"),
      });
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads for export");
      const exportLeads = (data.leads ?? []) as TLLeadRow[];
      if (exportLeads.length === 0) {
        message.warning("No leads to export");
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadExcel(
        exportLeads,
        `tl-leads-${stamp}${hasActiveFilters ? "-filtered" : ""}.xlsx`
      );
      message.success(`Exported ${exportLeads.length} leads`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to export leads");
    } finally {
      setExporting(false);
    }
  };

  const showInitialLoading = serverTableInitialLoading(isLoading, leads.length);

  const baseColumns = getLeadTableColumns({
    showActions: false,
    pagination: { current: page, pageSize },
    showDeliveryStatus: true,
  });
  const campaignColumn = {
    title: "Campaign",
    key: "campaign_name",
    width: 180,
    fixed: "left" as const,
    ellipsis: true,
    render: (_: unknown, row: TLLeadRow) =>
      row.campaign_id ? (
        <Link
          href={`/tl/campaigns/${row.campaign_id}`}
          style={{ fontWeight: 500 }}
          onClick={(e) => e.stopPropagation()}
        >
          {row.campaign_name ?? "—"}
        </Link>
      ) : (
        (row.campaign_name as string) ?? "—"
      ),
  };

  const assignedAgentColumn = {
    title: "Assigned Agent",
    key: "assigned_agent_name",
    width: 170,
    ellipsis: true,
    render: (_: unknown, row: TLLeadRow) => row.assigned_agent_name ?? "—",
  };

  const columns = [
    baseColumns[0],
    baseColumns[1],
    campaignColumn,
    assignedAgentColumn,
    ...baseColumns.slice(2),
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/tl/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: "#1677ff",
              textDecoration: "none",
              marginBottom: 16,
            }}
          >
            <ArrowLeftOutlined /> Back to Dashboard
          </Link>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>
            Leads
          </Typography.Title>
          <Typography.Text type="secondary">
            All leads from your campaigns, including assigned agents and campaign context.
          </Typography.Text>
        </div>

        {isOffline && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text type="danger" style={{ fontSize: 14 }}>
              You appear to be offline. Data will reload automatically once you are back online, or{" "}
              <Button type="link" onClick={() => void refetch()} style={{ padding: 0 }}>
                click here to retry now
              </Button>
              .
            </Typography.Text>
          </div>
        )}

        <Card
          title={`Leads (${total.toLocaleString()})`}
          extra={
            <Button
              icon={<DownloadOutlined />}
              onClick={() => void handleExport()}
              loading={exporting}
              disabled={total === 0 || exporting}
            >
              Export
            </Button>
          }
          style={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
          bodyStyle={{ padding: "24px 28px" }}
        >
          <Row
            gutter={[12, 12]}
            wrap
            align="middle"
            style={{ marginBottom: 16, marginInline: 0 }}
          >
            <Col xs={24} sm={12} md={8} lg={6}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                Agents
              </Typography.Text>
              <Select
                mode="multiple"
                placeholder="All agents"
                allowClear
                maxTagCount="responsive"
                showSearch
                optionFilterProp="label"
                options={agentOptions}
                value={selectedAgentIds}
                onChange={setSelectedAgentIds}
                style={{ width: "100%" }}
                disabled={agentOptions.length === 0}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                Date range (created)
              </Typography.Text>
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                allowClear
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                Search
              </Typography.Text>
              <Input.Search
                placeholder="Lead ID, name, company, email, phone, campaign..."
                allowClear
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={24} md={24} lg={4}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                &nbsp;
              </Typography.Text>
              <Button
                size="middle"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                block
              >
                Clear filters
              </Button>
            </Col>
          </Row>

          <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
            {hasActiveFilters
              ? `${total.toLocaleString()} leads match your filters. Showing page ${page} (${leads.length} rows).`
              : `${total.toLocaleString()} leads across your campaigns. Showing page ${page} (${leads.length} rows).`}
          </Typography.Text>

          <Table
            className="table-single-line"
            columns={columns}
            dataSource={leads}
            rowKey="id"
            loading={showInitialLoading}
            scroll={{ x: 3200 }}
            pagination={tablePagination}
            locale={{
              emptyText: hasActiveFilters
                ? "No leads match the current filters."
                : "No leads found for your assigned campaigns.",
            }}
            size="middle"
          />
        </Card>
      </div>
    </div>
  );
}
