"use client";

import { useEffect, useState } from "react";
import { Button, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { DownloadOutlined, LinkedinOutlined } from "@ant-design/icons";
import type { SorterResult } from "antd/es/table/interface";
import { usePaginatedListQuery } from "@/hooks/usePaginatedListQuery";

const { Text } = Typography;

type LeadRow = {
  id: string;
  batch_name: string | null;
  full_name: string | null;
  email: string | null;
  email_status: string | null;
  phone: string | null;
  mobile_number: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  company_name: string | null;
  company_website: string | null;
  company_industry: string | null;
  company_size: string | null;
  contact_city: string | null;
  contact_state: string | null;
  contact_country: string | null;
  created_at: string;
};

export default function LeadsTable({ initialBatch }: { initialBatch?: string | null }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [batch, setBatch] = useState<string | undefined>(initialBatch ?? undefined);
  const [industry, setIndustry] = useState("");
  const [title, setTitle] = useState("");
  const [state, setState] = useState("");
  const [sort, setSort] = useState<{ field: string; dir: "asc" | "desc" }>({
    field: "created_at",
    dir: "desc",
  });

  useEffect(() => {
    setBatch(initialBatch ?? undefined);
    setPage(1);
  }, [initialBatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    page,
    limit: pageSize,
    q: debounced || undefined,
    batch: batch || undefined,
    industry: industry.trim() || undefined,
    title: title.trim() || undefined,
    state: state.trim() || undefined,
    sort: sort.field,
    dir: sort.dir,
  };

  const { items, pagination, response, isLoading, error } = usePaginatedListQuery<LeadRow>({
    queryKeyPrefix: ["lead-finder", "leads"],
    url: "/api/admin/lead-finder/leads",
    params,
    listField: "leads",
  });

  useEffect(() => {
    if (error) {
      message.error(error instanceof Error ? error.message : "Failed to load leads");
    }
  }, [error]);

  const batchOptions = (response?.batches as string[] | undefined) ?? [];

  const handleExport = () => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && key !== "page" && key !== "limit") {
        sp.set(key, String(value));
      }
    }
    // Browser download — streams from the server, filtered set only.
    window.open(`/api/admin/lead-finder/leads/export?${sp.toString()}`, "_blank");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space wrap>
        <Input.Search
          placeholder="Search name / email / company / title"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          placeholder="Batch"
          value={batch}
          onChange={(v) => {
            setBatch(v);
            setPage(1);
          }}
          options={batchOptions.map((b) => ({ value: b, label: b }))}
          style={{ width: 240 }}
          allowClear
          showSearch
        />
        <Input
          placeholder="Industry"
          value={industry}
          onChange={(e) => {
            setIndustry(e.target.value);
            setPage(1);
          }}
          style={{ width: 160 }}
          allowClear
        />
        <Input
          placeholder="Job title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setPage(1);
          }}
          style={{ width: 160 }}
          allowClear
        />
        <Input
          placeholder="State"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
          style={{ width: 130 }}
          allowClear
        />
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          Export CSV
        </Button>
      </Space>

      <Table<LeadRow>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={items}
        scroll={{ x: 1300 }}
        pagination={{
          current: page,
          pageSize,
          total: pagination?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total.toLocaleString()} leads`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        onChange={(_, __, sorter) => {
          const s = sorter as SorterResult<LeadRow>;
          if (s.field && s.order) {
            setSort({
              field: String(s.field),
              dir: s.order === "ascend" ? "asc" : "desc",
            });
          } else {
            setSort({ field: "created_at", dir: "desc" });
          }
        }}
        columns={[
          {
            title: "Name",
            dataIndex: "full_name",
            sorter: true,
            width: 170,
            fixed: "left",
            render: (v: string | null, r) => (
              <Space size={4}>
                <Text strong style={{ fontSize: 13 }}>
                  {v ?? "—"}
                </Text>
                {r.linkedin_url ? (
                  <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <LinkedinOutlined />
                  </a>
                ) : null}
              </Space>
            ),
          },
          {
            title: "Email",
            dataIndex: "email",
            sorter: true,
            width: 220,
            render: (v: string | null, r) => (
              <Space size={4}>
                <Text copyable={Boolean(v)} style={{ fontSize: 12 }}>
                  {v ?? "—"}
                </Text>
                {r.email_status ? (
                  <Tag
                    color={r.email_status === "validated" ? "green" : "default"}
                    style={{ fontSize: 10 }}
                  >
                    {r.email_status}
                  </Tag>
                ) : null}
              </Space>
            ),
          },
          { title: "Job Title", dataIndex: "job_title", sorter: true, width: 180, ellipsis: true },
          {
            title: "Company",
            dataIndex: "company_name",
            sorter: true,
            width: 180,
            ellipsis: true,
            render: (v: string | null, r) =>
              r.company_website ? (
                <a
                  href={
                    r.company_website.startsWith("http")
                      ? r.company_website
                      : `https://${r.company_website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {v ?? r.company_website}
                </a>
              ) : (
                v ?? "—"
              ),
          },
          { title: "Industry", dataIndex: "company_industry", width: 150, ellipsis: true },
          { title: "Size", dataIndex: "company_size", width: 90 },
          {
            title: "Phone",
            width: 140,
            render: (_, r) => r.phone ?? r.mobile_number ?? "—",
          },
          {
            title: "Location",
            width: 170,
            ellipsis: true,
            render: (_, r) =>
              [r.contact_city, r.contact_state, r.contact_country].filter(Boolean).join(", ") ||
              "—",
          },
          {
            title: "State",
            dataIndex: "contact_state",
            sorter: true,
            width: 110,
            ellipsis: true,
          },
          { title: "Batch", dataIndex: "batch_name", width: 180, ellipsis: true },
        ]}
      />
    </div>
  );
}
