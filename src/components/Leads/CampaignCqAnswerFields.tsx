"use client";

import { Form, Input, Row, Col } from "antd";
import type { CampaignQuestion } from "@/lib/campaign-questions";
import { leadAnswerFieldName } from "@/lib/campaign-questions";

type CampaignCqAnswerFieldsProps = {
  questions: CampaignQuestion[];
};

/** Agent (and other roles) answer inputs — labels come from the campaign definition. */
export function CampaignCqAnswerFields({ questions }: CampaignCqAnswerFieldsProps) {
  if (questions.length === 0) return null;

  return (
    <Row gutter={[0, 4]}>
      {questions.map((q) => (
        <Col xs={24} key={q.key}>
          <Form.Item
            className="lead-campaign-cq-item"
            label={q.label}
            name={leadAnswerFieldName(q.key)}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="Your answer" allowClear />
          </Form.Item>
        </Col>
      ))}
    </Row>
  );
}
