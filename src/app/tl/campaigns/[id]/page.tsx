"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Button,
  Table,
  Tag,
  Modal,
  Transfer,
  Input,
  message,
  Spin,
  Typography,
  Empty,
} from "antd";
import {
  ArrowLeftOutlined,
  UserAddOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type Lead = {
  id: string;
  name: string | null;
  company_name: string | null;
  email: string | null;
  status: string;
  followup_date: string | null;
};

type Agent = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const { hasRole, isInitialized } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignments, setAssignments] = useState<{ agent_id: string; agent_name?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const fetchCampaign = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tl/campaigns/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCampaign(data.campaign);
      setLeads(data.leads ?? []);
      setAssignments(data.assignments ?? []);
      setCampaignId(id);
    } catch {
      message.error("Failed to load campaign");
      router.replace("/tl/dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!id) {
      router.replace("/tl/dashboard");
      return;
    }
    if (!isInitialized) return;
    if (!hasRole("team_leader") && !hasRole("tl")) {
      router.replace("/no-access");
      return;
    }
    fetchCampaign(id);
  }, [id, isInitialized, hasRole, router, fetchCampaign]);

  useEffect(() => {
    if (searchParams.get("assign") === "1" && campaignId) {
      setAssignModalOpen(true);
    }
  }, [searchParams, campaignId]);

  useEffect(() => {
    if (assignModalOpen) {
      setSelectedAgentIds(assignments.map((a) => a.agent_id));
      setAgentsLoading(true);
      fetch("/api/tl/agents", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          setAgents(data.agents ?? []);
          if (data.error) message.warning(data.error);
        })
        .catch(() => message.error("Failed to load agents"))
        .finally(() => setAgentsLoading(false));
    }
  }, [assignModalOpen, assignments]);

  const openAssignModal = () => setAssignModalOpen(true);

  const transferData = useMemo(
    () =>
      agents.map((a) => ({
        key: a.id,
        title: a.full_name || a.email || "Unknown",
        description: a.email || "",
      })),
    [agents]
  );

  const handleAssign = async () => {
    if (!campaignId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/tl/campaigns/${campaignId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agent_ids: selectedAgentIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign");
      message.success("Agents assigned");
      setAssignModalOpen(false);
      fetchCampaign(campaignId);
    } catch {
      message.error("Failed to assign agents");
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/tl/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      message.success("Campaign updated");
      fetchCampaign(campaignId);
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

  if (loading && !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!campaign) return null;

  const statusColors: Record<string, string> = {
    draft: "default",
    active: "green",
    paused: "orange",
    completed: "blue",
  };

  const leadColumns = [
    { title: "Name", dataIndex: "name", key: "name", render: (v: string | null) => v || "—" },
    { title: "Company", dataIndex: "company_name", key: "company_name", render: (v: string | null) => v || "—" },
    { title: "Email", dataIndex: "email", key: "email", render: (v: string | null) => v || "—" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "Follow-up",
      dataIndex: "followup_date",
      key: "followup_date",
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href="/tl/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <ArrowLeftOutlined /> Back to Dashboard
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {campaign.name}
            </Typography.Title>
            <Tag color={statusColors[campaign.status] ?? "default"}>{campaign.status}</Tag>
            {campaign.industry && <span style={{ marginLeft: 8, color: "#8c8c8c" }}>{campaign.industry}</span>}
            {campaign.geography && <span style={{ marginLeft: 8, color: "#8c8c8c" }}>{" | "}{campaign.geography}</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button icon={<UserAddOutlined />} onClick={openAssignModal}>
              Assign Agents
            </Button>
            {(campaign.status === "draft" || campaign.status === "paused") && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStatusChange("active")}>
                Activate
              </Button>
            )}
            {campaign.status === "active" && (
              <Button icon={<PauseCircleOutlined />} onClick={() => handleStatusChange("paused")}>
                Pause
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card title="Campaign Details" style={{ marginBottom: 24 }}>
        <p><strong>Description:</strong> {campaign.description || "—"}</p>
        <p><strong>Start Date:</strong> {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "—"}</p>
        <p><strong>End Date:</strong> {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "—"}</p>
      </Card>

      <Card
        title={
          <span>
            <TeamOutlined style={{ marginRight: 8 }} />
            Assigned Agents ({assignments.length})
          </span>
        }
        extra={
          <Button type="link" icon={<UserAddOutlined />} onClick={openAssignModal} style={{ padding: 0 }}>
            {assignments.length > 0 ? "Edit" : "Assign"}
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        {assignments.length === 0 ? (
          <p style={{ color: "#8c8c8c", margin: 0 }}>
            No agents assigned yet.{" "}
            <Button type="link" onClick={openAssignModal} style={{ padding: 0 }}>
              Assign agents
            </Button>
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {assignments.map((a) => (
              <Tag key={a.agent_id} color="blue">
                {a.agent_name ?? a.agent_id}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Leads (${leads.length})`}>
        <Table
          className="table-single-line"
          columns={leadColumns}
          dataSource={leads}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "No leads yet" }}
        />
      </Card>

      <Modal
        title={
          <span>
            <TeamOutlined style={{ marginRight: 8 }} />
            Assign Agents to Campaign
          </span>
        }
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={handleAssign}
        confirmLoading={assigning}
        okText={selectedAgentIds.length > 0 ? `Assign ${selectedAgentIds.length} agent${selectedAgentIds.length === 1 ? "" : "s"}` : "Save (no agents)"}
        width={560}
      >
        <p style={{ marginBottom: 16, color: "#595959" }}>
          Move agents between lists to assign or unassign them from this campaign. Assigned agents can view and manage leads.
        </p>
        {agentsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Spin size="large" tip="Loading agents..." />
          </div>
        ) : agents.length === 0 ? (
          <Empty
            image={<TeamOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />}
            description={
              <div>
                <p style={{ marginBottom: 8 }}>No agents in your organization.</p>
                <p style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 16 }}>
                  Create Agent users from the Team → Users page, then assign them here.
                </p>
                <Button type="primary" onClick={() => { setAssignModalOpen(false); router.push("/tl/users"); }}>
                  Go to Users
                </Button>
              </div>
            }
          />
        ) : (
          <Transfer
            dataSource={transferData}
            titles={["Available", "Assigned"]}
            targetKeys={selectedAgentIds}
            onChange={(targetKeys) => setSelectedAgentIds(targetKeys.map(String))}
            render={(item) => (
              <span>
                <strong>{item.title}</strong>
                {item.description && <span style={{ color: "#8c8c8c", marginLeft: 8 }}>({item.description})</span>}
              </span>
            )}
            showSearch
            filterOption={(inputValue, item) =>
              (item.title?.toLowerCase() ?? "").includes(inputValue.toLowerCase()) ||
              (item.description?.toLowerCase() ?? "").includes(inputValue.toLowerCase())
            }
            listStyle={{ width: 240, height: 320 }}
            oneWay={false}
            pagination
          />
        )}
      </Modal>
    </>
  );
}
