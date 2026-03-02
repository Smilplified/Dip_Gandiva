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
  Modal,
} from "antd";
import {
  ReloadOutlined,
  EditOutlined,
  LeftOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { LeadForm } from "@/components/Leads/LeadForm";
import { getLeadTableColumns } from "@/components/Leads/LeadTableColumns";
import { buildLeadPayload, leadToFormValues } from "@/lib/leadPayload";
import type { Lead } from "@/types/lead.types";

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

type CampaignWithLeads = Campaign & { leads: Lead[] };

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
  const canEditQaAudit = hasRole("qa") || hasRole("admin");
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
    form.setFieldsValue(leadToFormValues(lead as unknown as Record<string, unknown>));
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
      const payload = { ...buildLeadPayload(values), id: drawerLead.id };
      const res = await fetch(`/api/tl/campaigns/${drawerCampaignId}/leads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
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

  const leadColumns = (campaignId: string, openDrawer: (lead: Lead) => void) =>
    getLeadTableColumns({
      showActions: true,
      onEdit: openDrawer,
    });

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
                  className="table-single-line"
                  size="small"
                  rowKey="id"
                  columns={leadColumns(campaign.id, (lead) => openLeadDrawer(lead, campaign.id))}
                  dataSource={campaign.leads ?? []}
                  scroll={{ x: 2600 }}
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
        <LeadForm
          form={form}
          mode="edit"
          lead={drawerLead ?? undefined}
          canEditQaAudit={canEditQaAudit}
        />
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
