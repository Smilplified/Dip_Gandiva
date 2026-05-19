"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Tag,
  Tooltip,
  message,
  Spin,
  Typography,
  Input,
  Select,
} from "antd";
import {
  CheckCircleOutlined,
  PercentageOutlined,
  EyeOutlined,
  UserAddOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

type CampaignRow = {
  id: string;
  campaign_code: string | null;
  name: string;
  client_name: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  total_leads: number;
  total_agents: number;
  assigned_team_leader_name: string | null;
};

type Stats = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalInterested: number;
  conversionPct: number;
};

export default function TLCampaignsPage() {
  const router = useRouter();
  const { hasTLAccess, hasRole, isInitialized } = useAuth();
  const isOperationsManager = hasRole("operations_manager");
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [campaignsPageSize, setCampaignsPageSize] = useState(10);

  const fetchData = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    setLoading(true);
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch("/api/tl/campaigns/stats", { credentials: "include" }),
        fetch("/api/tl/campaigns", { credentials: "include" }),
      ]);
      const statsData = await statsRes.json();
      const campaignsData = await campaignsRes.json();
      if (statsRes.ok) setStats(statsData);
      if (campaignsRes.ok) {
        setCampaigns(campaignsData.campaigns ?? []);
      } else {
        message.error(campaignsData.error || "Failed to load campaigns");
      }
    } catch {
      message.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasTLAccess()) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [isInitialized, hasTLAccess, router, fetchData]);

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

  useEffect(() => {
    setCampaignsPage(1);
  }, [searchText, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tl/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      message.success("Campaign updated");
      fetchData();
    } catch {
      message.error("Failed to update campaign");
    }
  };

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

  const columns = [
    {
      title: "Sr. No.",
      key: "sr",
      width: 72,
      fixed: "left" as const,
      render: (_: unknown, __: CampaignRow, index: number) =>
        (campaignsPage - 1) * campaignsPageSize + index + 1,
    },
    {
      title: "Campaign Code",
      dataIndex: "campaign_code",
      key: "campaign_code",
      width: 130,
      fixed: "left" as const,
      render: (val: string | null) => (
        <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 12 }}>
          {val || "—"}
        </Tag>
      ),
    },
    {
      title: "Campaign Name",
      dataIndex: "name",
      key: "name",
      width: 180,
      ellipsis: true,
      render: (val: string, r: CampaignRow) => (
        <Link href={`/tl/campaigns/${r.id}`} style={{ fontWeight: 600 }}>
          {val}
        </Link>
      ),
    },
    { title: "Industry", dataIndex: "industry", key: "industry", width: 120, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Geography", dataIndex: "geography", key: "geography", width: 120, ellipsis: true, render: (v: string | null) => v || "—" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      filters: [
        { text: "Draft", value: "draft" },
        { text: "Active", value: "active" },
        { text: "Paused", value: "paused" },
        { text: "Completed", value: "completed" },
      ],
      onFilter: (value: unknown, record: CampaignRow) => record.status === value,
      render: (val: string) => {
        const colors: Record<string, string> = {
          draft: "default",
          active: "green",
          paused: "orange",
          completed: "blue",
        };
        return <Tag color={colors[val] ?? "default"}>{val}</Tag>;
      },
    },
    { title: "Total Leads", dataIndex: "total_leads", key: "total_leads", width: 100 },
    { title: "Agents", dataIndex: "total_agents", key: "total_agents", width: 80 },
    {
      title: "Team Leader",
      dataIndex: "assigned_team_leader_name",
      key: "assigned_team_leader_name",
      width: 160,
      ellipsis: true,
      render: (v: string | null, r: CampaignRow) =>
        v ? (
          <Tag color="purple" style={{ margin: 0, maxWidth: "100%" }}>
            {v}
          </Tag>
        ) : isOperationsManager ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Unassigned
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_: unknown, r: CampaignRow) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/tl/campaigns/${r.id}`)}
            />
          </Tooltip>
          {isOperationsManager ? (
            <Tooltip title="Assign Team Leader">
              <Button
                type="text"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => router.push(`/tl/campaigns/${r.id}?assignTl=1`)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Assign Agents">
              <Button
                type="text"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => router.push(`/tl/campaigns/${r.id}?assign=1`)}
              />
            </Tooltip>
          )}
          {r.status === "draft" || r.status === "paused" ? (
            <Tooltip title="Activate">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStatusChange(r.id, "active")}
              />
            </Tooltip>
          ) : r.status === "active" ? (
            <Tooltip title="Pause">
              <Button
                type="text"
                size="small"
                icon={<PauseCircleOutlined />}
                onClick={() => handleStatusChange(r.id, "paused")}
              />
            </Tooltip>
          ) : null}
        </div>
      ),
    },
  ];

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      !searchText ||
      c.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      c.industry?.toLowerCase().includes(searchText.toLowerCase()) ||
      c.geography?.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Campaigns
        </Typography.Title>
        <Typography.Text type="secondary">
          {isOperationsManager
            ? "Manage campaigns and assign Team Leaders"
            : "Manage your assigned campaigns and assign agents"}
        </Typography.Text>
      </div>

      {isOffline && (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Check your internet connection. Data will reload
            automatically once you are back online, or{" "}
            <a
              onClick={(e) => {
                e.preventDefault();
                fetchData();
              }}
            >
              click here to retry now
            </a>
            .
          </Typography.Text>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={12}>
              <Card>
                <Statistic
                  title="Total Interested"
                  value={stats?.totalInterested ?? 0}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={12}>
              <Card>
                <Statistic
                  title="Conversion %"
                  value={stats?.conversionPct ?? 0}
                  suffix="%"
                  prefix={<PercentageOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="All Campaigns"
            bodyStyle={{ overflowX: "auto" }}
            extra={
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Input
                  placeholder="Search campaigns..."
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  style={{ width: 220 }}
                />
                <Select
                  placeholder="Filter by status"
                  allowClear
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={statusOptions}
                  style={{ width: 160 }}
                />
              </div>
            }
          >
            <Table
              className="table-single-line"
              columns={columns}
              dataSource={filteredCampaigns}
              rowKey="id"
              scroll={{ x: 1150 }}
              pagination={{
                current: campaignsPage,
                pageSize: campaignsPageSize,
                showSizeChanger: true,
                pageSizeOptions: ["10", "15", "25", "50"],
                showTotal: (t) => `Total ${t} campaigns`,
                onChange: (page, size) => {
                  setCampaignsPage(page);
                  setCampaignsPageSize(size);
                },
              }}
              locale={{ emptyText: "No campaigns yet. Create your first campaign." }}
            />
          </Card>
        </>
      )}
    </>
  );
}
