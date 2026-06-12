"use client";

import { Button, Col, Form, Input, Row, Typography } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  DEMAND_QUALIFICATION_INSIGHTS_LABEL,
  type CampaignQuestionFormRow,
} from "@/lib/campaign-questions";

const { Text } = Typography;

type CampaignQuestionsEditorProps = {
  /** Form.List name — defaults to campaign_question_rows */
  listName?: string;
};

export function CampaignQuestionsEditor({
  listName = "campaign_question_rows",
}: CampaignQuestionsEditorProps) {
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <Text strong style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
        {DEMAND_QUALIFICATION_INSIGHTS_LABEL}
      </Text>
      <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
        Define demand & qualification questions agents answer when adding or editing leads.
        CQ1–CQ5 use standard lead fields; additional questions are stored dynamically.
      </Text>
      <Form.List
        name={listName}
        initialValue={Array.from({ length: 5 }, () => ({ label: "" }))}
      >
        {(fields, { add, remove }) => (
          <>
            {fields.map((field, index) => (
              <Row key={field.key} gutter={12} align="middle" style={{ marginBottom: 8 }}>
                <Col flex="72px">
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    CQ{index + 1}
                  </Text>
                </Col>
                <Col flex="auto">
                  <Form.Item
                    name={[field.name, "label"]}
                    style={{ marginBottom: 0 }}
                    rules={[
                      {
                        max: 500,
                        message: "Question is too long",
                      },
                    ]}
                  >
                    <Input placeholder="e.g. Age?, City?, Interested product?" allowClear />
                  </Form.Item>
                </Col>
                <Col flex="40px">
                  {fields.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() => remove(field.name)}
                    />
                  )}
                </Col>
              </Row>
            ))}
            <Button
              type="dashed"
              onClick={() => add({ label: "" } as CampaignQuestionFormRow)}
              icon={<PlusOutlined />}
              style={{ width: "100%", marginTop: 4 }}
            >
              Add question
            </Button>
          </>
        )}
      </Form.List>
    </div>
  );
}
