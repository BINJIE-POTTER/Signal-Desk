"use client";

import { useMemo, useState } from "react";
import { filterAndSortVideos } from "@/features/dashboard/selectors";
import type { PeriodDays, VideoRecord, VideoSortKey } from "@/features/dashboard/types";

export function useVideoFilters(videos: VideoRecord[], defaultSort: VideoSortKey = "publishedAt") {
  const [query, setQueryState] = useState("");
  const [period, setPeriodState] = useState<PeriodDays>(90);
  const [sortKey, setSortKeyState] = useState<VideoSortKey>(defaultSort);
  const [accountId, setAccountIdState] = useState("all");
  const [status, setStatusState] = useState("all");
  const filtered = useMemo(
    () => filterAndSortVideos(videos, { accountId, period, query, sortKey, status }),
    [accountId, period, query, sortKey, status, videos],
  );
  return {
    query,
    period,
    sortKey,
    accountId,
    status,
    filtered,
    setQuery: setQueryState,
    setPeriod: setPeriodState,
    setSortKey: setSortKeyState,
    setAccountId: setAccountIdState,
    setStatus: setStatusState,
    reset: () => {
      setQueryState("");
      setPeriodState(90);
      setSortKeyState(defaultSort);
      setAccountIdState("all");
      setStatusState("all");
    },
    isFiltered:
      Boolean(query) || period !== 90 || accountId !== "all" || status !== "all" || sortKey !== defaultSort,
  };
}
