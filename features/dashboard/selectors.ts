import type {
  MetricDataKey,
  PeriodDays,
  TrendSnapshot,
  TrendTotal,
  VideoPoint,
  VideoRecord,
  VideoSortKey,
} from "@/features/dashboard/types";

const DAY_MS = 86_400_000;

export function isWithinPublishedPeriod(publishedAt: string | null, period: PeriodDays, now = Date.now()) {
  if (!publishedAt) return false;
  const elapsed = now - new Date(publishedAt).getTime();
  return elapsed >= 0 && elapsed <= period * DAY_MS;
}

export function toVideoPoint(video: VideoRecord): VideoPoint {
  return {
    id: video.id,
    title: (video.title ?? "未命名视频").replace(/^.+?[：:]/, ""),
    accountName: video.accountName || "未知账号",
    publishedAt: video.publishedAt ?? "",
    likes: Number(video.likes ?? 0),
    collects: Number(video.collects ?? 0),
    comments: Number(video.comments ?? 0),
    shares: Number(video.shares ?? 0),
  };
}

export function filterAndSortVideos(
  videos: VideoRecord[],
  filters: {
    accountId: string;
    period: PeriodDays;
    query?: string;
    status?: string;
    sortKey?: VideoSortKey;
  },
) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const result: VideoRecord[] = [];
  for (const video of videos) {
    if (!isWithinPublishedPeriod(video.publishedAt, filters.period)) continue;
    if (filters.accountId !== "all" && String(video.accountId) !== filters.accountId) continue;
    if (
      filters.status &&
      filters.status !== "all" &&
      (video.captureStatus ?? video.status) !== filters.status
    )
      continue;
    if (query && !`${video.title ?? ""} ${video.accountName}`.toLowerCase().includes(query)) continue;
    result.push(video);
  }
  const sortKey = filters.sortKey ?? "publishedAt";
  result.sort((left, right) =>
    sortKey === "publishedAt"
      ? new Date(right.publishedAt ?? 0).getTime() - new Date(left.publishedAt ?? 0).getTime()
      : Number(right[sortKey] ?? 0) - Number(left[sortKey] ?? 0),
  );
  return result;
}

export function aggregateTrendSnapshots(
  snapshots: TrendSnapshot[],
  filters: { accountId: string; period: PeriodDays },
) {
  const grouped = new Map<string, TrendTotal>();
  for (const snapshot of snapshots) {
    if (!isWithinPublishedPeriod(snapshot.publishedAt, filters.period)) continue;
    if (filters.accountId !== "all" && String(snapshot.accountId) !== filters.accountId) continue;
    const current = grouped.get(snapshot.date) ?? {
      date: snapshot.date,
      likes: 0,
      collects: 0,
      comments: 0,
      shares: 0,
    };
    current.likes += Number(snapshot.likes ?? 0);
    current.collects += Number(snapshot.collects ?? 0);
    current.comments += Number(snapshot.comments ?? 0);
    current.shares += Number(snapshot.shares ?? 0);
    grouped.set(snapshot.date, current);
  }
  return [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function sumVideoMetrics(videos: VideoPoint[]) {
  const totals: Record<MetricDataKey, number> = { likes: 0, collects: 0, comments: 0, shares: 0 };
  for (const video of videos) {
    totals.likes += video.likes;
    totals.collects += video.collects;
    totals.comments += video.comments;
    totals.shares += video.shares;
  }
  return totals;
}
