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
  Popconfirm,
} from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PercentageOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

type CampaignRow = {
  id: string;
  name: string;
  client_name: string | null;
  lead_type: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cpl: number | null;
  revenue: number | null;
  total_allocation: number | null;
  achieved: number | null;
  region: string | null;
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

export default function SalesCampaignsPage() {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch("/api/tl/campaigns/stats", { credentials: "include" }),
        fetch("/api/tl/campaigns", { credentials: "include" }),
      ]);
      const statsData = await statsRes.json();
      const campaignsData = await campaignsRes.json();
      if (statsRes.ok) setStats(statsData);
      if (campaignsRes.ok) setCampaigns(campaignsData.campaigns ?? []);
    } catch {
      message.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("sales") && !hasRole("admin")) {
      router.replace("/no-access");
      return;
    }
    fetchData();
  }, [isInitialized, hasRole, router, fetchData]);

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

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tl/campaigns/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      message.success("Campaign deleted");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to delete campaign");
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("sales") && !hasRole("admin")) {
    return null;
  }

  const columns = [
    {
      title: "Campaign ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v ? `${v.slice(0, 8)}...` : "—"}</span>
        </Tooltip>
      ),
    },
    { title: "Client Name", dataIndex: "client_name", key: "client_name", width: 120, ellipsis: true, render: (v: string | null) => v || "—" },
    {
      title: "Campaign Name",
      dataIndex: "name",
      key: "name",
      width: 160,
      ellipsis: true,
      render: (val: string, r: CampaignRow) => (
        <Link href={`/sales/campaigns/${r.id}`} style={{ fontWeight: 600 }}>
          {val}
        </Link>
      ),
    },
    { title: "Lead Type", dataIndex: "lead_type", key: "lead_type", width: 100, render: (v: string | null) => v || "—" },
    { title: "Industry", dataIndex: "industry", key: "industry", width: 110, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Geography", dataIndex: "geography", key: "geography", width: 110, ellipsis: true, render: (v: string | null) => v || "—" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
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
    { title: "Team Leader", dataIndex: "assigned_team_leader_name", key: "assigned_team_leader_name", width: 130, ellipsis: true, render: (v: string | null) => v || "—" },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      width: 100,
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
    {
      title: "CPL",
      dataIndex: "cpl",
      key: "cpl",
      width: 80,
      render: (v: number | null) => (v != null ? `$${v}` : "—"),
    },
    {
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      width: 100,
      render: (v: number | null) => (v != null ? `$${Number(v).toLocaleString()}` : "—"),
    },
    {
      title: "Region",
      dataIndex: "region",
      key: "region",
      width: 110,
      ellipsis: true,
      render: (v: string | null) => v || "—",
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
      width: 200,
      render: (_: unknown, r: CampaignRow) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/sales/campaigns/${r.id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => router.push(`/sales/campaigns/${r.id}?edit=1`)}
            />
          </Tooltip>
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
          <Popconfirm
            title="Delete campaign?"
            description="This action cannot be undone. Related leads and assignments may be affected."
            onConfirm={() => handleDelete(r.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Campaigns
          </Typography.Title>
          <Typography.Text type="secondary">
            Manage campaigns with full CRUD
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/sales/campaigns/create")}>
          Create Campaign
        </Button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total Campaigns"
                  value={stats?.totalCampaigns ?? 0}
                  prefix={<FundProjectionScreenOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Active Campaigns"
                  value={stats?.activeCampaigns ?? 0}
                  prefix={<RiseOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total Leads"
                  value={stats?.totalLeads ?? 0}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
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

          <Card title="All Campaigns" bodyStyle={{ overflowX: "auto" }}>
            <Table
              className="table-single-line"
              columns={columns}
              dataSource={campaigns}
              rowKey="id"
              scroll={{ x: 1830 }}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} campaigns` }}
              locale={{ emptyText: "No campaigns yet. Create your first campaign." }}
            />
          </Card>
        </>
      )}
    </>
  );
}
