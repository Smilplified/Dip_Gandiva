"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Form, Input, DatePicker, Radio, Button, Steps, message } from "antd";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

const { TextArea } = Input;

export default function CreateCampaignPage() {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("team_leader") && !hasRole("tl")) {
      router.replace("/no-access");
      return;
    }
  }, [isInitialized, hasRole, router]);

  const steps = [
    { title: "Basic Info" },
    { title: "Timeline" },
    { title: "Status" },
  ];

  const next = async () => {
    try {
      if (current === 0) {
        await form.validateFields(["name", "description", "industry", "geography", "target_designation"]);
      } else if (current === 1) {
        await form.validateFields(["start_date", "end_date"]);
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
          name: values.name,
          description: values.description,
          industry: values.industry,
          geography: values.geography,
          target_designation: values.target_designation,
          start_date: values.start_date?.format?.("YYYY-MM-DD") ?? null,
          end_date: values.end_date?.format?.("YYYY-MM-DD") ?? null,
          status: values.status ?? "draft",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      message.success("Campaign created");
      router.replace(`/tl/campaigns/${data.campaign_id}`);
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
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Card title="Create Campaign">
        <Steps current={current} items={steps} style={{ marginBottom: 24 }} />

        <Form form={form} layout="vertical">
          {current === 0 && (
            <>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input placeholder="Campaign name" />
              </Form.Item>
              <Form.Item name="description" label="Description">
                <TextArea rows={3} placeholder="Campaign description" />
              </Form.Item>
              <Form.Item name="industry" label="Industry">
                <Input placeholder="e.g. Technology, Healthcare" />
              </Form.Item>
              <Form.Item name="geography" label="Geography">
                <Input placeholder="e.g. North America, APAC" />
              </Form.Item>
              <Form.Item name="target_designation" label="Target Designation">
                <Input placeholder="e.g. CTO, Sales Manager" />
              </Form.Item>
            </>
          )}

          {current === 1 && (
            <>
              <Form.Item name="start_date" label="Start Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="end_date" label="End Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </>
          )}

          {current === 2 && (
            <Form.Item name="status" label="Status" initialValue="draft">
              <Radio.Group>
                <Radio value="draft">Draft</Radio>
                <Radio value="active">Active</Radio>
              </Radio.Group>
            </Form.Item>
          )}
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
