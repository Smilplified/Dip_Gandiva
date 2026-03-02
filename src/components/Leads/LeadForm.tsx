"use client";

import React, { useState, useEffect } from "react";
import { Form, Input, Select, DatePicker, Row, Col, Collapse, Typography, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  STATUS_OPTIONS,
  QA_STATUS_OPTIONS,
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

  useEffect(() => {
    if (lead && (lead.cq3 || lead.cq4 || lead.cq5)) {
      setShowMoreCq(true);
    }
  }, [lead]);

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
      <Collapse defaultActiveKey={["contact", "company"]} expandIconPosition="end">
        {renderSection(
          "contact",
          "Contact Person Details",
          "👤",
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="Salutation" name="salutation">
                <Select placeholder="Select" options={SALUTATION_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="First Name" name="first_name">
                <Input placeholder="First name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Last Name" name="last_name">
                <Input placeholder="Last name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Email Address" name="email">
                <Input placeholder="email@example.com" type="email" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Phone Number" name="phone">
                <Input placeholder="+1 555 123 4567" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Direct Number" name="direct_number">
                <Input placeholder="+1 555 987 6543" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Job Title" name="job_title">
                <Input placeholder="Job title" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Job Title Level" name="job_level">
                <Select placeholder="Select" options={JOB_LEVEL_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Department" name="department">
                <Input placeholder="Department" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Job Function" name="job_function">
                <Select placeholder="Select" options={JOB_FUNCTION_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Job Title Link" name="job_title_link">
                <Input placeholder="URL" />
              </Form.Item>
            </Col>
          </Row>
        )}

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
            <Col xs={24} sm={8}>
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
              <Form.Item label="Employee Size" name="employee_size">
                <Select placeholder="Select" options={EMPLOYEE_SIZE_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="See All Employees" name="see_all_employees">
                <Input placeholder="See All Employees" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
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
              <Form.Item label="Revenue Size" name="revenue_range">
                <Input placeholder="e.g. $1M - $5M" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label="Revenue Link" name="revenue_link">
                <Input placeholder="URL" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="SIC Code" name="sic_code">
                <Input placeholder="SIC Code" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label="SIC Code Link" name="sic_code_link">
                <Input placeholder="URL" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="NAICS Code" name="naics_code">
                <Input placeholder="NAICS Code" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label="NAICS Code Link" name="naics_code_link">
                <Input placeholder="URL" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Company LinkedIn URL" name="company_linkedin_url">
                <Input placeholder="https://linkedin.com/company/..." />
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
            <Col xs={24} sm={12}>
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

        {renderSection(
          "audit",
          "QA Audit & Status",
          "📋",
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="Asset Title" name="asset_title">
                <Input placeholder="Asset Title" disabled={!canEditQaAudit} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Status" name="qa_status">
                <Select
                  placeholder="Select QA Status"
                  options={QA_STATUS_OPTIONS}
                  allowClear
                  disabled={!canEditQaAudit}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Audit Date" name="audit_date">
                <DatePicker style={{ width: "100%" }} disabled={!canEditQaAudit} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
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
            <Col xs={24} sm={8}>
              <Form.Item label="Tenurity" name="tenurity">
                <Input placeholder="Tenurity" disabled={!canEditQaAudit} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="VV Status" name="vv_status">
                <Input placeholder="VV Status" disabled={!canEditQaAudit} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Email Status" name="email_status">
                <Input placeholder="Email Status" disabled={!canEditQaAudit} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
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

      <Form.Item label="Notes" name="notes" style={{ marginTop: 24 }}>
        <Input.TextArea rows={3} placeholder="Notes, context, objections..." />
      </Form.Item>
    </Form>
  );
}
