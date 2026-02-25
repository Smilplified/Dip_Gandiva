"use client";

import PipelineChart from "@/components/Dashboard/PipelineChart";

export default function TLPipelinePage() {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Pipeline</h1>
        <p style={{ margin: "4px 0 0", color: "#8c8c8c", fontSize: 14 }}>
          View and manage your sales pipeline.
        </p>
      </div>
      <PipelineChart />
    </>
  );
}
