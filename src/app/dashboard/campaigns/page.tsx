"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Button,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Statistic,
  Tag,
  message,
  Skeleton,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  RocketOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CampaignTable from "@/components/command/CampaignTable";

const { Title, Text } = Typography;

interface Campaign {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  client_name: string | null;
  lead_type: string | null;
  cpl: number | null;
  total_allocation: number | null;
  achieved: number | null;
  industry: string | null;
  geography: string | null;
  campaign_metrics?: {
    sponsor_name?: string | null;
    total_leads_allocated?: number | null;
    total_leads_delivered?: number | null;
    total_campaign_spend?: number | null;
    daily_reporting?: unknown;
    channel_split?: unknown;
    deficit_leads?: number | null;
    lead_increment?: number | null;
    lead_replace?: number | null;
  };
}

export default function CampaignsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filtered, setFiltered] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const canCreate =
    hasRole("internal_operator") ||
    hasRole("internal_admin") ||
    hasRole("admin");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/command/campaigns");
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        if (res.status === 403) {
          message.error("You do not have access to the Campaign Command Center.");
          return;
        }
        message.error(d.error ?? "Failed to load campaigns");
        return;
      }
      const data = await res.json() as { campaigns?: Campaign[] };
      setCampaigns(data.campaigns ?? []);
      setFiltered(data.campaigns ?? []);
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    let result = campaigns;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.campaign_id.toLowerCase().includes(q) ||
          (c.client_name ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    setFiltered(result);
  }, [search, statusFilter, campaigns]);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
  };

  const cardStyle = {
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0",
  };

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
            <RocketOutlined style={{ color: "#1890ff", marginRight: 10 }} />
            Campaign Command Center
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Analytics · Compliance · Lead Audit · Alerts
          </Text>
        </div>

        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/campaigns/create")}
            size="middle"
          >
            New Campaign
          </Button>
        )}
      </div>

      {/* Stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          {
            title: "Total Campaigns",
            value: stats.total,
            icon: <RocketOutlined />,
            color: "#1890ff",
            bg: "#e6f4ff",
          },
          {
            title: "Active",
            value: stats.active,
            icon: <CheckCircleOutlined />,
            color: "#52c41a",
            bg: "#f6ffed",
          },
          {
            title: "Completed",
            value: stats.completed,
            icon: <CheckCircleOutlined />,
            color: "#722ed1",
            bg: "#f9f0ff",
          },
          {
            title: "Paused",
            value: stats.paused,
            icon: <ClockCircleOutlined />,
            color: "#faad14",
            bg: "#fffbe6",
          },
        ].map((stat) => (
          <Col xs={12} sm={6} key={stat.title}>
            <Card
              bordered
              style={{ ...cardStyle, cursor: "pointer" }}
              styles={{ body: { padding: "16px 20px" } }}
            >
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
                  }}
                >
                  {stat.icon}
                </div>
                <Statistic
                  title={
                    <Text style={{ fontSize: 12 }}>{stat.title}</Text>
                  }
                  value={stat.value}
                  valueStyle={{ fontSize: 22, fontWeight: 700, color: stat.color }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filter bar */}
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
          placeholder="Search campaigns…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          value={statusFilter || undefined}
          onChange={setStatusFilter}
          placeholder="All statuses"
          style={{ width: 160 }}
          allowClear
        >
          {["active", "paused", "completed", "cancelled", "draft"].map((s) => (
            <Select.Option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Select.Option>
          ))}
        </Select>
        <Space style={{ marginLeft: "auto" }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => void fetchCampaigns()}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Table */}
      {loading ? (
        <Card style={cardStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <Card style={{ ...cardStyle, padding: 0 }} styles={{ body: { padding: 0 } }}>
          <CampaignTable
            campaigns={filtered}
            loading={loading}
            onRefresh={() => void fetchCampaigns()}
          />
        </Card>
      )}

      {/* Access notice for client_viewer */}
      {hasRole("client_viewer") && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 16px",
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertOutlined style={{ color: "#faad14" }} />
          <Text style={{ fontSize: 13 }}>
            You have read-only access to campaign data.
          </Text>
        </div>
      )}
    </div>
  );
}
