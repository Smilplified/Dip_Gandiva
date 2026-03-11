"use client";

import React, { useState } from "react";

const DEFAULT_MAX_LENGTH = 200;

type ExpandableTextProps = {
  text: string;
  maxLength?: number;
  style?: React.CSSProperties;
  /** Optional class for the container */
  className?: string;
};

/**
 * Renders text with a "More" / "Show less" toggle when content exceeds maxLength.
 * Preserves line breaks (white-space: pre-wrap).
 */
export function ExpandableText({
  text,
  maxLength = DEFAULT_MAX_LENGTH,
  style,
  className,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > maxLength;
  const displayText = needsToggle && !expanded ? text.slice(0, maxLength).trim() + "..." : text;

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", ...style }}>
      {displayText}
      {needsToggle && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "#1677ff",
              fontSize: "inherit",
              fontWeight: 500,
            }}
          >
            {expanded ? "Show less" : "More"}
          </button>
        </>
      )}
    </span>
  );
}
