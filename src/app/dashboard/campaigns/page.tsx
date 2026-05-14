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
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthReady } from "@/hooks/useAuthReady";
import { fetchWithAuthRetry } from "@/lib/api/fetch-with-auth-retry";
import { cache, GANDIV_CACHE_PREFIX } from "@/lib/cache";
import CampaignTable, { type CommandCampaignRow } from "@/components/command/CampaignTable";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type StatusFilter = "all" | "active" | "completed";

type CampaignsListCache = {
  campaigns: CommandCampaignRow[];
  truncated: boolean;
  total: number;
};

function campaignsListCacheKey(userId: string | undefined, queryString: string) {
  return `${GANDIV_CACHE_PREFIX}campaigns:${userId ?? "anon"}:${queryString}`;
}

export default function CampaignsPage() {
  const router = useRouter();
  const { hasRole, authVersion, user } = useAuth();
  const authReady = useAuthReady();
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
    hasRole("admin") ||
    hasRole("client_viewer");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchCampaigns = useCallback(
    async (opts?: { background?: boolean; skipCache?: boolean }) => {
      const params = new URLSearchParams();
      params.set("enrich", "1");
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const [df, dt] = dateRange ?? [null, null];
      if (df) params.set("date_from", df.format("YYYY-MM-DD"));
      if (dt) params.set("date_to", dt.format("YYYY-MM-DD"));

      const qs = params.toString();
      const cacheKey = campaignsListCacheKey(user?.id, qs);

      if (opts?.skipCache) {
        setLoading(true);
      } else if (!opts?.background) {
        const hit = cache.get<CampaignsListCache>(cacheKey);
        if (hit && Array.isArray(hit.campaigns)) {
          setCampaigns(hit.campaigns);
          setListTruncated(Boolean(hit.truncated));
          setTotalCount(hit.total ?? hit.campaigns.length);
          setLoading(false);
          void fetchCampaigns({ background: true });
          return;
        }
        setLoading(true);
      }

      try {
        const res = await fetchWithAuthRetry(`/api/command/campaigns?${qs}`);
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          if (res.status === 403) {
            if (!opts?.background) {
              message.error("You do not have access to the Campaign Command Center.");
            }
            return;
          }
          if (!opts?.background) {
            message.error(d.error ?? "Failed to load campaigns");
          }
          return;
        }
        const data = (await res.json()) as {
          campaigns?: CommandCampaignRow[];
          truncated?: boolean;
          total?: number;
        };
        const list = data.campaigns ?? [];
        const truncated = Boolean(data.truncated);
        const total = data.total ?? list.length;
        setCampaigns(list);
        setListTruncated(truncated);
        setTotalCount(total);
        cache.set<CampaignsListCache>(cacheKey, { campaigns: list, truncated, total }, 5);
      } catch {
        if (!opts?.background) {
          message.error("Network error");
        }
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, dateRange, user?.id]
  );

  useEffect(() => {
    if (!authReady) return;
    void fetchCampaigns();
    // `authVersion` is included so this re-fetches whenever Supabase has rotated
    // tokens or another tab has updated the auth state — without this, a tab
    // restored from background can sit on stale data forever.
  }, [authReady, authVersion, fetchCampaigns]);

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
          <Button icon={<ReloadOutlined />} size="small" onClick={() => void fetchCampaigns({ skipCache: true })}>
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
          <CampaignTable campaigns={campaigns} loading={loading} />
        </Card>
      )}

    </div>
  );
}
