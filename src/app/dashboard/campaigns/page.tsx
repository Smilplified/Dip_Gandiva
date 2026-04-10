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
  message,
  Skeleton,
  DatePicker,
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
import CampaignTable, { type CommandCampaignRow } from "@/components/command/CampaignTable";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type StatusFilter = "all" | "active" | "completed";

export default function CampaignsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [campaigns, setCampaigns] = useState<CommandCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [listTruncated, setListTruncated] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const canCreate =
    hasRole("internal_operator") ||
    hasRole("internal_admin") ||
    hasRole("admin");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("enrich", "1");
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const [df, dt] = dateRange ?? [null, null];
      if (df) params.set("date_from", df.format("YYYY-MM-DD"));
      if (dt) params.set("date_to", dt.format("YYYY-MM-DD"));

      const res = await fetch(`/api/command/campaigns?${params.toString()}`);
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        if (res.status === 403) {
          message.error("You do not have access to the Campaign Command Center.");
          return;
        }
        message.error(d.error ?? "Failed to load campaigns");
        return;
      }
      const data = (await res.json()) as {
        campaigns?: CommandCampaignRow[];
        truncated?: boolean;
        total?: number;
      };
      setCampaigns(data.campaigns ?? []);
      setListTruncated(Boolean(data.truncated));
      setTotalCount(data.total ?? data.campaigns?.length ?? 0);
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, dateRange]);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

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
                  title={<Text style={{ fontSize: 12 }}>{stat.title}</Text>}
                  value={stat.value}
                  valueStyle={{ fontSize: 22, fontWeight: 700, color: stat.color }}
                />
              </div>
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
          placeholder="Search by campaign name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
        <Select<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
          ]}
        />
        <RangePicker
          value={dateRange}
          onChange={(v) => setDateRange(v)}
          format="YYYY-MM-DD"
          style={{ minWidth: 260 }}
          allowEmpty={[true, true]}
        />
        <Space style={{ marginLeft: "auto" }} wrap>
          {listTruncated && (
            <Text type="warning" style={{ fontSize: 12 }}>
              Showing first 500 of {totalCount} campaigns; narrow filters to see more.
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: 13 }}>
            {campaigns.length} result{campaigns.length !== 1 ? "s" : ""}
          </Text>
          <Button icon={<ReloadOutlined />} size="small" onClick={() => void fetchCampaigns()}>
            Refresh
          </Button>
        </Space>
      </div>

      {loading ? (
        <Card style={cardStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <Card style={{ ...cardStyle, padding: 0 }} styles={{ body: { padding: 0 } }}>
          <CampaignTable campaigns={campaigns} loading={loading} />
        </Card>
      )}

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
