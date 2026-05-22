"use client";

import { useEffect, useState } from "react";
import { Upload, Typography, message } from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

type ClientLogoUploadProps = {
  clientId: string | null | undefined;
  disabled?: boolean;
  onLogoChange?: (url: string | null) => void;
};

export default function ClientLogoUpload({
  clientId,
  disabled,
  onLogoChange,
}: ClientLogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setLogoUrl(null);
      onLogoChange?.(null);
      return;
    }

    let cancelled = false;
    setFetching(true);
    fetch(`/api/admin/clients/${clientId}/logo`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: { logo_url?: string | null; error?: string }) => {
        if (cancelled) return;
        const url = data.logo_url ?? null;
        setLogoUrl(url);
        onLogoChange?.(url);
      })
      .catch(() => {
        if (!cancelled) setLogoUrl(null);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when client changes
  }, [clientId]);

  const uploadProps: UploadProps = {
    name: "file",
    listType: "picture-card",
    showUploadList: false,
    disabled: disabled || !clientId || loading,
    accept: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml",
    beforeUpload: (file) => {
      if (!clientId) {
        message.warning("Select a client first");
        return Upload.LIST_IGNORE;
      }
      if (!file.type.startsWith("image/")) {
        message.error("Please upload an image file");
        return Upload.LIST_IGNORE;
      }
      if (file.size > 2 * 1024 * 1024) {
        message.error("Logo must be 2MB or smaller");
        return Upload.LIST_IGNORE;
      }

      void (async () => {
        setLoading(true);
        try {
          const body = new FormData();
          body.append("file", file);
          const res = await fetch(`/api/admin/clients/${clientId}/logo`, {
            method: "POST",
            body,
            credentials: "include",
          });
          const json = (await res.json()) as { logo_url?: string; error?: string };
          if (!res.ok) throw new Error(json.error || "Upload failed");
          setLogoUrl(json.logo_url ?? null);
          onLogoChange?.(json.logo_url ?? null);
          message.success("Client logo uploaded");
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Failed to upload logo");
        } finally {
          setLoading(false);
        }
      })();

      return false;
    },
  };

  if (!clientId) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        Client logo
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
        Shown on the client dashboard header (left of notifications).
      </Typography.Text>
      <Upload {...uploadProps}>
        {logoUrl && !loading && !fetching ? (
          <img
            src={logoUrl}
            alt="Client logo"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div>
            {loading || fetching ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>{fetching ? "Loading…" : "Upload logo"}</div>
          </div>
        )}
      </Upload>
    </div>
  );
}
