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
import { predictCampaignPerformance, type CampaignHealthStatus } from "@/lib/campaign-performance-prediction";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type StatusFilter = "all" | "active" | "completed";
type HealthFilter = "all" | CampaignHealthStatus;

function getCampaignHealthStatus(row: CommandCampaignRow): CampaignHealthStatus | null {
  const achieved =
    row.achieved != null ? Number(row.achieved) : row.list_stats?.total_leads ?? 0;
  if (!row.total_allocation) return null;
  const pred = predictCampaignPerformance({
    totalAllocation: row.total_allocation,
    achieved,
    startDate: row.start_date,
    endDate: row.end_date,
  });
  return pred.status;
}

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
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [listTruncated, setListTruncated] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const canCreate =
    hasRole("internal_operator") ||
    hasRole("internal_admin") ||
    hasRole("admin") ||
    hasRole("client_viewer");

  const isClientViewerTable =
    hasRole("client_viewer") &&
    !hasRole("internal_operator") &&
    !hasRole("internal_admin") &&
    !hasRole("admin");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchCampaigns = useCallback(
    async (opts?: { background?: boolean; skipCache?: boolean }) => {
      if (!authReady) return;

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
          // Background revalidation: fire-and-forget without recursive self-ref
          void (async () => {
            try {
              const res = await fetchWithAuthRetry(`/api/command/campaigns?${qs}`);
              if (!res.ok) return;
              const data = (await res.json()) as {
                campaigns?: CommandCampaignRow[];
                truncated?: boolean;
                total?: number;
              };
              const list = data.campaigns ?? [];
              setCampaigns(list);
              setListTruncated(Boolean(data.truncated));
              setTotalCount(data.total ?? list.length);
              cache.set<CampaignsListCache>(cacheKey, { campaigns: list, truncated: Boolean(data.truncated), total: data.total ?? list.length }, 5);
            } catch {
              // silent background revalidation failure
            }
          })();
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
    [authReady, debouncedSearch, statusFilter, dateRange, user?.id]
  );

  useEffect(() => {
    if (!authReady) return;
    void fetchCampaigns();
  }, [authReady, authVersion, fetchCampaigns]);

  const filteredCampaigns =
    isClientViewerTable && healthFilter !== "all"
      ? campaigns.filter((c) => getCampaignHealthStatus(c) === healthFilter)
      : campaigns;

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
            Analytics · Lead Audit · Alerts
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
          padding: "14px 20px",
          borderRadius: 10,
          border: "1px solid #f0f0f0",
          marginBottom: 16,
        }}
      >
        <Row gutter={[10, 10]} align="middle">
          {/* Search */}
          <Col xs={24} sm={24} md={isClientViewerTable ? 7 : 9} lg={isClientViewerTable ? 6 : 8}>
            <Input
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="Search by campaign name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: "100%" }}
              allowClear
            />
          </Col>

          {/* Status filter */}
          <Col xs={12} sm={8} md={isClientViewerTable ? 4 : 5} lg={isClientViewerTable ? 4 : 5}>
            <Select<StatusFilter>
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: "100%" }}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "completed", label: "Completed" },
              ]}
            />
          </Col>

          {/* Campaign Health filter — Client Viewer only */}
          {isClientViewerTable && (
            <Col xs={12} sm={8} md={4} lg={4}>
              <Select<HealthFilter>
                value={healthFilter}
                onChange={setHealthFilter}
                style={{ width: "100%" }}
                options={[
                  { value: "all", label: "All health" },
                  {
                    value: "very_good",
                    label: (
                      <span>
                        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#389e0d", marginRight: 7, verticalAlign: "middle" }} />
                        Very Good
                      </span>
                    ),
                  },
                  {
                    value: "good",
                    label: (
                      <span>
                        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#d4b106", marginRight: 7, verticalAlign: "middle" }} />
                        Good
                      </span>
                    ),
                  },
                  {
                    value: "fair",
                    label: (
                      <span>
                        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#d46b08", marginRight: 7, verticalAlign: "middle" }} />
                        Fair
                      </span>
                    ),
                  },
                  {
                    value: "bad",
                    label: (
                      <span>
                        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#cf1322", marginRight: 7, verticalAlign: "middle" }} />
                        Bad
                      </span>
                    ),
                  },
                ]}
              />
            </Col>
          )}

          {/* Date range */}
          <Col xs={24} sm={isClientViewerTable ? 16 : 16} md={isClientViewerTable ? 9 : 10} lg={isClientViewerTable ? 8 : 9}>
            <RangePicker
              value={dateRange}
              onChange={(v) => setDateRange(v)}
              format="YYYY-MM-DD"
              style={{ width: "100%" }}
              allowEmpty={[true, true]}
            />
          </Col>

          {/* Results + Refresh — always one line, icon-only button */}
          <Col xs={24} flex="auto"
            style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "nowrap" }}
          >
            {listTruncated && (
              <Text type="warning" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                Showing first 500 of {totalCount}; narrow filters.
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
              {filteredCampaigns.length}
              {isClientViewerTable && healthFilter !== "all" && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>(filtered)</Text>
              )}
            </Text>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => void fetchCampaigns({ skipCache: true })}
              title="Refresh"
            />
          </Col>
        </Row>
      </div>

      {loading ? (
        <Card style={cardStyle}>
          <Skeleton active title={{ width: "32%" }} paragraph={{ rows: 4 }} />
        </Card>
      ) : (
        <Card style={{ ...cardStyle, padding: 0 }} styles={{ body: { padding: 0 } }}>
          <CampaignTable
            campaigns={filteredCampaigns}
            loading={loading}
            clientViewer={isClientViewerTable}
          />
        </Card>
      )}

    </div>
  );
}
