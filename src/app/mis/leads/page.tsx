"use client";

import { Typography, Card } from "antd";

const { Title, Text } = Typography;

export default function MISLeadsPage() {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1f1f1f" }}>
          Lead Database
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 6 }}>
          View all leads across all campaigns in one place.
        </Text>
      </div>

      <Card>
        <Text type="secondary">
          This section will give MIS a unified table of all leads with powerful filters and exports.
        </Text>
      </Card>
    </div>
  );
}

