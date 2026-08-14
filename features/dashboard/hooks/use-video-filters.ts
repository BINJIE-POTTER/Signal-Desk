"use client";

import { useMemo, useState } from "react";
import { filterAndSortVideos } from "@/features/dashboard/selectors";
import type { PeriodDays, SortDirection, VideoRecord, VideoSortKey } from "@/features/dashboard/types";

export function useVideoFilters(videos: VideoRecord[], defaultSort: VideoSortKey = "publishedAt") {
  const [query, setQueryState] = useState("");
  const [period, setPeriodState] = useState<PeriodDays>(90);
  const [sortKey, setSortKeyState] = useState<VideoSortKey>(defaultSort);
  const [sortDirection, setSortDirectionState] = useState<SortDirection>("desc");
  const [accountId, setAccountIdState] = useState("all");
  const [status, setStatusState] = useState("all");
  const filtered = useMemo(
    () => filterAndSortVideos(videos, { accountId, period, query, sortDirection, sortKey, status }),
    [accountId, period, query, sortDirection, sortKey, status, videos],
  );
  return {
    query,
    period,
    sortKey,
    sortDirection,
    accountId,
    status,
    filtered,
    setQuery: setQueryState,
    setPeriod: setPeriodState,
    setSortKey: setSortKeyState,
    setSortDirection: setSortDirectionState,
    toggleSort: (nextSortKey: VideoSortKey) => {
      if (nextSortKey === sortKey) {
        setSortDirectionState((current) => (current === "desc" ? "asc" : "desc"));
        return;
      }
      setSortKeyState(nextSortKey);
      setSortDirectionState("desc");
    },
    setAccountId: setAccountIdState,
    setStatus: setStatusState,
    reset: () => {
      setQueryState("");
      setPeriodState(90);
      setSortKeyState(defaultSort);
      setSortDirectionState("desc");
      setAccountIdState("all");
      setStatusState("all");
    },
    isFiltered:
      Boolean(query) ||
      period !== 90 ||
      accountId !== "all" ||
      status !== "all" ||
      sortKey !== defaultSort ||
      sortDirection !== "desc",
  };
}
