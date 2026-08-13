import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanProfileName,
  parsePublishedDate,
  parseVisibleMetricSet,
  toDiscoveredVideo,
} from "@/collector/extractors";

const now = new Date("2026-08-13T10:00:00.000Z");

test("parses full and short Douyin-style dates", () => {
  assert.equal(parsePublishedDate("发布于 2026-07-20", now), "2026-07-20T12:00:00.000Z");
  assert.equal(parsePublishedDate("08月01日", now), "2026-08-01T12:00:00.000Z");
  assert.equal(parsePublishedDate("发布时间：2026-06-20 21:07", now), "2026-06-20T13:07:00.000Z");
});

test("extracts stable video id from canonical URL", () => {
  assert.deepEqual(
    toDiscoveredVideo(
      { href: "https://www.douyin.com/video/74123456789", title: "示例", text: "2026-08-01" },
      now,
    ),
    {
      douyinVideoId: "74123456789",
      videoUrl: "https://www.douyin.com/video/74123456789",
      title: "示例",
      publishedAt: "2026-08-01T12:00:00.000Z",
    },
  );
});

test("normalizes profile names from Douyin metadata", () => {
  assert.equal(cleanProfileName("阿柴的抖音主页 - 抖音"), "阿柴");
  assert.equal(cleanProfileName("山里日记 | 抖音"), "山里日记");
  assert.equal(cleanProfileName("抖音"), null);
});

test("maps current Douyin player counters in semantic order", () => {
  assert.deepEqual(parseVisibleMetricSet("6.4万", "2030", "2701", "2.8万"), {
    like: { raw: "6.4万", value: 64_000 },
    collect: { raw: "2030", value: 2_030 },
    comment: { raw: "2701", value: 2_701 },
    share: { raw: "2.8万", value: 28_000 },
    qualityFlags: [],
  });
});
