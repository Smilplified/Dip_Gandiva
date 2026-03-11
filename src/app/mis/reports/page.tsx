"use client";

import { Typography, Card } from "antd";

const { Title, Text } = Typography;

export default function MISReportsPage() {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1f1f1f" }}>
          Reports &amp; Analytics
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 6 }}>
          Generate summary reports for management reviews.
        </Text>
      </div>

      <Card>
        <Text type="secondary">
          This section will provide MIS with configurable reports and dashboards for management.
        </Text>
      </Card>
    </div>
  );
}

