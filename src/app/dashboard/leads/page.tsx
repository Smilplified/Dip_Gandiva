"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";

const { Title, Text, Link } = Typography;

interface LeadRow {
  id: string;
  name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  consent_status: string | null;
  created_at: string;
  campaign_id: string;
  campaigns?: {
    id?: string;
    name?: string;
    campaign_id?: string;
  } | null;
}

export default function DashboardLeadsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const campaignFilter = sp.get("campaign_id");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [search, setSearch] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "100" });
      if (campaignFilter) qs.set("campaign_id", campaignFilter);
      const res = await fetch(`/api/command/leads?${qs.toString()}`);
      const data = (await res.json()) as { leads?: LeadRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch leads");
      setRows(data.leads ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, [campaignFilter]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.company_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.campaigns?.name ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns: ColumnsType<LeadRow> = [
    {
      title: "Lead",
      key: "lead",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name ?? "—"}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{r.company_name ?? "—"}</div>
        </div>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email", render: (v) => v ?? "—" },
    { title: "Phone", dataIndex: "phone", key: "phone", render: (v) => v ?? "—" },
    { title: "City", dataIndex: "city", key: "city", render: (v) => v ?? "—" },
    {
      title: "Campaign",
      key: "campaign",
      render: (_, r) =>
        r.campaigns?.id ? (
          <Link onClick={() => router.push(`/dashboard/campaigns/${r.campaigns?.id}`)}>
            {r.campaigns?.name ?? r.campaigns?.campaign_id ?? "Campaign"}
          </Link>
        ) : (
          <Text type="secondary">{r.campaigns?.name ?? "—"}</Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <Tag>{(v ?? "new").toUpperCase()}</Tag>,
    },
    {
      title: "Consent",
      dataIndex: "consent_status",
      key: "consent_status",
      render: (v: string | null) => <Tag color={v === "verified" ? "green" : "orange"}>{(v ?? "pending").toUpperCase()}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Leads</Title>
        <Text type="secondary">
          {campaignFilter ? `Showing leads for campaign: ${campaignFilter}` : "All campaign leads"}
        </Text>
      </div>

      <Card>
        <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Search by lead/company/email/phone/campaign"
            style={{ maxWidth: 420 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void fetchLeads()}>
            Refresh
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
