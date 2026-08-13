"use client";

import { AccountBadge, TextWithTooltip } from "@/features/dashboard/components/dashboard-primitives";
import { AccountSelect } from "@/features/dashboard/components/account-select";
import { FilterBar, FilterField } from "@/features/dashboard/components/filter-bar";
import { PeriodFilter } from "@/features/dashboard/components/period-filter";
import { HistoryChart, VideoRankingChart } from "@/features/dashboard/components/analytics-charts";
import { metricByDataKey, metricDefinitions } from "@/features/dashboard/config";
import { useTrendFilters } from "@/features/dashboard/hooks/use-trend-filters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Account, TrendSnapshot, VideoRecord } from "@/features/dashboard/types";
import { formatCompact } from "@/lib/utils";

export function TrendsPanel({
  trends,
  videos,
  accounts,
}: {
  trends: TrendSnapshot[];
  videos: VideoRecord[];
  accounts: Account[];
}) {
  const filters = useTrendFilters(videos, trends);
  const activeMetric = metricByDataKey.get(filters.metric) ?? metricDefinitions[0];
  return (
    <div className="space-y-6">
      <FilterBar resultCount={filters.videos.length} onReset={filters.reset} isFiltered={filters.isFiltered}>
        <FilterField label="账号">
          <AccountSelect value={filters.accountId} onValueChange={filters.setAccountId} accounts={accounts} />
        </FilterField>
        <FilterField label="发布时间">
          <PeriodFilter value={filters.period} onValueChange={filters.setPeriod} />
        </FilterField>
      </FilterBar>
      <ToggleGroup
        type="single"
        value={filters.metric}
        onValueChange={(value) => value && filters.setMetric(value as typeof filters.metric)}
        className="grid grid-cols-4 gap-6"
      >
        {metricDefinitions.map((item) => (
          <ToggleGroupItem
            key={item.key}
            value={item.dataKey}
            className="h-auto justify-start border p-0 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5"
          >
            <div className="w-full p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {formatCompact(filters.totals[item.dataKey])}
              </p>
              <p className="mt-1 text-xs font-normal text-muted-foreground">当前筛选范围总量</p>
            </div>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Card>
        <Tabs defaultValue="trend">
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div className="min-w-0">
              <CardTitle>{activeMetric.label}表现</CardTitle>
              <CardDescription className="mt-1 flex min-w-0 items-center gap-1">
                {filters.leadingVideo ? (
                  <>
                    <span>领先视频</span>
                    <TextWithTooltip className="max-w-80 truncate text-foreground">
                      {filters.leadingVideo.title}
                    </TextWithTooltip>
                    <AccountBadge name={filters.leadingVideo.accountName} />
                  </>
                ) : (
                  "筛选范围内暂无数据"
                )}
              </CardDescription>
            </div>
            <TabsList>
              <TabsTrigger value="trend">采集趋势</TabsTrigger>
              <TabsTrigger value="ranking">视频排行</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-6">
            <TabsContent value="trend" className="mt-0">
              <HistoryChart data={filters.trends} dataKey={filters.metric} />
            </TabsContent>
            <TabsContent value="ranking" className="mt-0">
              <VideoRankingChart data={filters.videos} dataKey={filters.metric} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
