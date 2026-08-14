"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { rankByMetric, splitVideoTitle, toTrendDeltas } from "@/features/dashboard/selectors";
import {
  METRIC_DATA_KEYS,
  type AccountMetricPoint,
  type MetricDataKey,
  type TrendTotal,
  type VideoPoint,
} from "@/features/dashboard/types";
import { formatCompact, formatDelta } from "@/lib/utils";

export const metricChartConfig = {
  likes: { label: "点赞", color: "hsl(var(--chart-1))" },
  collects: { label: "收藏", color: "hsl(var(--chart-2))" },
  comments: { label: "评论", color: "hsl(var(--chart-3))" },
  shares: { label: "可见分享", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

type TrendViewMode = "delta" | "cumulative";

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function EmptyChart({ children }: { children: string }) {
  return (
    <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">{children}</div>
  );
}

function CategoryTick({
  x = 0,
  y = 0,
  payload,
  maxUnits = 24,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  maxUnits?: number;
}) {
  const title = payload?.value ?? "";
  const lines = splitVideoTitle(title, maxUnits);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>{title}</title>
      <text
        x={-12}
        y={lines.length === 2 ? -5 : 4}
        textAnchor="end"
        className="fill-muted-foreground text-xs"
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={-12} dy={index === 0 ? 0 : 16}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function MetricSwatch({ dataKey }: { dataKey: MetricDataKey }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-[2px]"
      style={{ backgroundColor: `var(--color-${dataKey})` }}
    />
  );
}

function EntityMetricTooltip({
  title,
  subtitle,
  values,
}: {
  title: string;
  subtitle: string;
  values: Record<MetricDataKey, number>;
}) {
  return (
    <div className="grid min-w-64 gap-2">
      <div className="min-w-0">
        <p className="max-w-72 whitespace-normal font-medium leading-5">{title}</p>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-1.5 border-t pt-2">
        {METRIC_DATA_KEYS.map((key) => (
          <div className="flex items-center justify-between gap-6" key={key}>
            <span className="flex items-center gap-2 text-muted-foreground">
              <MetricSwatch dataKey={key} />
              {metricChartConfig[key].label}
            </span>
            <span className="font-mono font-medium tabular-nums">{values[key].toLocaleString("zh-CN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendTooltipRow({
  dataKey,
  value,
  mode,
}: {
  dataKey: MetricDataKey;
  value: number;
  mode: TrendViewMode;
}) {
  return (
    <div className="flex min-w-36 items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-muted-foreground">
        <MetricSwatch dataKey={dataKey} />
        {metricChartConfig[dataKey].label}
      </span>
      <span className="font-mono font-medium tabular-nums">
        {mode === "delta" ? formatDelta(value) : value.toLocaleString("zh-CN")}
      </span>
    </div>
  );
}

export function HistoryChart({ data, highlightKey }: { data: TrendTotal[]; highlightKey: MetricDataKey }) {
  const [mode, setMode] = useState<TrendViewMode>("delta");
  const deltas = useMemo(() => toTrendDeltas(data), [data]);
  const chartData = mode === "delta" ? deltas : data;

  if (!data.length) return <EmptyChart>筛选范围内暂无快照</EmptyChart>;
  if (data.length < 2) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-1 border-t border-dashed">
        <p className="text-3xl font-semibold tabular-nums">{formatCompact(data[0][highlightKey])}</p>
        <p className="text-sm text-muted-foreground">{data[0].date} · 首次采集基线</p>
        <p className="mt-3 max-w-sm text-center text-xs text-muted-foreground">
          至少需要两个不同采集日期才能计算变化趋势。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          横轴为采集日期，同时对比点赞、收藏、评论与可见分享
          {mode === "delta" ? "的较上次变化" : "的累计总量"}
        </p>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={mode}
          onValueChange={(value) => value && setMode(value as TrendViewMode)}
        >
          <ToggleGroupItem value="delta" aria-label="较上次变化">
            较上次变化
          </ToggleGroupItem>
          <ToggleGroupItem value="cumulative" aria-label="累计总量">
            累计总量
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <ChartContainer config={metricChartConfig} className="aspect-auto h-[320px] w-full">
        {mode === "delta" ? (
          <BarChart accessibilityLayer data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={shortDate}
            />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  labelFormatter={(_, payload) => `采集日期 ${String(payload?.[0]?.payload?.date ?? "")}`}
                  formatter={(value, name) => (
                    <TrendTooltipRow dataKey={name as MetricDataKey} value={Number(value)} mode="delta" />
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {METRIC_DATA_KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                fill={`var(--color-${key})`}
                radius={4}
                maxBarSize={28}
                fillOpacity={key === highlightKey ? 1 : 0.55}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart accessibilityLayer data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={shortDate}
            />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => `采集日期 ${String(payload?.[0]?.payload?.date ?? "")}`}
                  formatter={(value, name) => (
                    <TrendTooltipRow
                      dataKey={name as MetricDataKey}
                      value={Number(value)}
                      mode="cumulative"
                    />
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {METRIC_DATA_KEYS.map((key) => (
              <Line
                key={key}
                dataKey={key}
                name={key}
                type="linear"
                stroke={`var(--color-${key})`}
                strokeWidth={key === highlightKey ? 2.5 : 1.5}
                strokeOpacity={key === highlightKey ? 1 : 0.55}
                dot={{ r: key === highlightKey ? 4 : 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}

export function VideoRankingChart({ data, dataKey }: { data: VideoPoint[]; dataKey: MetricDataKey }) {
  const ranked = rankByMetric(data, dataKey, 10);
  if (!ranked.length) return <EmptyChart>筛选范围内暂无视频</EmptyChart>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        按{metricChartConfig[dataKey].label}排序，悬停可对比同一视频的其余指标
      </p>
      <ChartContainer config={metricChartConfig} className="aspect-auto h-[360px] w-full">
        <BarChart accessibilityLayer data={ranked} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="title"
            tick={<CategoryTick />}
            tickLine={false}
            axisLine={false}
            width={220}
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={
              <ChartTooltipContent
                hideLabel
                indicator="line"
                formatter={(_value, _name, item) => (
                  <EntityMetricTooltip
                    title={String(item.payload.title)}
                    subtitle={`${String(item.payload.accountName)} · ${String(item.payload.publishedAt).slice(0, 10)}`}
                    values={item.payload as Record<MetricDataKey, number>}
                  />
                )}
              />
            }
          />
          <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} barSize={20} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function AccountRankingChart({
  data,
  dataKey,
}: {
  data: AccountMetricPoint[];
  dataKey: MetricDataKey;
}) {
  const ranked = rankByMetric(data, dataKey);
  if (!ranked.length) return <EmptyChart>筛选范围内暂无账号</EmptyChart>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        按{metricChartConfig[dataKey].label}比较账号，悬停可对比该账号的四项指标
      </p>
      <ChartContainer config={metricChartConfig} className="aspect-auto h-[360px] w-full">
        <BarChart accessibilityLayer data={ranked} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="accountName"
            tick={<CategoryTick maxUnits={18} />}
            tickLine={false}
            axisLine={false}
            width={160}
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={
              <ChartTooltipContent
                hideLabel
                indicator="line"
                formatter={(_value, _name, item) => (
                  <EntityMetricTooltip
                    title={String(item.payload.accountName)}
                    subtitle={`${Number(item.payload.videoCount)} 条视频计入当前筛选`}
                    values={item.payload as Record<MetricDataKey, number>}
                  />
                )}
              />
            }
          />
          <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} barSize={20} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
