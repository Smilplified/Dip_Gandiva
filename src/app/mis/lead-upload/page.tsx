"use client";

import { Typography, Card } from "antd";

const { Title, Text } = Typography;

export default function MISLeadUploadPage() {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1f1f1f" }}>
          Lead Upload
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 6 }}>
          Upload bulk lead data into campaigns.
        </Text>
      </div>

      <Card>
        <Text type="secondary">
          This section will allow MIS to upload and validate bulk lead files, then assign them to campaigns.
        </Text>
      </Card>
    </div>
  );
}

