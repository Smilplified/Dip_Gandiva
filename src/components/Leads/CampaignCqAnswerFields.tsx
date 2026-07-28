"use client";

import { Form, Input, Row, Col, Select } from "antd";
import {
  isDropdownCampaignQuestion,
  leadAnswerFieldName,
  type CampaignQuestion,
} from "@/lib/campaign-questions";

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
            {isDropdownCampaignQuestion(q) ? (
              <Select
                placeholder="Select answer"
                allowClear
                showSearch
                optionFilterProp="label"
                options={(q.options ?? []).map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
            ) : (
              <Input placeholder="Your answer" allowClear />
            )}
          </Form.Item>
        </Col>
      ))}
    </Row>
  );
}
