"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Spin,
  Typography,
  message,
} from "antd";
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
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("agent")) {
      router.replace("/no-access");
      return;
    }
    const fetchData = async () => {
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
    };
    fetchData();
  }, [isInitialized, hasRole, router]);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.client_name ?? "").toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q) ||
        (c.region ?? "").toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  const columns = [
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
      title: "Client",
      dataIndex: "client_name",
      key: "client_name",
      render: (v: string | null) => v || "—",
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
      title: "My Leads",
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            My Campaigns
          </Typography.Title>
          <Typography.Text type="secondary">
            All campaigns assigned to you.
          </Typography.Text>
        </div>

        <Card
          bodyStyle={{ overflowX: "auto" }}
          extra={
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 240 }}
            />
          }
        >
          <Table
            className="table-single-line"
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1100 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showTotal: (t) => `Total ${t} campaigns`,
            }}
            locale={{
              emptyText: "No campaigns assigned yet. Your Team Leader can assign you to campaigns.",
            }}
          />
        </Card>
      </div>
    </div>
  );
}
