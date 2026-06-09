"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import dayjs from "dayjs";
import {
  LEADS_TABLE_PAGE_SIZE_DEFAULT,
  LEADS_TABLE_PAGE_SIZE_OPTIONS,
} from "@/lib/leads-table-pagination";
import { ArrowLeftOutlined, DownloadOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { downloadExcel } from "@/lib/leadsExport";
import { getLeadTableColumns } from "@/components/Leads/LeadTableColumns";
import type { Lead } from "@/types/lead.types";

type TLLeadRow = Lead & {
  campaign_id?: string;
  campaign_name?: string | null;
  assigned_agent_name?: string | null;
};

const UNASSIGNED_AGENT_ID = "__unassigned__";

function leadMatchesDateRange(
  createdAt: string | null | undefined,
  dateRange: [Dayjs | null, Dayjs | null] | null
): boolean {
  if (!dateRange?.[0] || !dateRange?.[1]) return true;
  const leadDate = dayjs(createdAt).startOf("day");
  if (!leadDate.isValid()) return false;
  const start = dateRange[0].startOf("day");
  const end = dateRange[1].endOf("day");
  return !leadDate.isBefore(start) && !leadDate.isAfter(end);
}

export default function TeamLeaderLeadsPage() {
  const { hasTLAccess, isInitialized } = useAuth();
  const [leads, setLeads] = useState<TLLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPageSize, setLeadsPageSize] = useState(LEADS_TABLE_PAGE_SIZE_DEFAULT);
  const [isOffline, setIsOffline] = useState(false);

  const fetchLeads = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    setLoading(true);
    try {
      const res = await fetch("/api/tl/leads", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads(data.leads ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasTLAccess()) return;
    fetchLeads();
  }, [isInitialized, hasTLAccess, fetchLeads]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchLeads();
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
  }, [fetchLeads]);

  const agentOptions = useMemo(() => {
    const byId = new Map<string, string>();
    let hasUnassigned = false;

    for (const lead of leads) {
      const agentId = lead.assigned_agent_id;
      if (!agentId) {
        hasUnassigned = true;
        continue;
      }
      const name = (lead.assigned_agent_name ?? "").trim();
      byId.set(agentId, name && name !== "—" ? name : agentId);
    }

    const options = [...byId.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (hasUnassigned) {
      options.unshift({ value: UNASSIGNED_AGENT_ID, label: "Unassigned" });
    }

    return options;
  }, [leads]);

  const hasActiveFilters = Boolean(
    leadSearch.trim() ||
      selectedAgentIds.length > 0 ||
      (dateRange?.[0] && dateRange?.[1])
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedAgentIds.length > 0) {
        const agentId = lead.assigned_agent_id;
        const matchesAgent = selectedAgentIds.some((id) =>
          id === UNASSIGNED_AGENT_ID ? !agentId : agentId === id
        );
        if (!matchesAgent) return false;
      }

      const q = leadSearch.trim().toLowerCase();
      const matchesSearch = !q
        ? true
        : (lead.lead_id ?? "").toLowerCase().includes(q) ||
          (lead.name ?? "").toLowerCase().includes(q) ||
          (lead.company_name ?? "").toLowerCase().includes(q) ||
          (lead.email ?? "").toLowerCase().includes(q) ||
          (lead.phone ?? "").toLowerCase().includes(q) ||
          (lead.campaign_name ?? "").toLowerCase().includes(q) ||
          (lead.assigned_agent_name ?? "").toLowerCase().includes(q) ||
          ([lead.first_name, lead.last_name].filter(Boolean).join(" ") ?? "").toLowerCase().includes(q);

      if (!matchesSearch) return false;
      return leadMatchesDateRange(lead.created_at, dateRange);
    });
  }, [leads, leadSearch, dateRange, selectedAgentIds]);

  useEffect(() => {
    setLeadsPage(1);
  }, [leadSearch, dateRange, selectedAgentIds]);

  const clearFilters = () => {
    setLeadSearch("");
    setDateRange(null);
    setSelectedAgentIds([]);
  };

  const baseColumns = getLeadTableColumns({
    showActions: false,
    pagination: { current: leadsPage, pageSize: leadsPageSize },
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
              <Button type="link" onClick={fetchLeads} style={{ padding: 0 }}>
                click here to retry now
              </Button>
              .
            </Typography.Text>
          </div>
        )}

        <Card
          title={`Leads (${filteredLeads.length}${filteredLeads.length !== leads.length ? ` of ${leads.length}` : ""})`}
          extra={
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                if (filteredLeads.length === 0) {
                  message.warning(
                    hasActiveFilters
                      ? "No leads match the current filters to export"
                      : "No leads to export"
                  );
                  return;
                }
                const stamp = new Date().toISOString().slice(0, 10);
                downloadExcel(
                  filteredLeads,
                  `tl-leads-${stamp}${hasActiveFilters ? `-filtered-${filteredLeads.length}` : ""}.xlsx`
                );
                message.success(`Exported ${filteredLeads.length} leads`);
              }}
              disabled={leads.length === 0}
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
              ? `Showing ${filteredLeads.length} of ${leads.length} leads matching your filters.`
              : filteredLeads.length !== leads.length
                ? `Showing ${filteredLeads.length} of ${leads.length} leads from your campaigns.`
                : "Click a campaign name to open that campaign."}
          </Typography.Text>

          <Table
            className="table-single-line"
            columns={columns}
            dataSource={filteredLeads}
            rowKey="id"
            loading={loading}
            scroll={{ x: 3200 }}
            pagination={{
              current: leadsPage,
              pageSize: leadsPageSize,
              showSizeChanger: true,
              pageSizeOptions: [...LEADS_TABLE_PAGE_SIZE_OPTIONS],
              showTotal: (t) => `Total ${t} leads`,
              onChange: (page, size) => {
                setLeadsPage(page);
                setLeadsPageSize(size);
              },
            }}
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
