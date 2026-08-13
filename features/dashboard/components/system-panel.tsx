"use client";

import { TriangleAlert } from "lucide-react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountBadge, TextWithTooltip } from "@/features/dashboard/components/dashboard-primitives";
import { CollectionControl } from "@/features/dashboard/components/collection-control";
import { usePagination } from "@/features/dashboard/hooks/use-pagination";
import type { CrawlError, CrawlRun, DashboardSummary } from "@/features/dashboard/types";
import { formatDate } from "@/lib/utils";

export function SystemPanel({
  summary,
  runs,
  errors,
}: {
  summary: DashboardSummary;
  runs: CrawlRun[];
  errors: CrawlError[];
}) {
  const pagination = usePagination(runs.length);
  const rows = pagination.slice(runs);
  return (
    <div className="space-y-6">
      <CollectionControl summary={summary} />
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>采集运行</CardTitle>
            <CardDescription>最近 {runs.length} 次任务</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">时间</TableHead>
                  <TableHead>触发</TableHead>
                  <TableHead>账号</TableHead>
                  <TableHead>成功</TableHead>
                  <TableHead>失败</TableHead>
                  <TableHead className="pr-6">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="whitespace-nowrap pl-6 text-xs">
                      {formatDate(run.startedAt, true)}
                    </TableCell>
                    <TableCell>{run.trigger === "manual" ? "手动" : "计划"}</TableCell>
                    <TableCell>{run.accountsScanned}</TableCell>
                    <TableCell>{run.videosSucceeded}</TableCell>
                    <TableCell>{run.videosFailed}</TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge status={run.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataTablePagination {...pagination.paginationProps} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4" />
              异常
            </CardTitle>
            <CardDescription>{errors.length} 条近期记录</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.length ? (
              errors.map((error) => (
                <div className="rounded-lg border p-3" key={error.id}>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="max-w-48 truncate">
                      {error.category}
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(error.createdAt)}
                    </span>
                  </div>
                  {error.accountName ? (
                    <div className="mt-2">
                      <AccountBadge name={error.accountName} />
                    </div>
                  ) : null}
                  <TextWithTooltip className="mt-2 line-clamp-3 block text-xs leading-5 text-muted-foreground">
                    {error.message}
                  </TextWithTooltip>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">暂无异常</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
