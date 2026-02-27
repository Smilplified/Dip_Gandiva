"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Collapse,
  Drawer,
  Form,
  Input,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Spin,
  Empty,
  Space,
  message,
  DatePicker,
  Select,
  Modal,
} from "antd";
import {
  ReloadOutlined,
  EditOutlined,
  LeftOutlined,
  SaveOutlined,
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
  created_at?: string;
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
  employee_size?: string[] | null;
  abm?: boolean | null;
  seniority?: string | null;
  job_function?: string | null;
  creatives_url?: string[] | null;
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
  campaign_id: string;
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
  qa_status?: string | null;
  disqualification_reasons?: string | null;
  disqualification_reason?: string | null;
  rectified_reason?: string | null;
};

type CampaignWithLeads = Campaign & { leads: Lead[] };

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "followup", label: "Follow-up" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const QA_STATUS_OPTIONS = [
  { value: "qualified", label: "Qualified" },
  { value: "disqualified", label: "Disqualified" },
  { value: "rectified", label: "Rectified" },
];

const DISQUALIFICATION_REASONS_OPTIONS = [
  "Wrong Persona",
  "Out of Geography",
  "No Budget",
  "No Timeline",
  "Not Decision Maker",
  "Duplicate Lead",
  "Invalid Contact",
  "No Response",
  "Not Interested",
  "Competitor",
  "Out of Scope",
  "Wrong Industry",
  "Company Size",
  "Other",
].map((v) => ({ value: v, label: v }));

const JOB_FUNCTION_OPTIONS = [
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "it", label: "IT" },
  { value: "hr", label: "HR" },
  { value: "other", label: "Other" },
];

const JOB_LEVEL_OPTIONS = [
  { value: "entry", label: "Entry / Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "director", label: "Director" },
  { value: "vp", label: "VP" },
  { value: "c_level", label: "C-level" },
  { value: "owner", label: "Owner / Founder" },
];

const EMPLOYEE_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "501-1000", label: "501-1000" },
  { value: "1001-5000", label: "1001-5000" },
  { value: "5001-10000", label: "5001-10000" },
  { value: "10001+", label: "10001+" },
];

const DISPOSITION_OPTIONS = [
  { value: "new_lead", label: "New Lead" },
  { value: "working", label: "Working" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
  { value: "nurture", label: "Nurture" },
];

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>
        {label}
      </Typography.Text>
      <Typography.Text style={{ fontSize: 14 }}>{value ?? "—"}</Typography.Text>
    </div>
  );
}

export default function QACampaignsPage() {
  const { hasRole, isInitialized } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithLeads[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerCampaignId, setDrawerCampaignId] = useState<string | null>(null);
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [form] = Form.useForm();
  const [previousConfirmOpen, setPreviousConfirmOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/qa/dashboard", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCampaigns(data.campaigns ?? []);
    } catch {
      message.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("qa") && !hasRole("admin")) return;
    fetchDashboard();
  }, [isInitialized, hasRole, fetchDashboard]);

  const filteredCampaigns = useCallback(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.lead_type ?? "").toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q) ||
        (c.geography ?? "").toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  const openLeadDrawer = (lead: Lead, campaignId: string) => {
    setDrawerLead(lead);
    setDrawerCampaignId(campaignId);
    const reasonsArray = lead.disqualification_reasons?.trim()
      ? lead.disqualification_reasons.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    form.setFieldsValue({
      name: lead.name ?? undefined,
      company_name: lead.company_name ?? undefined,
      job_title: lead.job_title ?? undefined,
      job_function: lead.job_function ?? undefined,
      job_level: lead.job_level ?? undefined,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      direct_number: lead.direct_number ?? undefined,
      industry: lead.industry ?? undefined,
      company_number: lead.company_number ?? undefined,
      employee_size: lead.employee_size ?? undefined,
      address: lead.address ?? undefined,
      city: lead.city ?? undefined,
      state: lead.state ?? undefined,
      country: lead.country ?? undefined,
      zip_code: lead.zip_code ?? undefined,
      founded_years: lead.founded_years != null ? String(lead.founded_years) : undefined,
      founded_years_link: lead.founded_years_link ?? undefined,
      revenue_range: lead.revenue_range ?? undefined,
      revenue_link: lead.revenue_link ?? undefined,
      contact_linkedin_url: lead.contact_linkedin_url ?? undefined,
      company_linkedin_url: lead.company_linkedin_url ?? undefined,
      lead_disposition: lead.lead_disposition ?? undefined,
      status: lead.status ?? "new",
      followup_date: lead.followup_date ? dayjs(lead.followup_date) : undefined,
      notes: lead.notes ?? undefined,
      qa_status: lead.qa_status ?? undefined,
      disqualification_reasons: reasonsArray,
      disqualification_reason: lead.disqualification_reason ?? undefined,
      rectified_reason: lead.rectified_reason ?? undefined,
    });
    setDrawerOpen(true);
  };

  const closeLeadDrawer = () => {
    setDrawerOpen(false);
    setDrawerLead(null);
    setDrawerCampaignId(null);
    form.resetFields();
  };

  function getDrawerLeadContext(): { campaignIndex: number; leadIndex: number; nextLead: Lead | null; prevLead: Lead | null } {
    if (!drawerLead || !drawerCampaignId) {
      return { campaignIndex: -1, leadIndex: -1, nextLead: null, prevLead: null };
    }
    const list = filteredCampaigns();
    let campaignIndex = -1;
    let leadIndex = -1;
    for (let i = 0; i < list.length; i++) {
      const idx = list[i].leads?.findIndex((l) => l.id === drawerLead.id) ?? -1;
      if (idx >= 0) {
        campaignIndex = i;
        leadIndex = idx;
        break;
      }
    }
    let nextLead: Lead | null = null;
    let prevLead: Lead | null = null;
    if (campaignIndex >= 0 && list[campaignIndex]) {
      const leads = list[campaignIndex].leads ?? [];
      if (leadIndex < leads.length - 1) nextLead = leads[leadIndex + 1];
      if (leadIndex > 0) prevLead = leads[leadIndex - 1];
    }
    if (nextLead == null && campaignIndex >= 0) {
      for (let i = campaignIndex + 1; i < list.length; i++) {
        const leads = list[i].leads ?? [];
        if (leads.length > 0) {
          nextLead = leads[0];
          break;
        }
      }
    }
    if (prevLead == null && campaignIndex > 0) {
      for (let i = campaignIndex - 1; i >= 0; i--) {
        const leads = list[i].leads ?? [];
        if (leads.length > 0) {
          prevLead = leads[leads.length - 1];
          break;
        }
      }
    }
    return { campaignIndex, leadIndex, nextLead, prevLead };
  }

  const handlePreviousLead = () => {
    const { prevLead } = getDrawerLeadContext();
    if (prevLead && drawerCampaignId) {
      const camp = campaigns.find((c) => c.id === drawerCampaignId);
      const prevCampaignId = camp ? (filteredCampaigns().find((c) => c.leads?.some((l) => l.id === prevLead.id))?.id ?? drawerCampaignId) : drawerCampaignId;
      if (form.isFieldsTouched()) {
        setPreviousConfirmOpen(true);
        (window as unknown as { __qa_prev_lead?: Lead; __qa_prev_cid?: string })["__qa_prev_lead"] = prevLead;
        (window as unknown as { __qa_prev_lead?: Lead; __qa_prev_cid?: string })["__qa_prev_cid"] = prevCampaignId;
        return;
      }
      openLeadDrawer(prevLead, prevCampaignId);
    }
  };

  const handleDrawerSave = async (saveAndContinue?: boolean) => {
    if (!drawerCampaignId || !drawerLead) return;
    try {
      const values = await form.validateFields();
      setSavingDrawer(true);
      const reasons = values.disqualification_reasons;
      const disqualification_reasons = Array.isArray(reasons)
        ? reasons.filter((v) => v != null && String(v).trim()).map((v) => String(v).trim()).join(", ")
        : undefined;
      const res = await fetch(`/api/tl/campaigns/${drawerCampaignId}/leads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: drawerLead.id,
          name: values.name ?? null,
          company_name: values.company_name ?? null,
          phone: values.phone ?? null,
          email: values.email ?? null,
          city: values.city ?? null,
          status: values.status ?? null,
          followup_date: values.followup_date ? values.followup_date.format("YYYY-MM-DD") : null,
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
          founded_years: values.founded_years != null && values.founded_years !== "" ? Number(values.founded_years) : null,
          founded_years_link: values.founded_years_link ?? null,
          revenue_range: values.revenue_range ?? null,
          revenue_link: values.revenue_link ?? null,
          contact_linkedin_url: values.contact_linkedin_url ?? null,
          company_linkedin_url: values.company_linkedin_url ?? null,
          lead_disposition: values.lead_disposition ?? null,
          qa_status: values.qa_status ?? null,
          disqualification_reasons,
          disqualification_reason: values.disqualification_reason ?? null,
          rectified_reason: values.rectified_reason ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update lead");
      message.success("Lead updated");
      await fetchDashboard();
      const updatedCampaigns = await fetch("/api/qa/dashboard", { credentials: "include" }).then((r) => r.json()).then((d) => d.campaigns ?? []);
      setCampaigns(updatedCampaigns);
      if (saveAndContinue) {
        const { nextLead } = getDrawerLeadContext();
        if (nextLead && drawerCampaignId) {
          const nextCampaign = (updatedCampaigns as CampaignWithLeads[]).find((c) => c.leads?.some((l) => l.id === nextLead.id));
          openLeadDrawer(nextLead, nextCampaign?.id ?? drawerCampaignId);
        } else {
          closeLeadDrawer();
        }
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to update lead");
    } finally {
      setSavingDrawer(false);
    }
  };

  const handleConfirmPreviousSave = async () => {
    const prevLead = (window as unknown as { __qa_prev_lead?: Lead })["__qa_prev_lead"];
    const prevCid = (window as unknown as { __qa_prev_cid?: string })["__qa_prev_cid"];
    setPreviousConfirmOpen(false);
    (window as unknown as { __qa_prev_lead?: Lead; __qa_prev_cid?: string })["__qa_prev_lead"] = undefined;
    (window as unknown as { __qa_prev_cid?: string })["__qa_prev_cid"] = undefined;
    if (!prevLead || !prevCid) return;
    await handleDrawerSave(false);
    openLeadDrawer(prevLead, prevCid);
  };

  const leadStatusColors: Record<string, string> = {
    new: "default",
    contacted: "processing",
    interested: "green",
    followup: "gold",
    closed_won: "blue",
    closed_lost: "red",
  };

  const leadColumns = (campaignId: string, openDrawer: (lead: Lead) => void) => [
    { title: "Sr.", key: "sr", width: 56, render: (_: unknown, __: Lead, i: number) => i + 1 },
    { title: "Lead ID", dataIndex: "lead_id", key: "lead_id", width: 120, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Name", dataIndex: "name", key: "name", width: 130, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Company", dataIndex: "company_name", key: "company_name", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Email", dataIndex: "email", key: "email", width: 160, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Status", dataIndex: "status", key: "status", width: 100, render: (v: string) => <Tag color={leadStatusColors[v] ?? "default"}>{String(v).replace("_", " ")}</Tag> },
    { title: "QA status", dataIndex: "qa_status", key: "qa_status", width: 100, render: (v: string | null | undefined) => (v ? <Tag color={v === "qualified" ? "green" : v === "disqualified" ? "red" : "blue"}>{v}</Tag> : "—") },
    { title: "Follow-up", dataIndex: "followup_date", key: "followup_date", width: 100, render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—") },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_: unknown, record: Lead) => (
        <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openDrawer(record); }} />
      ),
    },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("qa") && !hasRole("admin")) {
    return null;
  }

  const list = filteredCampaigns();

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Campaign & Leads
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 4 }}>
          Click a lead row to edit. Agent status = pipeline; QA status = your review outcome.
        </Typography.Text>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search campaigns (name, lead type, industry, geography)"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 360 }}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchDashboard} loading={loading}>
          Refresh
        </Button>
      </Space>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : list.length === 0 ? (
        <Empty description="No campaigns" style={{ marginTop: 48 }} />
      ) : (
        <Collapse
          items={list.map((campaign) => ({
            key: campaign.id,
            label: (
              <span>
                <strong>{campaign.name}</strong>
                <Tag style={{ marginLeft: 8 }}>{campaign.leads?.length ?? 0} leads</Tag>
              </span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 16, padding: 16, background: "#fafafa", borderRadius: 8, border: "1px solid #f0f0f0" }}>
                  {(campaign.description || campaign.target_designation) && (
                    <>
                      {campaign.description && <DetailItem label="Description" value={campaign.description} />}
                      {campaign.target_designation && <DetailItem label="Target Designation" value={campaign.target_designation} />}
                      <div style={{ marginBottom: 16, borderBottom: "1px solid #f0f0f0" }} />
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
                      <DetailItem label="Industry" value={campaign.industry} />
                      <DetailItem label="Geography" value={campaign.geography} />
                    </Col>
                  </Row>
                  {(campaign.employee_size?.length || campaign.abm != null || campaign.seniority || campaign.job_function || campaign.creatives_url?.length) ? (
                    <>
                      <div style={{ marginTop: 16, marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#595959" }}>Targeting</div>
                      <Row gutter={24}>
                        <Col xs={24} sm={12}>
                          <DetailItem label="Employee Size" value={campaign.employee_size?.length ? campaign.employee_size.join(", ") : null} />
                          <DetailItem label="ABM" value={campaign.abm === true ? "Yes" : campaign.abm === false ? "No" : null} />
                          <DetailItem label="Seniority" value={campaign.seniority} />
                          <DetailItem label="Job Function" value={campaign.job_function} />
                        </Col>
                        <Col xs={24} sm={12}>
                          {campaign.creatives_url?.length ? (
                            <DetailItem
                              label="Creatives URL"
                              value={
                                <div>
                                  {campaign.creatives_url.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginBottom: 4 }}>{url}</a>
                                  ))}
                                </div>
                              }
                            />
                          ) : null}
                        </Col>
                      </Row>
                    </>
                  ) : null}
                  {campaign.additional_comments && (
                    <>
                      <div style={{ marginTop: 16, borderTop: "1px solid #f0f0f0" }} />
                      <DetailItem label="Additional Comments" value={campaign.additional_comments} />
                    </>
                  )}
                </div>
                <Table
                  size="small"
                  rowKey="id"
                  columns={leadColumns(campaign.id, (lead) => openLeadDrawer(lead, campaign.id))}
                  dataSource={campaign.leads ?? []}
                  pagination={{ pageSize: 10, showTotal: (t) => `Total ${t} leads` }}
                  onRow={(record) => ({
                    onClick: () => openLeadDrawer(record, campaign.id),
                    style: { cursor: "pointer" },
                  })}
                />
              </>
            ),
          }))}
        />
      )}

      <Drawer
        title="Edit Lead"
        placement="right"
        width="50%"
        open={drawerOpen}
        onClose={closeLeadDrawer}
        destroyOnClose={false}
        styles={{ body: { paddingBottom: 100 } }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              icon={<LeftOutlined />}
              onClick={handlePreviousLead}
              disabled={!getDrawerLeadContext().prevLead}
            >
              Previous
            </Button>
            <Space>
              <Button onClick={closeLeadDrawer}>Cancel</Button>
              <Button type="primary" icon={<SaveOutlined />} loading={savingDrawer} onClick={() => handleDrawerSave(false)}>
                Save
              </Button>
              <Button type="primary" icon={<SaveOutlined />} loading={savingDrawer} onClick={() => handleDrawerSave(true)}>
                Save and Continue
              </Button>
            </Space>
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
                <Select placeholder="Select" options={JOB_FUNCTION_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Job Level" name="job_level">
                <Select placeholder="Select" options={JOB_LEVEL_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Email" name="email">
                <Input type="email" placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="Phone" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Direct Number" name="direct_number">
                <Input placeholder="Direct number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Industry" name="industry">
                <Input placeholder="Industry" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Company Number" name="company_number">
                <Input placeholder="Company number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Employee Size" name="employee_size">
                <Select placeholder="Select" options={EMPLOYEE_SIZE_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Address" name="address">
                <Input placeholder="Address" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="City" name="city">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="State" name="state">
                <Input placeholder="State" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Country" name="country">
                <Input placeholder="Country" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Zip / Postal" name="zip_code">
                <Input placeholder="Zip" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Founded Year" name="founded_years">
                <Input placeholder="e.g. 2010" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label="Founded Year Link" name="founded_years_link">
                <Input placeholder="URL" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Revenue Range" name="revenue_range">
                <Input placeholder="e.g. $1M - $5M" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label="Revenue Link" name="revenue_link">
                <Input placeholder="URL" />
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
                <Select placeholder="Select" options={DISPOSITION_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Status" name="status">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Follow-up Date" name="followup_date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 24, padding: 16, background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
            <Typography.Text strong style={{ display: "block", marginBottom: 12, fontSize: 13 }}>QA review</Typography.Text>
            <Form.Item name="qa_status" label="QA status">
              <Select placeholder="Select QA status" options={QA_STATUS_OPTIONS} allowClear />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.qa_status !== curr.qa_status}>
              {({ getFieldValue }) =>
                getFieldValue("qa_status") === "disqualified" ? (
                  <>
                    <Form.Item name="disqualification_reasons" label="Disqualification reasons (multi-select)">
                      <Select mode="multiple" placeholder="Select reasons" options={DISQUALIFICATION_REASONS_OPTIONS} allowClear />
                    </Form.Item>
                    <Form.Item name="disqualification_reason" label="Disqualification reason (optional text)">
                      <Input.TextArea rows={2} placeholder="Additional details" />
                    </Form.Item>
                  </>
                ) : null
              }
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.qa_status !== curr.qa_status}>
              {({ getFieldValue }) =>
                getFieldValue("qa_status") === "rectified" ? (
                  <Form.Item name="rectified_reason" label="Rectified reason">
                    <Input.TextArea rows={2} placeholder="Reason for rectification" />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </div>

          <Form.Item label="Notes" name="notes" style={{ marginTop: 16 }}>
            <Input.TextArea rows={3} placeholder="Notes" />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title="Save & go to previous?"
        open={previousConfirmOpen}
        onCancel={() => {
          setPreviousConfirmOpen(false);
          (window as unknown as { __qa_prev_lead?: Lead; __qa_prev_cid?: string })["__qa_prev_lead"] = undefined;
          (window as unknown as { __qa_prev_cid?: string })["__qa_prev_cid"] = undefined;
        }}
        onOk={handleConfirmPreviousSave}
        okText="Save & Previous"
      >
        You have unsaved changes. Save and open the previous lead?
      </Modal>
    </div>
  );
}
