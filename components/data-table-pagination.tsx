"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const DEFAULT_PAGE_SIZE = 50;

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, pageCount);
  const firstItem = totalItems ? (safePage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t px-6 py-4">
      <p className="text-sm text-muted-foreground">
        显示 {firstItem}–{lastItem}，共 {totalItems} 条
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">每页</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-8 w-[72px]" aria-label="每页显示数量">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((size) => (
                <SelectItem value={String(size)} key={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="min-w-20 text-center text-sm font-medium">
          {safePage} / {pageCount}
        </p>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="上一页"
                disabled={safePage <= 1}
                onClick={() => onPageChange(safePage - 1)}
              >
                <ChevronLeft />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="下一页"
                disabled={safePage >= pageCount}
                onClick={() => onPageChange(safePage + 1)}
              >
                <ChevronRight />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
