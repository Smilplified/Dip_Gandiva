"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Button, Input, Select, Space, Typography,
  Row, Col, Card, Statistic, Skeleton, Tag, Table,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, SearchOutlined,
  FundProjectionScreenOutlined, CheckCircleOutlined,
  ClockCircleOutlined, EyeOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

type StatusFilter = "all" | "active" | "paused" | "draft" | "completed";

interface Campaign {
  id: string;
  campaign_id: string | null;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  client_name: string | null;
  total_leads: number;
  qualified_leads: number;
  delivered_leads: number;
  created_at: string;
}

const cardStyle = {
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  border: "1px solid #f0f0f0",
};

const statusColors: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "blue",
};

export default function DCCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchCampaigns = useCallback((skipCache = false) => {
    if (skipCache) setLoading(true);
    fetch("/api/dc/campaigns")
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const filtered = campaigns.filter((c) => {
    const matchSearch =
      !searchInput ||
      c.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      (c.campaign_id ?? "").toLowerCase().includes(searchInput.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
  };

  const statCards = [
    { title: "Total Campaigns", value: stats.total, icon: <FundProjectionScreenOutlined />, color: "#1890ff", bg: "#e6f4ff" },
    { title: "Active", value: stats.active, icon: <CheckCircleOutlined />, color: "#52c41a", bg: "#f6ffed" },
    { title: "Completed", value: stats.completed, icon: <CheckCircleOutlined />, color: "#722ed1", bg: "#f9f0ff" },
    { title: "Paused", value: stats.paused, icon: <ClockCircleOutlined />, color: "#faad14", bg: "#fffbe6" },
  ];

  const columns: ColumnsType<Campaign> = [
    {
      title: "Sr. No.",
      key: "sr",
      width: 72,
      render: (_: unknown, __: Campaign, index: number) => index + 1,
    },
    {
      title: "Campaign ID",
      dataIndex: "campaign_id",
      width: 270,
      minWidth: 130,
      render: (v: string | null) => (
        <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 12 }}>
          {v || "—"}
        </Tag>
      ),
    },
    {
      title: "Campaign Name",
      dataIndex: "name",
      width: 220,
      minWidth: 180,
      ellipsis: true,
      render: (name: string, row: Campaign) => (
        <Link href={`/dc/campaigns/${row.id}`} style={{ fontWeight: 600 }}>
          {name}
        </Link>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (s: string) => (
        <Tag color={statusColors[s] ?? "default"}>{s}</Tag>
      ),
    },
    { title: "Total Leads", dataIndex: "total_leads", width: 110 },
    {
      title: "Qualified",
      dataIndex: "qualified_leads",
      width: 100,
      render: (v: number) => <Text style={{ color: "#52c41a", fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: "Delivered",
      dataIndex: "delivered_leads",
      width: 100,
      render: (v: number) => <Text style={{ color: "#1677ff", fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      width: 110,
      render: (v: string | null) => v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      width: 110,
      render: (v: string | null) => v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, r: Campaign) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/dc/campaigns/${r.id}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <FundProjectionScreenOutlined style={{ color: "#1890ff", marginRight: 10 }} />
            Campaigns
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage and track your DC campaigns
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push("/dc/campaigns/create")}
          size="middle"
        >
          Create Campaign
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((stat) => (
          <Col xs={12} sm={6} key={stat.title}>
            <Card
              bordered
              style={{ ...cardStyle, cursor: "default" }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              {loading ? (
                <Skeleton active title={{ width: "60%" }} paragraph={false} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: stat.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      color: stat.color,
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <Statistic
                    title={<Text style={{ fontSize: 12 }}>{stat.title}</Text>}
                    value={stat.value}
                    valueStyle={{ fontSize: 22, fontWeight: 700, color: stat.color }}
                  />
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <div
        style={{
          background: "#fff",
          padding: "16px 20px",
          borderRadius: 10,
          border: "1px solid #f0f0f0",
          marginBottom: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
          placeholder="Search by name or campaign ID…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Completed" },
          ]}
        />
        <Space style={{ marginLeft: "auto" }} wrap>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => fetchCampaigns(true)}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {loading ? (
        <Card style={cardStyle}>
          <Skeleton active title={{ width: "32%" }} paragraph={{ rows: 4 }} />
        </Card>
      ) : (
        <Card style={{ ...cardStyle, padding: 0 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (t) => `Total ${t} campaigns`,
            }}
            locale={{ emptyText: "No campaigns found. Create your first campaign." }}
          />
        </Card>
      )}
    </div>
  );
}
