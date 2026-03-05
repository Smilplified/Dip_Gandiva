"use client";

import React, { useState, useEffect, useRef } from "react";
import { Form, Input, Select, DatePicker, Row, Col, Collapse, Typography, Button, Spin, message } from "antd";
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  STATUS_OPTIONS,
  QA_STATUS_OPTIONS,
  LEAD_TAGGING_OPTIONS,
  SALUTATION_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  JOB_LEVEL_OPTIONS,
  EMPLOYEE_SIZE_OPTIONS,
  QA_AUDIT_DISQUALIFICATION_OPTIONS,
} from "@/types/lead.types";
import type { Lead } from "@/types/lead.types";

type LeadFormProps = {
  form: ReturnType<typeof Form.useForm>[0];
  mode: "create" | "edit";
  lead?: Lead | null;
  canEditQaAudit?: boolean;
};

export function LeadForm({
  form,
  mode,
  lead,
  canEditQaAudit = false,
}: LeadFormProps) {
  const [showMoreCq, setShowMoreCq] = useState(false);
  const [voiceRecordings, setVoiceRecordings] = useState<
    { id: string; name: string; path: string; url: string | null }[]
  >([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (lead && (lead.cq3 || lead.cq4 || lead.cq5)) {
      setShowMoreCq(true);
    }
  }, [lead]);

  useEffect(() => {
    const loadVoiceRecordings = async () => {
      if (!lead?.id || mode !== "edit") {
        setVoiceRecordings([]);
        return;
      }
      setVoiceLoading(true);
      try {
        const res = await fetch(`/api/agent/leads/${lead.id}/voice-lock`, {
          credentials: "include",
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json?.error) {
            message.warning(`Voice Lock: ${json.error}`);
          }
          return;
        }
        const json = await res.json();
        setVoiceRecordings(
          (json?.recordings ?? []).map((r: any) => ({
            id: r.id ?? r.path,
            name: r.name,
            path: r.path,
            url: r.url ?? null,
          })),
        );
      } catch (err) {
        console.error("Failed to load voice recordings", err);
      } finally {
        setVoiceLoading(false);
      }
    };

    loadVoiceRecordings();
  }, [lead?.id, mode]);

  const handleUploadVoice = async (file: File | null) => {
    if (!lead?.id || mode !== "edit" || !file) {
      message.error("Voice Lock upload is only available while editing an existing lead.");
      return;
    }
    setVoiceUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/agent/leads/${lead.id}/voice-lock`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(json?.error || "Failed to upload recording");
        return;
      }
      setVoiceRecordings(
        (json?.recordings ?? []).map((r: any) => ({
          id: r.id ?? r.path,
          name: r.name,
          path: r.path,
          url: r.url ?? null,
        })),
      );
      message.success("Recording uploaded");
    } catch (err) {
      console.error("Voice upload error", err);
      message.error("Failed to upload recording");
    } finally {
      setVoiceUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteVoice = async (path: string) => {
    if (!lead?.id || mode !== "edit" || !path) return;
    try {
      const res = await fetch(`/api/agent/leads/${lead.id}/voice-lock`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(json?.error || "Failed to delete recording");
        return;
      }
      setVoiceRecordings(
        (json?.recordings ?? []).map((r: any) => ({
          id: r.id ?? r.path,
          name: r.name,
          path: r.path,
          url: r.url ?? null,
        })),
      );
      message.success("Recording deleted");
    } catch (err) {
      console.error("Voice delete error", err);
      message.error("Failed to delete recording");
    }
  };

  const firstName = Form.useWatch("first_name", form);
  const lastName = Form.useWatch("last_name", form);
  const email = Form.useWatch("email", form);
  const companyName = Form.useWatch("company_name", form);
  const domain = Form.useWatch("domain", form);

  const hasIdentityFields =
    typeof firstName === "string" &&
    firstName.trim().length > 0 &&
    typeof lastName === "string" &&
    lastName.trim().length > 0 &&
    typeof email === "string" &&
    email.trim().length > 0 &&
    typeof companyName === "string" &&
    companyName.trim().length > 0 &&
    typeof domain === "string" &&
    domain.trim().length > 0;

  const hasLeadId = !!lead?.id;
  const canUseVoiceLock = hasLeadId && hasIdentityFields;

  const renderSection = (
    key: string,
    title: string,
    icon: string,
    children: React.ReactNode
  ) => (
    <Collapse.Panel
      key={key}
      header={
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {icon} {title}
        </span>
      }
    >
      {children}
    </Collapse.Panel>
  );

  return (
    <Form form={form} layout="vertical">
      {/* Contact Person Details | Company Information — side by side */}
      <Row gutter={24} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Collapse defaultActiveKey={["contact"]} expandIconPosition="end">
            {renderSection(
              "contact",
              "Contact Person Details",
              "👤",
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Salutation" name="salutation">
                    <Select placeholder="Select" options={SALUTATION_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="First Name" name="first_name">
                    <Input placeholder="First name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Last Name" name="last_name">
                    <Input placeholder="Last name" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Email Address" name="email">
                    <Input placeholder="email@example.com" type="email" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Phone Number" name="phone">
                    <Input placeholder="+1 555 123 4567" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Direct Number" name="direct_number">
                    <Input placeholder="+1 555 987 6543" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Job Title" name="job_title">
                    <Input placeholder="Job title" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Job Title Level" name="job_level">
                    <Select placeholder="Select" options={JOB_LEVEL_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Department" name="department">
                    <Input placeholder="Department" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Job Function" name="job_function">
                    <Select placeholder="Select" options={JOB_FUNCTION_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Job Title Link" name="job_title_link">
                    <Input placeholder="URL" />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Collapse>
          {/* Custom Questions — bottom of Contact column */}
          <Collapse defaultActiveKey={["compliance"]} expandIconPosition="end" style={{ marginTop: 16 }}>
            {renderSection(
              "compliance",
              "Custom Questions",
              "✅",
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Lead Status" name="status" initialValue="new">
                    <Select options={STATUS_OPTIONS} placeholder="Pipeline status" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Call Back" name="call_back">
                    <Input placeholder="Call Back" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Call Notes" name="call_notes">
                    <Input.TextArea rows={2} placeholder="Call Notes" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="CQ1" name="cq1">
                    <Input placeholder="CQ1" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="CQ2" name="cq2">
                    <Input placeholder="CQ2" />
                  </Form.Item>
                </Col>
                {showMoreCq && (
                  <>
                    <Col xs={24} sm={12}>
                      <Form.Item label="CQ3" name="cq3">
                        <Input placeholder="CQ3" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="CQ4" name="cq4">
                        <Input placeholder="CQ4" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="CQ5" name="cq5">
                        <Input placeholder="CQ5" />
                      </Form.Item>
                    </Col>
                  </>
                )}
                <Col xs={24}>
                  {!showMoreCq && (
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => setShowMoreCq(true)}
                      style={{ width: "100%" }}
                    >
                      Click to add more
                    </Button>
                  )}
                </Col>
              </Row>
            )}
          </Collapse>
          <Collapse defaultActiveKey={["voice-lock"]} expandIconPosition="end" style={{ marginTop: 16 }}>
            {renderSection(
              "voice-lock",
              "Voice Lock",
              "🎧",
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {!canUseVoiceLock ? (
                  !hasLeadId ? (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      Voice Lock will be available after you create this lead and fill First Name, Last Name, Email Address, Company Name, and Domain.
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      To use Voice Lock, please fill First Name, Last Name, Email Address, Company Name, and Domain for this lead.
                    </Typography.Text>
                  )
                ) : (
                  <>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      Upload up to 4 call recordings for this lead. Use the play and delete icons on each recording.
                    </Typography.Text>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) {
                          handleUploadVoice(file);
                        }
                      }}
                    />
                    <Row gutter={[12, 12]}>
                      {voiceRecordings.map((rec) => (
                        <Col key={rec.id} xs={24} sm={12}>
                          <div
                            style={{
                              border: "1px solid #f0f0f0",
                              borderRadius: 8,
                              padding: 10,
                              background: "#fafafa",
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  minWidth: 0,
                                }}
                              >
                                <PlayCircleOutlined style={{ color: "#1677ff" }} />
                                <Typography.Text
                                  style={{
                                    fontSize: 13,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: 160,
                                  }}
                                >
                                  {rec.name}
                                </Typography.Text>
                              </span>
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteVoice(rec.path)}
                              />
                            </div>
                            {rec.url ? (
                              <audio
                                controls
                                src={rec.url}
                                style={{ width: "100%" }}
                              />
                            ) : (
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                Preview unavailable for this recording.
                              </Typography.Text>
                            )}
                          </div>
                        </Col>
                      ))}
                      {voiceRecordings.length < 4 && (
                        <Col xs={24} sm={12}>
                          <Button
                            type="dashed"
                            style={{ width: "100%", height: 80 }}
                            icon={<PlusOutlined />}
                            onClick={() => fileInputRef.current?.click()}
                            loading={voiceUploading}
                          >
                            Add call recording
                          </Button>
                        </Col>
                      )}
                    </Row>
                    {voiceLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Spin size="small" />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Loading recordings...
                        </Typography.Text>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Collapse>
          {/* QA Audit & Status — bottom of Contact column */}
          <Collapse defaultActiveKey={["audit"]} expandIconPosition="end" style={{ marginTop: 16 }}>
            {renderSection(
              "audit",
              "QA Audit & Status",
              "📋",
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Asset Title" name="asset_title">
                    <Input placeholder="Asset Title" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Status" name="qa_status">
                    <Select
                      placeholder="Select QA Status"
                      options={QA_STATUS_OPTIONS}
                      allowClear
                      disabled={!canEditQaAudit}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Audit Date" name="audit_date">
                    <DatePicker style={{ width: "100%" }} disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="QA Name"
                    tooltip="Auto-filled when QA adds or edits lead status"
                  >
                    <Input
                      placeholder="—"
                      value={lead?.qa_name ?? ""}
                      disabled
                      style={{ color: "rgba(0,0,0,0.65)", backgroundColor: "#fafafa" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Tenurity" name="tenurity">
                    <Input placeholder="Tenurity" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="VV Status" name="vv_status">
                    <Input placeholder="VV Status" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Email Status" name="email_status">
                    <Input placeholder="Email Status" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="EV Tool" name="ev_tool">
                    <Input placeholder="EV Tool" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Primary Reason" name="primary_reason">
                    <Input placeholder="Primary Reason" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Secondary Reason" name="secondary_reason">
                    <Input placeholder="Secondary Reason" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="QA Comments" name="qa_comments">
                    <Input.TextArea rows={3} placeholder="QA Comments" disabled={!canEditQaAudit} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.qa_status !== curr.qa_status}>
                    {({ getFieldValue }) =>
                      getFieldValue("qa_status") === "disqualified" ? (
                        <Row gutter={16}>
                          <Col xs={24}>
                            <Form.Item
                              name="disqualification_reasons"
                              label="Disqualification Reasons"
                            >
                              <Select
                                mode="multiple"
                                placeholder="Select reasons"
                                options={QA_AUDIT_DISQUALIFICATION_OPTIONS}
                                allowClear
                                disabled={!canEditQaAudit}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24}>
                            <Form.Item
                              name="disqualification_reason"
                              label="Disqualification Reason"
                            >
                              <Input.TextArea rows={3} placeholder="Disqualification Reason" disabled={!canEditQaAudit} />
                            </Form.Item>
                          </Col>
                        </Row>
                      ) : null
                    }
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.qa_status !== curr.qa_status}>
                    {({ getFieldValue }) =>
                      getFieldValue("qa_status") === "rectified" ? (
                        <Form.Item name="rectified_reason" label="Rectified Reason">
                          <Input.TextArea rows={3} placeholder="Rectified Reason" disabled={!canEditQaAudit} />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Collapse>
        </Col>
        <Col xs={24} md={12}>
          <Collapse defaultActiveKey={["company"]} expandIconPosition="end">
            {renderSection(
              "company",
              "Company Information",
              "🏢",
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Company Name" name="company_name">
                    <Input placeholder="Company name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Domain" name="domain">
                    <Input placeholder="example.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Corporate Number" name="company_number">
                    <Input placeholder="Company phone" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Phone Number Link" name="phone_number_link">
                    <Input placeholder="URL" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Address Line 1" name="address">
                    <Input placeholder="Street address" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="City" name="city">
                    <Input placeholder="City" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="State" name="state">
                    <Input placeholder="State / Region" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Country" name="country">
                    <Input placeholder="Country" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Zip / Postal Code" name="zip_code">
                    <Input placeholder="Zip / Postal code" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Employee Size" name="employee_size">
                    <Select placeholder="Select" options={EMPLOYEE_SIZE_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="See All Employees" name="see_all_employees">
                    <Input placeholder="See All Employees" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Industry Type" name="industry">
                    <Input placeholder="Industry" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Employee Size Link" name="employee_size_link">
                    <Input placeholder="URL" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Company Website Link" name="company_website_link">
                    <Input placeholder="https://company.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Founded Year" name="founded_years">
                    <Input placeholder="e.g. 2010" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Founded Year Link" name="founded_years_link">
                    <Input placeholder="URL" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Revenue Size" name="revenue_range">
                    <Input placeholder="e.g. $1M - $5M" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Revenue Link" name="revenue_link">
                    <Input placeholder="URL" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="SIC Code" name="sic_code">
                    <Input placeholder="SIC Code" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="SIC Code Link" name="sic_code_link">
                    <Input placeholder="URL" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="NAICS Code" name="naics_code">
                    <Input placeholder="NAICS Code" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="NAICS Code Link" name="naics_code_link">
                    <Input placeholder="URL" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Company LinkedIn URL" name="company_linkedin_url">
                    <Input placeholder="https://linkedin.com/company/..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Scored" name="scored">
                    <DatePicker showTime style={{ width: "100%" }} format="YYYY-MM-DD HH:mm" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Appointment" name="appointment">
                    <DatePicker showTime style={{ width: "100%" }} format="YYYY-MM-DD HH:mm" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Lead Tagging" name="lead_tagging">
                    <Select placeholder="Select tag" options={LEAD_TAGGING_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="RA Comment" name="ra_comment">
                    <Input.TextArea rows={2} placeholder="RA Comment" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Special Comments" name="special_comments">
                    <Input.TextArea rows={2} placeholder="Special Comments" />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Collapse>
        </Col>
      </Row>

      <Form.Item label="Notes" name="notes" style={{ marginTop: 24 }}>
        <Input.TextArea rows={3} placeholder="Notes, context, objections..." />
      </Form.Item>
    </Form>
  );
}
