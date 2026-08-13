import assert from "node:assert/strict";
import test from "node:test";
import { aggregateTrendSnapshots, filterAndSortVideos } from "@/features/dashboard/selectors";
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
