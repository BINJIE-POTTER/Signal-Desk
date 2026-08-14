import {
  METRIC_DATA_KEYS,
  type AccountMetricPoint,
  type MetricDataKey,
  type PeriodDays,
  type SortDirection,
  type TrendSnapshot,
  type TrendTotal,
  type VideoPoint,
  type VideoRecord,
  type VideoSortKey,
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
    sortDirection?: SortDirection;
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
  const direction = filters.sortDirection ?? "desc";
  result.sort((left, right) => {
    const comparison =
      sortKey === "publishedAt"
        ? new Date(left.publishedAt ?? 0).getTime() - new Date(right.publishedAt ?? 0).getTime()
        : Number(left[sortKey] ?? 0) - Number(right[sortKey] ?? 0);
    return direction === "asc" ? comparison : -comparison;
  });
  return result;
}

const WIDE_CHARACTER_PATTERN =
  /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff00-\uffef]/;

function textUnits(value: string) {
  return Array.from(value).reduce(
    (total, character) => total + (WIDE_CHARACTER_PATTERN.test(character) ? 2 : 1),
    0,
  );
}

export function splitVideoTitle(title: string, maxUnits = 24) {
  const characters = Array.from(title.trim() || "未命名视频");
  const lines: string[] = [];
  let index = 0;

  while (index < characters.length && lines.length < 2) {
    let line = "";
    let units = 0;
    while (index < characters.length) {
      const character = characters[index];
      const characterUnits = WIDE_CHARACTER_PATTERN.test(character) ? 2 : 1;
      if (line && units + characterUnits > maxUnits) break;
      line += character;
      units += characterUnits;
      index += 1;
    }
    lines.push(line.trim());
  }

  if (index < characters.length) {
    const lastIndex = lines.length - 1;
    let lastLine = lines[lastIndex];
    while (lastLine && textUnits(`${lastLine}…`) > maxUnits) {
      lastLine = Array.from(lastLine).slice(0, -1).join("");
    }
    lines[lastIndex] = `${lastLine.trimEnd()}…`;
  }

  return lines;
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

export function toTrendDeltas(totals: TrendTotal[]): TrendTotal[] {
  const deltas: TrendTotal[] = [];
  for (let index = 1; index < totals.length; index += 1) {
    const current = totals[index];
    const previous = totals[index - 1];
    deltas.push({
      date: current.date,
      likes: current.likes - previous.likes,
      collects: current.collects - previous.collects,
      comments: current.comments - previous.comments,
      shares: current.shares - previous.shares,
    });
  }
  return deltas;
}

export function aggregateAccountMetrics(videos: VideoPoint[]): AccountMetricPoint[] {
  const grouped = new Map<string, AccountMetricPoint>();
  for (const video of videos) {
    const current = grouped.get(video.accountName) ?? {
      accountName: video.accountName,
      videoCount: 0,
      likes: 0,
      collects: 0,
      comments: 0,
      shares: 0,
    };
    current.videoCount += 1;
    for (const key of METRIC_DATA_KEYS) current[key] += video[key];
    grouped.set(video.accountName, current);
  }
  return [...grouped.values()];
}

export function rankByMetric<T extends Record<MetricDataKey, number>>(
  items: T[],
  dataKey: MetricDataKey,
  limit = 8,
) {
  return [...items].sort((left, right) => right[dataKey] - left[dataKey]).slice(0, limit);
}
