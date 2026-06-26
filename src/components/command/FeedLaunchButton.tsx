"use client";

import { useState } from "react";
import { Badge, Button } from "antd";
import { MessageOutlined } from "@ant-design/icons";

type FeedLaunchButtonProps = {
  unreadCount: number;
  onClick: () => void;
};

export function FeedLaunchButton({ unreadCount, onClick }: FeedLaunchButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Badge
      count={unreadCount}
      size="small"
      offset={[-4, 4]}
      overflowCount={99}
      style={{ backgroundColor: "#ef4444" }}
    >
      <Button
        size="small"
        icon={
          <span className="feed-btn-icon">
            <MessageOutlined style={{ fontSize: 13 }} />
          </span>
        }
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered
            ? "linear-gradient(135deg, #4338ca, #6366f1)"
            : "linear-gradient(135deg, #4f46e5, #7c3aed)",
          border: "none",
          color: "#fff",
          fontWeight: 600,
          fontSize: 13,
          borderRadius: 8,
          padding: "0 14px",
          height: 30,
          boxShadow: hovered
            ? "0 4px 14px rgba(79,70,229,0.45)"
            : "0 2px 8px rgba(79,70,229,0.30)",
          transform: hovered ? "translateY(-1px)" : "translateY(0)",
          transition: "all 0.18s ease",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          letterSpacing: "0.01em",
        }}
      >
        Campaign Workspace
      </Button>
    </Badge>
  );
}
