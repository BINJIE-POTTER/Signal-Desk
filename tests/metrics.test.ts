import assert from "node:assert/strict";
import test from "node:test";
import { calculateDelta, parseVisibleCount, trackingUntil } from "@/lib/metrics";

test("parses Chinese and western compact counts", () => {
  assert.equal(parseVisibleCount("1.2万"), 12_000);
  assert.equal(parseVisibleCount("3,420"), 3_420);
  assert.equal(parseVisibleCount("8.5w"), 85_000);
  assert.equal(parseVisibleCount("2K"), 2_000);
  assert.equal(parseVisibleCount("—"), null);
  assert.equal(parseVisibleCount("收藏"), null);
});

test("calculates positive and negative deltas without hiding corrections", () => {
  assert.deepEqual(calculateDelta(150, 100), { value: 50, flags: [] });
  assert.deepEqual(calculateDelta(90, 100), { value: -10, flags: ["negative_delta"] });
  assert.deepEqual(calculateDelta(null, 100), { value: null, flags: [] });
});

test("expires tracking ninety days after publication", () => {
  assert.equal(trackingUntil("2026-01-01T00:00:00.000Z"), "2026-04-01T00:00:00.000Z");
});
