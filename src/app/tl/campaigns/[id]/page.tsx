"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Row,
  Col,
  Divider,
  Space,
  Drawer,
  Form,
  DatePicker,
  Select,
} from "antd";
import {
  ArrowLeftOutlined,
  UserAddOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  TeamOutlined,
  FileOutlined,
  DownloadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";

type Campaign = {
  id: string;
  campaign_id?: string | null;
  name: string;
  client_name?: string | null;
  description: string | null;
  industry: string | null;
  geography: string | null;
  target_designation?: string | null;
  lead_type?: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cpl?: number | null;
  revenue?: number | null;
  booked?: number | null;
  total_allocation?: number | null;
  post_qa?: number | null;
  achieved?: number | null;
  pending_allocation?: number | null;
  region?: string | null;
  weekly_call?: string | null;
  weekly_report?: string | null;
  additional_comments?: string | null;
  assigned_team_leader_id?: string | null;
  assigned_team_leader_name?: string | null;
  created_at?: string;
};

type Lead = {
  id: string;
  lead_id: string | null;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  followup_date: string | null;
  notes: string | null;
  assigned_agent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_agent_name: string | null;
  created_by_name: string | null;
  job_title: string | null;
  job_function: string | null;
  job_level: string | null;
  direct_number: string | null;
  industry: string | null;
  company_number: string | null;
  employee_size: string | null;
  address: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  founded_years: number | null;
  founded_years_link: string | null;
  revenue_range: string | null;
  revenue_link: string | null;
  contact_linkedin_url: string | null;
  company_linkedin_url: string | null;
  lead_disposition: string | null;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "followup", label: "Follow-up" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

type Agent = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type CampaignFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  download_url: string | null;
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
  const [files, setFiles] = useState<CampaignFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [form] = Form.useForm();

  const fetchCampaign = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tl/campaigns/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCampaign(data.campaign);
      setLeads(data.leads ?? []);
      setAssignments(data.assignments ?? []);
      setFiles(data.files ?? []);
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
      router.replace("/login");
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

  const openEditLeadDrawer = (lead: Lead) => {
    setEditingLead(lead);
    form.setFieldsValue({
      ...lead,
      followup_date: lead.followup_date ? dayjs(lead.followup_date) : null,
    });
    setLeadDrawerOpen(true);
  };

  const closeLeadDrawer = () => {
    setLeadDrawerOpen(false);
    setEditingLead(null);
    form.resetFields();
  };

  const handleUpdateLead = async () => {
    if (!campaignId || !editingLead) return;
    try {
      const values = await form.validateFields();
      setUpdatingLead(true);
      const res = await fetch(`/api/tl/campaigns/${campaignId}/leads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingLead.id,
          name: values.name ?? null,
          company_name: values.company_name ?? null,
          phone: values.phone ?? null,
          email: values.email ?? null,
          city: values.city ?? null,
          status: values.status ?? null,
          followup_date: values.followup_date
            ? values.followup_date.format("YYYY-MM-DD")
            : null,
          notes: values.notes ?? null,
          job_title: values.job_title ?? null,
          job_function: values.job_function ?? null,
          job_level: values.job_level ?? null,
          direct_number: values.direct_number ?? null,
          industry: values.industry ?? null,
          company_number: values.company_number ?? null,
          employee_size: values.employee_size ?? null,
          address: values.address ?? null,
          state: values.state ?? null,
          country: values.country ?? null,
          zip_code: values.zip_code ?? null,
          founded_years: values.founded_years ?? null,
          founded_years_link: values.founded_years_link ?? null,
          revenue_range: values.revenue_range ?? null,
          revenue_link: values.revenue_link ?? null,
          contact_linkedin_url: values.contact_linkedin_url ?? null,
          company_linkedin_url: values.company_linkedin_url ?? null,
          lead_disposition: values.lead_disposition ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update lead");
      message.success("Lead updated");
      fetchCampaign(campaignId);
      closeLeadDrawer();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setUpdatingLead(false);
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

  const leadStatusColors: Record<string, string> = {
    new: "default",
    contacted: "processing",
    interested: "green",
    followup: "gold",
    closed_won: "blue",
    closed_lost: "red",
  };

  const leadColumns = [
    { title: "Sr. No.", key: "sr", width: 72, fixed: "left" as const, render: (_: unknown, __: Lead, index: number) => index + 1 },
    { title: "Lead ID", dataIndex: "lead_id", key: "lead_id", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Name", dataIndex: "name", key: "name", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Company", dataIndex: "company_name", key: "company_name", width: 160, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Job Title", dataIndex: "job_title", key: "job_title", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Job Function", dataIndex: "job_function", key: "job_function", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Job Level", dataIndex: "job_level", key: "job_level", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 120, render: (v: string | null) => v || "—" },
    { title: "Direct Number", dataIndex: "direct_number", key: "direct_number", width: 140, render: (v: string | null) => v || "—" },
    { title: "Email", dataIndex: "email", key: "email", width: 180, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Industry", dataIndex: "industry", key: "industry", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Company Number", dataIndex: "company_number", key: "company_number", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Employee Size", dataIndex: "employee_size", key: "employee_size", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Address", dataIndex: "address", key: "address", width: 200, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "City", dataIndex: "city", key: "city", width: 120, render: (v: string | null) => v || "—" },
    { title: "State", dataIndex: "state", key: "state", width: 120, render: (v: string | null) => v || "—" },
    { title: "Country", dataIndex: "country", key: "country", width: 120, render: (v: string | null) => v || "—" },
    { title: "Zip / Postal", dataIndex: "zip_code", key: "zip_code", width: 120, render: (v: string | null) => v || "—" },
    { title: "Founded Year", dataIndex: "founded_years", key: "founded_years", width: 120, render: (v: number | null) => v ?? "—" },
    { title: "Founded Link", dataIndex: "founded_years_link", key: "founded_years_link", width: 180, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Revenue Range", dataIndex: "revenue_range", key: "revenue_range", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Revenue Link", dataIndex: "revenue_link", key: "revenue_link", width: 180, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Contact LinkedIn", dataIndex: "contact_linkedin_url", key: "contact_linkedin_url", width: 200, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Company LinkedIn", dataIndex: "company_linkedin_url", key: "company_linkedin_url", width: 200, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Lead Disposition", dataIndex: "lead_disposition", key: "lead_disposition", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Status", dataIndex: "status", key: "status", width: 110, render: (v: string) => <Tag color={leadStatusColors[v] ?? "default"} style={{ textTransform: "capitalize" }}>{v?.replace("_", " ")}</Tag> },
    { title: "Follow-up", dataIndex: "followup_date", key: "followup_date", width: 110, render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—") },
    { title: "Notes", dataIndex: "notes", key: "notes", width: 160, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Created By (Agent)", dataIndex: "created_by_name", key: "created_by_name", width: 160, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Created", dataIndex: "created_at", key: "created_at", width: 140, render: (v: string) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—") },
    {
      title: "",
      key: "actions",
      width: 60,
      fixed: "right" as const,
      render: (_: unknown, record: Lead) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            openEditLeadDrawer(record);
          }}
        />
      ),
    },
  ];

  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ marginBottom: 12 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>
        {label}
      </Typography.Text>
      <Typography.Text style={{ fontSize: 14 }}>{value ?? "—"}</Typography.Text>
    </div>
  );

  return (
    <div style={{ width: "100%", padding: "0 24px 32px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/tl/dashboard"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "#1677ff", textDecoration: "none", marginBottom: 16 }}
        >
          <ArrowLeftOutlined /> Back to Dashboard
        </Link>
      </div>

      <Card
        style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
        bodyStyle={{ padding: "24px 28px" }}
      >
        <Row gutter={24} align="middle" justify="space-between" wrap>
          <Col flex="1" style={{ minWidth: 0 }}>
            <Typography.Title level={3} style={{ margin: 0, marginBottom: 6, fontWeight: 600 }}>
              {campaign.name}
            </Typography.Title>
            {campaign.client_name && (
              <Typography.Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 8 }}>
                {campaign.client_name}
              </Typography.Text>
            )}
            <Space size="small" wrap>
              {campaign.campaign_id && <Tag style={{ fontFamily: "monospace", fontSize: 12, margin: 0 }}>{campaign.campaign_id}</Tag>}
              <Tag color={statusColors[campaign.status] ?? "default"} style={{ textTransform: "capitalize", margin: 0 }}>
                {campaign.status}
              </Tag>
              {campaign.lead_type && <Tag style={{ margin: 0 }}>{campaign.lead_type}</Tag>}
              {(campaign.industry || campaign.geography) && (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {[campaign.industry, campaign.geography].filter(Boolean).join(" · ")}
                </Typography.Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space size="small" wrap>
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
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card
            title="Overview"
            style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
            bodyStyle={{ padding: "24px 28px" }}
          >
            {(campaign.description || campaign.target_designation) && (
              <>
                {campaign.description && <DetailItem label="Description" value={campaign.description} />}
                {campaign.target_designation && <DetailItem label="Target Designation" value={campaign.target_designation} />}
                <Divider style={{ margin: "16px 0" }} />
              </>
            )}
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <DetailItem label="Lead Type" value={campaign.lead_type} />
                <DetailItem label="Start Date" value={campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : null} />
                <DetailItem label="End Date" value={campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : null} />
                <DetailItem label="Region" value={campaign.region} />
                <DetailItem label="Assigned Team Leader" value={campaign.assigned_team_leader_name} />
                <DetailItem label="Weekly Call" value={campaign.weekly_call} />
                <DetailItem label="Weekly Report" value={campaign.weekly_report} />
              </Col>
              <Col xs={24} sm={12}>
                <DetailItem label="Total Allocation" value={campaign.total_allocation} />
                <DetailItem label="Post QA" value={campaign.post_qa} />
                <DetailItem label="Achieved" value={campaign.achieved} />
                <DetailItem label="Pending Allocation" value={campaign.pending_allocation} />
                <DetailItem label="Booked" value={campaign.booked != null ? `$${Number(campaign.booked).toLocaleString()}` : null} />
              </Col>
            </Row>
            {campaign.additional_comments && (
              <>
                <Divider style={{ margin: "16px 0" }} />
                <DetailItem label="Additional Comments" value={campaign.additional_comments} />
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <FileOutlined />
                <span>Files</span>
                <Tag style={{ marginLeft: 4 }}>{files.length}</Tag>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
            bodyStyle={{ padding: "24px 28px" }}
          >
            {files.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "#8c8c8c", fontSize: 14 }}>
                <FileOutlined style={{ fontSize: 40, marginBottom: 12, display: "block", color: "#d9d9d9" }} />
                No files uploaded for this campaign.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {files.map((f, idx) => (
                  <div
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: idx < files.length - 1 ? "1px solid #f5f5f5" : "none",
                      gap: 12,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                      <FileOutlined style={{ color: "#8c8c8c", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file_name}</span>
                      {f.file_size != null && (
                        <Typography.Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                          {(f.file_size / 1024).toFixed(1)} KB
                        </Typography.Text>
                      )}
                    </span>
                    {f.download_url && (
                      <Button type="link" size="small" icon={<DownloadOutlined />} href={f.download_url} target="_blank" rel="noopener noreferrer" style={{ padding: "0 4px", flexShrink: 0 }}>
                        Download
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
            bodyStyle={{ padding: "24px 28px" }}
          >
            {assignments.length === 0 ? (
              <p style={{ color: "#8c8c8c", margin: 0 }}>
                No agents assigned.{" "}
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
        </Col>
      </Row>

      <Card
        title={`Leads (${leads.length})`}
        style={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
        bodyStyle={{ padding: "24px 28px" }}
      >
        <Table
          className="table-single-line"
          columns={leadColumns}
          dataSource={leads}
          rowKey="id"
          scroll={{ x: 2600 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} leads` }}
          locale={{ emptyText: "No leads yet" }}
          size="middle"
          onRow={(record) => ({
            onClick: () => openEditLeadDrawer(record),
            style: { cursor: "pointer" },
          })}
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

      <Drawer
        title="Edit Lead"
        placement="right"
        width="50%"
        open={leadDrawerOpen}
        onClose={closeLeadDrawer}
        destroyOnClose
        styles={{ body: { paddingBottom: 80 } }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button onClick={closeLeadDrawer}>Cancel</Button>
            <Button type="primary" loading={updatingLead} onClick={handleUpdateLead}>
              Save Changes
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="Name" name="name">
                <Input placeholder="Lead name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Company" name="company_name">
                <Input placeholder="Company name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Job Title" name="job_title">
                <Input placeholder="Job title" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Job Function" name="job_function">
                <Select
                  placeholder="Select job function"
                  options={[
                    { value: "sales", label: "Sales" },
                    { value: "marketing", label: "Marketing" },
                    { value: "operations", label: "Operations" },
                    { value: "finance", label: "Finance" },
                    { value: "it", label: "IT" },
                    { value: "hr", label: "HR" },
                    { value: "other", label: "Other" },
                  ]}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Job Level" name="job_level">
                <Select
                  placeholder="Select job level"
                  options={[
                    { value: "entry", label: "Entry / Junior" },
                    { value: "mid", label: "Mid-level" },
                    { value: "senior", label: "Senior" },
                    { value: "director", label: "Director" },
                    { value: "vp", label: "VP" },
                    { value: "c_level", label: "C-level" },
                    { value: "owner", label: "Owner / Founder" },
                  ]}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Email" name="email">
                <Input placeholder="email@example.com" type="email" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+1 555 123 4567" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Direct Number" name="direct_number">
                <Input placeholder="+1 555 987 6543" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Industry" name="industry">
                <Input placeholder="Industry" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Company Number" name="company_number">
                <Input placeholder="Company phone number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Employee Size" name="employee_size">
                <Select
                  placeholder="Select employee size"
                  options={[
                    { value: "1-10", label: "1-10" },
                    { value: "11-50", label: "11-50" },
                    { value: "51-200", label: "51-200" },
                    { value: "201-500", label: "201-500" },
                    { value: "501-1000", label: "501-1000" },
                    { value: "1001-5000", label: "1001-5000" },
                    { value: "5001-10000", label: "5001-10000" },
                    { value: "10001+", label: "10001+" },
                  ]}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Address" name="address">
                <Input placeholder="Street address" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="City" name="city">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="State" name="state">
                <Input placeholder="State / Region" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Country" name="country">
                <Input placeholder="Country" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Zip / Postal Code" name="zip_code">
                <Input placeholder="Zip / Postal code" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Founded Year" name="founded_years">
                <Input placeholder="e.g. 2010" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label="Founded Year Link" name="founded_years_link">
                <Input placeholder="URL confirming founded year" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Revenue Range" name="revenue_range">
                <Input placeholder="e.g. $1M - $5M" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label="Revenue Link" name="revenue_link">
                <Input placeholder="URL confirming revenue" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Contact LinkedIn URL" name="contact_linkedin_url">
                <Input placeholder="https://linkedin.com/in/..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Company LinkedIn URL" name="company_linkedin_url">
                <Input placeholder="https://linkedin.com/company/..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Lead Disposition" name="lead_disposition">
                <Select
                  placeholder="Select disposition"
                  options={[
                    { value: "new_lead", label: "New Lead" },
                    { value: "working", label: "Working" },
                    { value: "qualified", label: "Qualified" },
                    { value: "unqualified", label: "Unqualified" },
                    { value: "nurture", label: "Nurture" },
                  ]}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Status" name="status" initialValue="new">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Follow-up Date" name="followup_date">
                <DatePicker
                  style={{ width: "100%" }}
                  disabledDate={(d) => d && d < dayjs().startOf("day")}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} placeholder="Notes, context, objections..." />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
