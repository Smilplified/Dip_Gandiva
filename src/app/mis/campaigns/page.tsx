"use client";

import { Typography, Card } from "antd";

const { Title, Text } = Typography;

export default function MISCampaignsPage() {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1f1f1f" }}>
          Campaign Management
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 6 }}>
          Manage campaign data structure and master configuration.
        </Text>
      </div>

      <Card>
        <Text type="secondary">
          This section will allow MIS to define and manage campaign master data (fields, mappings, and configurations).
        </Text>
      </Card>
    </div>
  );
}

