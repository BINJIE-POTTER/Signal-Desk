"use client";

import { useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/components/data-table/data-table-pagination";

export function usePagination(totalItems: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, pageCount);
  return {
    page: safePage,
    pageSize,
    pageCount,
    setPage,
    setPageSize,
    slice: <T>(items: T[]) => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    paginationProps: {
      page: safePage,
      pageSize,
      totalItems,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
    },
    resetPage: () => setPage(1),
  };
}
