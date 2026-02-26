"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Collapse,
  Table,
  Tag,
  Select,
  message,
  Spin,
  Typography,
  Empty,
  Input,
  Tooltip,
  Drawer,
  Button,
  Row,
  Col,
  Form,
  DatePicker,
} from "antd";
import {
  TeamOutlined,
  ReloadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";

type Lead = {
  id: string;
  lead_id: string | null;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  qa_status: string | null;
  followup_date: string | null;
  notes: string | null;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  campaign_id?: string;
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

type CampaignWithLeads = {
  id: string;
  campaign_id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  industry: string | null;
  geography: string | null;
  lead_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  leads: Lead[];
};

// Agent/Sales pipeline status (used by agents)
const AGENT_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "followup", label: "Follow-up" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

// QA review status (used by QA team only)
const QA_STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "needs_changes", label: "Needs changes" },
];

const AGENT_STATUS_COLORS: Record<string, string> = {
  new: "default",
  contacted: "blue",
  interested: "cyan",
  followup: "orange",
  closed_won: "green",
  closed_lost: "red",
};

const QA_STATUS_COLORS: Record<string, string> = {
  pending_review: "orange",
  approved: "green",
  rejected: "red",
  needs_changes: "gold",
};

const renderCell = (v: string | number | null | undefined) => (v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—");

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

export default function QADashboardPage() {
  const { hasRole, isInitialized } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithLeads[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerCampaignId, setDrawerCampaignId] = useState<string | null>(null);
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [form] = Form.useForm();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/qa/dashboard", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCampaigns(data.campaigns ?? []);
    } catch {
      message.error("Failed to load QA dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("qa") && !hasRole("admin")) return;
    fetchDashboard();
  }, [isInitialized, hasRole, fetchDashboard]);

  const openLeadDrawer = (lead: Lead, campaignId: string) => {
    setDrawerLead(lead);
    setDrawerCampaignId(campaignId);
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
      status: lead.status,
      qa_status: lead.qa_status ?? undefined,
      followup_date: lead.followup_date ? dayjs(lead.followup_date) : null,
      notes: lead.notes ?? undefined,
    });
    setDrawerOpen(true);
  };

  const closeLeadDrawer = () => {
    setDrawerOpen(false);
    setDrawerLead(null);
    setDrawerCampaignId(null);
    form.resetFields();
  };

  const handleDrawerSave = async () => {
    if (!drawerCampaignId || !drawerLead) return;
    try {
      const values = await form.validateFields();
      setSavingDrawer(true);
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
          qa_status: values.qa_status && String(values.qa_status).trim() ? values.qa_status : null,
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      message.success("Lead updated");
      const updatedLead: Partial<Lead> = {
        name: values.name ?? null,
        company_name: values.company_name ?? null,
        phone: values.phone ?? null,
        email: values.email ?? null,
        city: values.city ?? null,
        status: values.status ?? "new",
        qa_status: values.qa_status && String(values.qa_status).trim() ? values.qa_status : null,
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
      };
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === drawerCampaignId
            ? {
                ...c,
                leads: c.leads.map((l) =>
                  l.id === drawerLead.id ? { ...l, ...updatedLead } : l
                ),
              }
            : c
        )
      );
      closeLeadDrawer();
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setSavingDrawer(false);
    }
  };

  const filteredCampaigns = search.trim()
    ? campaigns.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.leads.some(
            (l) =>
              l.name?.toLowerCase().includes(search.toLowerCase()) ||
              l.company_name?.toLowerCase().includes(search.toLowerCase()) ||
              l.email?.toLowerCase().includes(search.toLowerCase())
          )
      )
    : campaigns;

  const leadColumns = (campaignId: string) => [
    { title: "Sr. No.", key: "sr", width: 72, fixed: "left" as const, render: (_: unknown, __: Lead, index: number) => index + 1 },
    { title: "Lead ID", dataIndex: "lead_id", key: "lead_id", width: 140, ellipsis: true, render: (v: string | null) => renderCell(v) },
    { title: "Name", dataIndex: "name", key: "name", width: 140, ellipsis: true, render: (v: string | null) => renderCell(v) },
    { title: "Company", dataIndex: "company_name", key: "company_name", width: 160, ellipsis: true, render: (v: string | null) => renderCell(v) },
    { title: "Job Title", dataIndex: "job_title", key: "job_title", width: 140, ellipsis: true, render: (v: string | null) => renderCell(v) },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 120, render: (v: string | null) => renderCell(v) },
    { title: "Email", dataIndex: "email", key: "email", width: 180, ellipsis: true, render: (v: string | null) => renderCell(v) },
    { title: "Agent status", dataIndex: "status", key: "status", width: 120, render: (v: string) => <Tag color={AGENT_STATUS_COLORS[v] ?? "default"} style={{ textTransform: "capitalize" }}>{v?.replace("_", " ")}</Tag> },
    { title: "QA status", dataIndex: "qa_status", key: "qa_status", width: 120, render: (v: string | null) => (v ? <Tag color={QA_STATUS_COLORS[v] ?? "default"}>{v?.replace(/_/g, " ")}</Tag> : "—") },
    { title: "Lead Disposition", dataIndex: "lead_disposition", key: "lead_disposition", width: 130, ellipsis: true, render: (v: string | null) => renderCell(v) },
    { title: "Created By", dataIndex: "created_by_name", key: "created_by_name", width: 130, ellipsis: true, render: (v: string | null) => renderCell(v) },
    { title: "Created", dataIndex: "created_at", key: "created_at", width: 120, render: (v: string) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—") },
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
            openLeadDrawer(record, campaignId);
          }}
        />
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

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 600 }}>
            QA Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            Review and edit leads. Agent status = pipeline status set by agents; QA status = review outcome set by QA.
          </Typography.Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Input.Search
            placeholder="Search campaigns or leads..."
            allowClear
            onSearch={setSearch}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <Tooltip title="Refresh">
            <span
              onClick={loading ? undefined : fetchDashboard}
              style={{
                cursor: loading ? "not-allowed" : "pointer",
                color: "#1677ff",
                fontSize: 18,
              }}
            >
              <ReloadOutlined spin={loading} />
            </span>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <Empty
            description={
              search.trim()
                ? "No campaigns or leads match your search"
                : "No campaigns yet. Leads will appear here once campaigns and leads exist."
            }
          />
        </Card>
      ) : (
        <Collapse
          defaultActiveKey={filteredCampaigns.length === 1 ? [filteredCampaigns[0].id] : undefined}
          style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0" }}
          items={filteredCampaigns.map((campaign) => {
            const leadCount = campaign.leads.length;
            return {
              key: campaign.id,
              label: (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    paddingRight: 24,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {campaign.name || "Unnamed campaign"}
                    </span>
                    {campaign.client_name && (
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {campaign.client_name}
                      </Typography.Text>
                    )}
                    <Tag color={AGENT_STATUS_COLORS[campaign.status] || "default"}>
                      {campaign.status}
                    </Tag>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#8c8c8c", fontSize: 13 }}>
                      <TeamOutlined />
                      {leadCount} lead{leadCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ),
              children: (
                <div style={{ padding: "8px 0" }}>
                  {campaign.leads.length === 0 ? (
                    <Empty description="No leads in this campaign" style={{ margin: "24px 0" }} />
                  ) : (
                    <Table
                      size="small"
                      rowKey="id"
                      scroll={{ x: 1400 }}
                      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} leads` }}
                      dataSource={campaign.leads}
                      columns={leadColumns(campaign.id)}
                      locale={{ emptyText: "No leads yet" }}
                      onRow={(record) => ({
                        onClick: () => openLeadDrawer(record, campaign.id),
                        style: { cursor: "pointer" },
                      })}
                    />
                  )}
                </div>
              ),
            };
          })}
        />
      )}

      <Drawer
        title="Edit Lead"
        placement="right"
        width="50%"
        open={drawerOpen}
        onClose={closeLeadDrawer}
        destroyOnClose
        styles={{ body: { paddingBottom: 100 } }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button onClick={closeLeadDrawer}>Cancel</Button>
            <Button type="primary" loading={savingDrawer} onClick={handleDrawerSave}>
              Save changes
            </Button>
          </div>
        }
      >
        {drawerLead && (
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
                  <Input placeholder="Company phone" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Employee Size" name="employee_size">
                  <Select placeholder="Select" options={EMPLOYEE_SIZE_OPTIONS} allowClear />
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
                  <Input placeholder="Zip code" />
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
                <Form.Item label="Agent status" name="status" tooltip="Pipeline status (set by agents)">
                  <Select options={AGENT_STATUS_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="QA status" name="qa_status" tooltip="QA review outcome">
                  <Select placeholder="Select QA status" options={QA_STATUS_OPTIONS} allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Follow-up Date" name="followup_date">
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Notes" name="notes">
              <Input.TextArea rows={3} placeholder="Notes..." />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </div>
  );
}
