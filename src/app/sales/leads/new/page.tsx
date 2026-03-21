"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Form, Space, Typography, message } from "antd";
import { LeadFormFields } from "@/components/Sales/LeadFormFields";
import { buildSalesLeadPayload } from "@/lib/sales/leadFormPayload";

const { Title, Text } = Typography;

type Agent = { id: string; name: string; department: string | null };

export default function NewLeadPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  const watchedFirstName = Form.useWatch("first_name", form);
  const watchedLastName = Form.useWatch("last_name", form);
  const watchedCompany = Form.useWatch("company", form);
  const watchedWebsite = Form.useWatch("website", form);
  const watchedCountry = Form.useWatch("country", form);
  const watchedEmail = Form.useWatch("email", form);
  const watchedLifecycleStage = Form.useWatch("lead_score", form);

  const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const canSaveAndContinue =
    hasText(watchedFirstName) &&
    hasText(watchedLastName) &&
    hasText(watchedCompany) &&
    hasText(watchedWebsite) &&
    hasText(watchedCountry) &&
    hasText(watchedEmail) &&
    typeof watchedLifecycleStage === "string" &&
    watchedLifecycleStage.trim().length > 0;

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/sales/leads", { credentials: "include" });
      const j = await res.json();
      if (res.ok) setAgents(j.agents ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const submit = async (stay: boolean) => {
    try {
      const values = await form.validateFields();
      const payload = buildSalesLeadPayload(values as Record<string, unknown>);

      setLoading(true);
      const res = await fetch("/api/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create lead");
      message.success("Lead created");
      const newId = json.lead?.id as string | undefined;
      if (stay) {
        form.resetFields();
      } else if (newId) {
        router.push(`/sales/leads/${newId}`);
      } else {
        router.push("/sales/leads");
      }
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px 12px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <Space style={{ marginBottom: 20 }} wrap>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push("/sales/leads")}>
          Leads
        </Button>
      </Space>
      <Title level={2} style={{ marginTop: 0 }}>
        New lead
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Add a lead; you’ll land on the record after save.
      </Text>

      <Card
        styles={{ body: { padding: 24 } }}
        style={{ borderRadius: 12, border: "1px solid #e8eaed" }}
        extra={
          <Space>
            <Button onClick={() => router.push("/sales/leads")}>Cancel</Button>
            <Button type="primary" loading={loading} onClick={() => void submit(false)}>
              Create lead
            </Button>
          </Space>
        }
        title="Lead details"
      >
        <Form form={form} layout="vertical" initialValues={{ status: "new", lead_score: "lead" }}>
          <LeadFormFields mode="create" agents={agents} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Button type="default" loading={loading} disabled={!canSaveAndContinue} onClick={() => void submit(true)}>
              Save &amp; add another
            </Button>
          </div>
        </Form>
      </Card>
      <div style={{ marginTop: 16 }}>
        <Link href="/sales/leads">Back to list</Link>
      </div>
    </div>
  );
}
