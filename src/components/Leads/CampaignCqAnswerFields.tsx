"use client";

import { Col, Form, Input } from "antd";
import type { CampaignQuestion } from "@/lib/campaign-questions";
import { leadAnswerFieldName } from "@/lib/campaign-questions";

type CampaignCqAnswerFieldsProps = {
  questions: CampaignQuestion[];
};

/** Agent (and other roles) answer inputs — labels come from the campaign definition. */
export function CampaignCqAnswerFields({ questions }: CampaignCqAnswerFieldsProps) {
  if (questions.length === 0) return null;

  return (
    <>
      {questions.map((q) => (
        <Col xs={24} sm={12} key={q.key}>
          <Form.Item label={q.label} name={leadAnswerFieldName(q.key)}>
            <Input placeholder="Your answer" allowClear />
          </Form.Item>
        </Col>
      ))}
    </>
  );
}
