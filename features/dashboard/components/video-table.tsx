"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronsUpDown, Download, Search } from "lucide-react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountSelect } from "@/features/dashboard/components/account-select";
import { metricChartConfig } from "@/features/dashboard/components/analytics-charts";
import {
  AccountBadge,
  MetricValue,
  TextWithTooltip,
} from "@/features/dashboard/components/dashboard-primitives";
import { FilterBar, FilterField } from "@/features/dashboard/components/filter-bar";
import { PeriodFilter } from "@/features/dashboard/components/period-filter";
import { usePagination } from "@/features/dashboard/hooks/use-pagination";
import { useVideoFilters } from "@/features/dashboard/hooks/use-video-filters";
import type {
  Account,
  MetricDataKey,
  SortDirection,
  VideoRecord,
  VideoSortKey,
} from "@/features/dashboard/types";
import { cn, formatDate } from "@/lib/utils";

const metricKeys: MetricDataKey[] = ["likes", "collects", "comments", "shares"];

function SortButton({
  activeSortKey,
  direction,
  label,
  onSort,
  sortKey,
  align = "left",
}: {
  activeSortKey: VideoSortKey;
  direction: SortDirection;
  label: string;
  onSort: (sortKey: VideoSortKey) => void;
  sortKey: VideoSortKey;
  align?: "left" | "right";
}) {
  const isActive = activeSortKey === sortKey;
  const nextDirection = isActive && direction === "desc" ? "升序" : "降序";
  const DirectionIcon = isActive ? (direction === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-mx-3 h-8 px-3 text-muted-foreground", align === "right" && "ml-auto -mr-3")}
      aria-label={`${label}，当前${isActive ? (direction === "desc" ? "降序" : "升序") : "未排序"}，点击按${nextDirection}排列`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <DirectionIcon className={cn(!isActive && "opacity-50")} />
    </Button>
  );
}

export function VideoTable({ videos, accounts }: { videos: VideoRecord[]; accounts: Account[] }) {
  const filters = useVideoFilters(videos);
  const pagination = usePagination(filters.filtered.length);
  const rows = pagination.slice(filters.filtered);
  const update =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      pagination.resetPage();
    };
  const sortLabel = filters.sortKey === "publishedAt" ? "发布时间" : metricChartConfig[filters.sortKey].label;
  const sortBy = (sortKey: VideoSortKey) => {
    filters.toggleSort(sortKey);
    pagination.resetPage();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>视频明细</CardTitle>
          <CardDescription>{filters.filtered.length} 条结果</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/export">
            <Download />
            导出 CSV
          </a>
        </Button>
      </CardHeader>
      <div className="border-y bg-muted/20">
        <FilterBar
          embedded
          resultCount={filters.filtered.length}
          onReset={() => {
            filters.reset();
            pagination.resetPage();
          }}
          isFiltered={filters.isFiltered}
        >
          <FilterField label="搜索">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.query}
                onChange={(event) => update(filters.setQuery)(event.target.value)}
                placeholder="搜索标题或账号"
                className="pl-9"
              />
            </div>
          </FilterField>
          <FilterField label="账号">
            <AccountSelect
              value={filters.accountId}
              onValueChange={update(filters.setAccountId)}
              accounts={accounts}
              ariaLabel="筛选视频账号"
              className="w-40"
            />
          </FilterField>
          <FilterField label="发布时间">
            <PeriodFilter value={filters.period} onValueChange={update(filters.setPeriod)} />
          </FilterField>
          <FilterField label="采集状态">
            <Select value={filters.status} onValueChange={update(filters.setStatus)}>
              <SelectTrigger className="w-32" aria-label="采集状态">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="partial">部分成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="排序">
            <div className="flex gap-2">
              <Select
                value={filters.sortKey}
                onValueChange={(value) => update(filters.setSortKey)(value as VideoSortKey)}
              >
                <SelectTrigger className="w-36" aria-label="视频排序">
                  <ChevronsUpDown className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publishedAt">按发布时间</SelectItem>
                  <SelectItem value="likes">按点赞</SelectItem>
                  <SelectItem value="collects">按收藏</SelectItem>
                  <SelectItem value="comments">按评论</SelectItem>
                  <SelectItem value="shares">按分享</SelectItem>
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`排序方向：${filters.sortDirection === "desc" ? "降序" : "升序"}`}
                    onClick={() =>
                      update(filters.setSortDirection)(filters.sortDirection === "desc" ? "asc" : "desc")
                    }
                  >
                    {filters.sortDirection === "desc" ? <ArrowDown /> : <ArrowUp />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  点击切换为{filters.sortDirection === "desc" ? "升序" : "降序"}
                </TooltipContent>
              </Tooltip>
            </div>
          </FilterField>
        </FilterBar>
      </div>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[42%] pl-6">视频</TableHead>
              <TableHead>
                <SortButton
                  label="发布"
                  sortKey="publishedAt"
                  activeSortKey={filters.sortKey}
                  direction={filters.sortDirection}
                  onSort={sortBy}
                />
              </TableHead>
              {metricKeys.map((key) => (
                <TableHead key={key} className="text-right">
                  <SortButton
                    label={metricChartConfig[key].label}
                    sortKey={key}
                    activeSortKey={filters.sortKey}
                    direction={filters.sortDirection}
                    align="right"
                    onSort={sortBy}
                  />
                </TableHead>
              ))}
              <TableHead className="pr-6">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((video) => (
              <TableRow key={video.id}>
                <TableCell className="max-w-0 pl-6">
                  <div className="flex min-w-0 items-center gap-2">
                    <a className="min-w-0 flex-1" href={video.videoUrl} target="_blank" rel="noreferrer">
                      <TextWithTooltip className="block truncate font-medium hover:underline">
                        {video.title ?? "未命名视频"}
                      </TextWithTooltip>
                    </a>
                    <AccountBadge name={video.accountName} />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{formatDate(video.publishedAt)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      发布于 {formatDate(video.publishedAt, true)}
                      <br />
                      最近尝试于 {formatDate(video.capturedAt, true)}
                      <br />
                      指标快照于 {formatDate(video.metricCapturedAt, true)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">
                  <MetricValue label="点赞" value={video.likes} />
                </TableCell>
                <TableCell className="text-right">
                  <MetricValue label="收藏" value={video.collects} />
                </TableCell>
                <TableCell className="text-right">
                  <MetricValue label="评论" value={video.comments} />
                </TableCell>
                <TableCell className="text-right">
                  <MetricValue label="分享" value={video.shares} />
                </TableCell>
                <TableCell className="pr-6">
                  <StatusBadge status={video.captureStatus ?? video.status} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length ? null : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  没有符合当前筛选条件的视频
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t px-6 py-4 text-xs text-muted-foreground">
          当前按{sortLabel}
          {filters.sortDirection === "desc" ? "降序" : "升序"}排列
        </div>
        <DataTablePagination {...pagination.paginationProps} />
      </CardContent>
    </Card>
  );
}
