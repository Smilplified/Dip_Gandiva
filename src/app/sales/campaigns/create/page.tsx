"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Form, Input, DatePicker, Select, Button, Steps, message, InputNumber } from "antd";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

const { TextArea } = Input;

const DEFAULT_LEAD_TYPES = [
  { value: "B2B", label: "B2B" },
  { value: "B2C", label: "B2C" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "SMB", label: "SMB" },
  { value: "Other", label: "Other" },
];

export default function SalesCreateCampaignPage() {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leadTypeOptions, setLeadTypeOptions] = useState(DEFAULT_LEAD_TYPES);
  const [teamLeaders, setTeamLeaders] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("sales") && !hasRole("admin")) return;
    fetch("/api/tl/team-leaders", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          message.warning("Could not load Team Leaders: " + (data.error || "Unknown error"));
          return;
        }
        setTeamLeaders(data.team_leaders ?? []);
      })
      .catch(() => message.warning("Could not load Team Leaders"));
  }, [isInitialized, hasRole]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("sales") && !hasRole("admin")) {
      router.replace("/no-access");
      return;
    }
  }, [isInitialized, hasRole, router]);

  const steps = [
    { title: "Client & Campaign" },
    { title: "Dates & Lead" },
    { title: "Metrics" },
    { title: "Details" },
  ];

  const next = async () => {
    try {
      if (current === 0) {
        await form.validateFields(["client_name", "name", "lead_type"]);
      } else if (current === 1) {
        await form.validateFields(["start_date", "end_date", "status"]);
      } else if (current === 2) {
        // Metrics step - no required fields
      }
      setCurrent((c) => c + 1);
    } catch {
      // validation failed
    }
  };

  const prev = () => setCurrent((c) => c - 1);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const res = await fetch("/api/tl/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          client_name: values.client_name,
          name: values.name,
          lead_type: Array.isArray(values.lead_type) ? values.lead_type[0] : values.lead_type,
          start_date: values.start_date?.format?.("YYYY-MM-DD") ?? null,
          end_date: values.end_date?.format?.("YYYY-MM-DD") ?? null,
          status: values.status ?? "draft",
          cpl: values.cpl,
          revenue: values.revenue,
          booked: values.booked,
          total_allocation: values.total_allocation,
          post_qa: values.post_qa,
          achieved: values.achieved,
          pending_allocation: values.pending_allocation,
          region: values.region,
          weekly_call: values.weekly_call,
          weekly_report: values.weekly_report,
          additional_comments: values.additional_comments,
          assigned_team_leader_id: values.assigned_team_leader_id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      message.success("Campaign created");
      router.replace(`/sales/campaigns/${data.campaign_id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Card title="Create Campaign">
        <Steps current={current} items={steps} style={{ marginBottom: 24 }} />

        <Form form={form} layout="vertical">
          <div style={{ display: current === 0 ? "block" : "none" }}>
            <Form.Item name="client_name" label="Client Name" rules={[{ required: true, message: "Client Name is required" }]}>
              <Input placeholder="Enter client name" />
            </Form.Item>
            <Form.Item name="name" label="Campaign Name" rules={[{ required: true, message: "Campaign Name is required" }]}>
              <Input placeholder="Enter campaign name" />
            </Form.Item>
            <Form.Item
              name="lead_type"
              label="Lead Type"
              getValueFromEvent={(vals) => {
                const v = Array.isArray(vals) && vals.length ? vals[vals.length - 1] : undefined;
                if (v && !leadTypeOptions.some((o) => o.value === v)) {
                  setLeadTypeOptions((prev) => [...prev, { value: v, label: v }]);
                }
                return v;
              }}
              getValueProps={(v) => ({ value: v ? [v] : [] })}
            >
              <Select
                mode="tags"
                maxTagCount={1}
                placeholder="Select or type new lead type and press Enter"
                allowClear
                options={leadTypeOptions}
                tokenSeparators={[","]}
              />
            </Form.Item>
          </div>

          <div style={{ display: current === 1 ? "block" : "none" }}>
            <Form.Item name="start_date" label="Start Date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="end_date" label="End Date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="draft" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "active", label: "Active" },
                  { value: "paused", label: "Paused" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </Form.Item>
          </div>

          <div style={{ display: current === 2 ? "block" : "none" }}>
            <Form.Item name="cpl" label="CPL (Cost Per Lead)">
              <InputNumber style={{ width: "100%" }} placeholder="e.g. 25.00" min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="revenue" label="Revenue">
              <InputNumber style={{ width: "100%" }} placeholder="e.g. 10000" min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="booked" label="Booked">
              <InputNumber style={{ width: "100%" }} placeholder="e.g. 5000" min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="total_allocation" label="Total Allocation">
              <InputNumber style={{ width: "100%" }} placeholder="e.g. 1000" min={0} precision={0} />
            </Form.Item>
            <Form.Item name="post_qa" label="Post QA">
              <InputNumber style={{ width: "100%" }} placeholder="e.g. 800" min={0} precision={0} />
            </Form.Item>
            <Form.Item name="achieved" label="Achieved">
              <InputNumber style={{ width: "100%" }} placeholder="e.g. 750" min={0} precision={0} />
            </Form.Item>
            <Form.Item name="pending_allocation" label="Pending Allocation">
              <InputNumber style={{ width: "100%" }} placeholder="e.g. 250" min={0} precision={0} />
            </Form.Item>
          </div>

          <div style={{ display: current === 3 ? "block" : "none" }}>
            <Form.Item name="assigned_team_leader_id" label="Assign Team Leader">
              <Select
                placeholder="Select Team Leader"
                allowClear
                showSearch
                optionFilterProp="label"
                options={teamLeaders.map((tl) => ({
                  value: tl.id,
                  label: tl.full_name || tl.email || tl.id,
                }))}
                notFoundContent={teamLeaders.length === 0 ? "No Team Leaders found" : undefined}
              />
            </Form.Item>
            <Form.Item name="region" label="Region">
              <Input placeholder="e.g. North America, APAC, EMEA" />
            </Form.Item>
            <Form.Item name="weekly_call" label="Weekly Call">
              <Input placeholder="e.g. Monday 10:00 AM" />
            </Form.Item>
            <Form.Item name="weekly_report" label="Weekly Report">
              <Input placeholder="e.g. Friday EOD" />
            </Form.Item>
            <Form.Item name="additional_comments" label="Additional Comments">
              <TextArea rows={4} placeholder="Any additional notes or comments" />
            </Form.Item>
          </div>
        </Form>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
          <Button onClick={prev} disabled={current === 0}>
            Previous
          </Button>
          {current < steps.length - 1 ? (
            <Button type="primary" onClick={next}>
              Next
            </Button>
          ) : (
            <Button type="primary" loading={loading} onClick={submit}>
              Create Campaign
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
