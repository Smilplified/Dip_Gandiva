"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Tag, Button, Input, Select, Spin, Typography, message } from "antd";
import {
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type AgentCampaignRow = {
  id: string;
  name: string;
  client_name: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  region: string | null;
  created_at: string;
  total_leads: number;
  active_leads: number;
  won_leads: number;
};

const statusColors: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "blue",
};

export default function AgentCampaignsPage() {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();
  const [campaigns, setCampaigns] = useState<AgentCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchData = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/campaigns", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load campaigns");
      setCampaigns(data.campaigns ?? []);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Failed to load assigned campaigns"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("agent")) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [isInitialized, hasRole, router, fetchData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
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
  }, [fetchData]);

  const filtered = useMemo(() => {
    let result = campaigns;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.client_name ?? "").toLowerCase().includes(q) ||
          (c.industry ?? "").toLowerCase().includes(q) ||
          (c.region ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [campaigns, search, statusFilter]);

  const columns = [
    {
      title: "Sr. No",
      key: "index",
      width: 80,
      render: (_: unknown, __: AgentCampaignRow, index: number) =>
        (page - 1) * pageSize + index + 1,
    },
    {
      title: "Campaign",
      dataIndex: "name",
      key: "name",
      render: (val: string, r: AgentCampaignRow) => (
        <Link href={`/agent/campaigns/${r.id}`} style={{ fontWeight: 600 }}>
          {val}
        </Link>
      ),
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      render: (v: string | null) => v || "—",
    },
    {
      title: "Region",
      dataIndex: "region",
      key: "region",
      render: (v: string | null) => v || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (val: string) => (
        <Tag color={statusColors[val] ?? "default"} style={{ textTransform: "capitalize" }}>
          {val}
        </Tag>
      ),
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      width: 110,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      width: 110,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      title: "Leads",
      dataIndex: "total_leads",
      key: "total_leads",
      width: 100,
    },
    {
      title: "Active",
      dataIndex: "active_leads",
      key: "active_leads",
      width: 90,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, r: AgentCampaignRow) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/agent/campaigns/${r.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("agent")) {
    return null;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Campaigns
        </Typography.Title>
        <Typography.Text type="secondary">
          All campaigns assigned to you.
        </Typography.Text>
      </div>

      {isOffline && (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Check your internet connection. Data will
            reload automatically once you are back online, or{" "}
            <Button type="link" onClick={fetchData} style={{ padding: 0 }}>
              click here to retry now
            </Button>
            .
          </Typography.Text>
        </div>
      )}

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 220, maxWidth: 320 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>
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
          style={{ width: 180 }}
        />
      </div>

      <Table
        className="table-single-line"
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          showSizeChanger: true,
          showTotal: (t) => `Total ${t} campaigns`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        locale={{
          emptyText:
            "No campaigns assigned yet. Your Team Leader can assign you to campaigns.",
        }}
      />
    </div>
  );
}
