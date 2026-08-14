import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateAccountMetrics,
  aggregateTrendSnapshots,
  filterAndSortVideos,
  rankByMetric,
  splitVideoTitle,
  toTrendDeltas,
  toVideoPoint,
} from "@/features/dashboard/selectors";
import type { TrendSnapshot, VideoRecord } from "@/features/dashboard/types";

const now = Date.now();
const recentDate = new Date(now - 10 * 86_400_000).toISOString();
const oldDate = new Date(now - 100 * 86_400_000).toISOString();

function video(overrides: Partial<VideoRecord> = {}): VideoRecord {
  return {
    id: 1,
    accountId: 1,
    title: "测试视频",
    videoUrl: "https://www.douyin.com/video/test",
    publishedAt: recentDate,
    status: "active",
    accountName: "测试账号",
    capturedAt: recentDate,
    metricCapturedAt: recentDate,
    likes: 10,
    collects: 5,
    comments: 2,
    shares: 1,
    captureStatus: "success",
    qualityFlags: "[]",
    ...overrides,
  };
}

test("filters videos once by account, period, status and query before sorting", () => {
  const result = filterAndSortVideos(
    [
      video({ id: 1, title: "保留", likes: 20 }),
      video({ id: 2, title: "保留二", likes: 50 }),
      video({ id: 3, accountId: 2, title: "保留", likes: 100 }),
      video({ id: 4, title: "保留", publishedAt: oldDate, likes: 200 }),
      video({ id: 5, title: "其他", likes: 300 }),
      video({ id: 6, title: "保留", captureStatus: "failed", likes: 400 }),
    ],
    { accountId: "1", period: 90, query: "保留", status: "success", sortKey: "likes" },
  );

  assert.deepEqual(
    result.map((item) => item.id),
    [2, 1],
  );
});

test("sorts videos in either direction", () => {
  const videos = [video({ id: 1, likes: 20 }), video({ id: 2, likes: 50 })];
  const filters = { accountId: "all", period: 90 as const, sortKey: "likes" as const };

  assert.deepEqual(
    filterAndSortVideos(videos, { ...filters, sortDirection: "desc" }).map((item) => item.id),
    [2, 1],
  );
  assert.deepEqual(
    filterAndSortVideos(videos, { ...filters, sortDirection: "asc" }).map((item) => item.id),
    [1, 2],
  );
});

test("splits long chart titles into at most two bounded lines", () => {
  const lines = splitVideoTitle("这是一个非常非常长的视频标题用于验证不会再从柱状图左侧溢出");

  assert.equal(lines.length, 2);
  assert.match(lines[1], /…$/);
  assert.ok(lines.every((line) => Array.from(line).length <= 12));
});

test("aggregates one trend row per date after applying account and publish-period filters", () => {
  const base: TrendSnapshot = {
    date: "2026-08-10",
    accountId: 1,
    videoId: 1,
    publishedAt: recentDate,
    likes: 10,
    collects: 5,
    comments: 2,
    shares: 1,
  };
  const result = aggregateTrendSnapshots(
    [
      base,
      { ...base, videoId: 2, likes: 20 },
      { ...base, accountId: 2, videoId: 3, likes: 100 },
      { ...base, videoId: 4, publishedAt: oldDate, likes: 200 },
    ],
    { accountId: "1", period: 90 },
  );

  assert.deepEqual(result, [{ date: "2026-08-10", likes: 30, collects: 10, comments: 4, shares: 2 }]);
});

test("computes week-over-week trend deltas and keeps negative changes", () => {
  const totals = [
    { date: "2026-08-03", likes: 10, collects: 4, comments: 2, shares: 1 },
    { date: "2026-08-10", likes: 40, collects: 9, comments: 2, shares: 0 },
  ];

  assert.deepEqual(toTrendDeltas(totals), [
    { date: "2026-08-10", likes: 30, collects: 5, comments: 0, shares: -1 },
  ]);
  assert.deepEqual(toTrendDeltas(totals.slice(0, 1)), []);
});

test("aggregates and ranks account metrics from filtered videos", () => {
  const videos = [
    toVideoPoint(video({ id: 1, accountName: "甲", likes: 10, collects: 2, comments: 1, shares: 0 })),
    toVideoPoint(video({ id: 2, accountName: "甲", likes: 5, collects: 1, comments: 1, shares: 1 })),
    toVideoPoint(video({ id: 3, accountName: "乙", likes: 40, collects: 3, comments: 0, shares: 2 })),
  ];

  assert.deepEqual(aggregateAccountMetrics(videos), [
    { accountName: "甲", videoCount: 2, likes: 15, collects: 3, comments: 2, shares: 1 },
    { accountName: "乙", videoCount: 1, likes: 40, collects: 3, comments: 0, shares: 2 },
  ]);
  assert.deepEqual(
    rankByMetric(aggregateAccountMetrics(videos), "likes").map((item) => item.accountName),
    ["乙", "甲"],
  );
});
