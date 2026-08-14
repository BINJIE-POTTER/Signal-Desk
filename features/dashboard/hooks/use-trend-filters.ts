"use client";

import { useMemo, useState } from "react";
import {
  aggregateAccountMetrics,
  aggregateTrendSnapshots,
  filterAndSortVideos,
  sumVideoMetrics,
  toVideoPoint,
} from "@/features/dashboard/selectors";
import type { MetricDataKey, PeriodDays, TrendSnapshot, VideoRecord } from "@/features/dashboard/types";

export function useTrendFilters(videos: VideoRecord[], snapshots: TrendSnapshot[]) {
  const [metric, setMetric] = useState<MetricDataKey>("likes");
  const [period, setPeriod] = useState<PeriodDays>(90);
  const [accountId, setAccountId] = useState("all");
  const derived = useMemo(() => {
    const videoPoints = filterAndSortVideos(videos, { accountId, period, sortKey: metric }).map(toVideoPoint);
    return {
      videos: videoPoints,
      accounts: aggregateAccountMetrics(videoPoints),
      trends: aggregateTrendSnapshots(snapshots, { accountId, period }),
      totals: sumVideoMetrics(videoPoints),
      leadingVideo: videoPoints[0],
    };
  }, [accountId, metric, period, snapshots, videos]);
  return {
    metric,
    setMetric,
    period,
    setPeriod,
    accountId,
    setAccountId,
    isFiltered: period !== 90 || accountId !== "all",
    reset: () => {
      setPeriod(90);
      setAccountId("all");
    },
    ...derived,
  };
}
