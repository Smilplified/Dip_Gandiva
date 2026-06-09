"use client";

import { useCallback, useMemo, useState } from "react";
import type { TablePaginationConfig } from "antd/es/table";
import {
  LIST_PAGE_SIZE_DEFAULT,
  LIST_PAGE_SIZE_OPTIONS,
  type ApiPaginationMeta,
} from "@/lib/api-pagination";

export function useServerTablePagination(initialPageSize = LIST_PAGE_SIZE_DEFAULT) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const applyPaginationMeta = useCallback((meta?: ApiPaginationMeta | null) => {
    if (!meta) return;
    setTotal(meta.total);
    if (meta.page > 0) setPage(meta.page);
    if (meta.limit > 0) setPageSize(meta.limit);
  }, []);

  const resetPage = useCallback(() => setPage(1), []);

  const onTableChange = useCallback((nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, []);

  const tablePagination: TablePaginationConfig = useMemo(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: [...LIST_PAGE_SIZE_OPTIONS],
      showTotal: (t: number) => `Total ${t}`,
      responsive: true,
      onChange: onTableChange,
    }),
    [page, pageSize, total, onTableChange]
  );

  return {
    page,
    pageSize,
    total,
    setPage,
    setPageSize,
    setTotal,
    resetPage,
    applyPaginationMeta,
    tablePagination,
  };
}
