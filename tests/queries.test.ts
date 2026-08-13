import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("deletes an account and its dependent monitoring data", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "douyin-monitor-delete-test-"));
  process.env.DATABASE_PATH = path.join(directory, "test.db");

  const [{ closeDb, getDb }, { deleteAccount }, { getDashboardSummary, getRecentVideos }] = await Promise.all(
    [import("@/lib/db"), import("@/server/repositories/accounts"), import("@/server/repositories/dashboard")],
  );
  const db = getDb();

  try {
    const account = db
      .prepare("INSERT INTO accounts (nickname, profile_url) VALUES (?, ?) RETURNING id")
      .get("测试账号", "https://www.douyin.com/user/delete-test") as { id: number };
    const video = db
      .prepare("INSERT INTO videos (account_id, video_url) VALUES (?, ?) RETURNING id")
      .get(account.id, "https://www.douyin.com/video/delete-test") as { id: number };
    const run = db
      .prepare("INSERT INTO crawl_runs (trigger, status) VALUES ('manual', 'success') RETURNING id")
      .get() as { id: number };
    db.prepare(
      "INSERT INTO metric_snapshots (video_id, crawl_run_id, capture_status) VALUES (?, ?, 'success')",
    ).run(video.id, run.id);
    db.prepare(
      "INSERT INTO crawl_errors (crawl_run_id, scope, account_id, video_id, category, message) VALUES (?, 'video', ?, ?, 'test', 'test')",
    ).run(run.id, account.id, video.id);

    assert.equal(deleteAccount(account.id), true);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM accounts").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM videos").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM metric_snapshots").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM crawl_errors").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM crawl_runs").get().count, 1);

    const deltaAccount = db
      .prepare("INSERT INTO accounts (nickname, profile_url) VALUES (?, ?) RETURNING id")
      .get("测试账号", "https://www.douyin.com/user/delta-test") as { id: number };
    const deltaVideo = db
      .prepare(
        "INSERT INTO videos (account_id, video_url, published_at) VALUES (?, ?, datetime('now', '-1 day')) RETURNING id",
      )
      .get(deltaAccount.id, "https://www.douyin.com/video/delta-test") as { id: number };
    const insertRun = db.prepare(
      "INSERT INTO crawl_runs (trigger, status, started_at) VALUES ('manual', 'success', ?) RETURNING id",
    );
    const insertSnapshot = db.prepare(
      `INSERT INTO metric_snapshots
        (video_id, crawl_run_id, captured_at, like_count, collect_count, comment_count, visible_share_count, capture_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'success')`,
    );
    const firstRun = insertRun.get("2026-08-12T09:00:00.000Z") as { id: number };
    const sameDayRun = insertRun.get("2026-08-12T18:00:00.000Z") as { id: number };
    const latestRun = insertRun.get("2026-08-13T09:00:00.000Z") as { id: number };
    insertSnapshot.run(deltaVideo.id, firstRun.id, "2026-08-12T09:00:00.000Z", 10, 5, 2, 1);
    insertSnapshot.run(deltaVideo.id, sameDayRun.id, "2026-08-12T18:00:00.000Z", 20, 8, 3, 2);
    insertSnapshot.run(deltaVideo.id, latestRun.id, "2026-08-13T09:00:00.000Z", 35, 12, 7, 5);
    const failedRun = insertRun.get("2026-08-14T09:00:00.000Z") as { id: number };
    db.prepare(
      `INSERT INTO metric_snapshots
        (video_id, crawl_run_id, captured_at, capture_status)
       VALUES (?, ?, ?, 'failed')`,
    ).run(deltaVideo.id, failedRun.id, "2026-08-14T09:00:00.000Z");

    const summary = getDashboardSummary();
    assert.equal(summary.hasComparison, true);
    assert.deepEqual(summary.deltas, { like: 15, collect: 4, comment: 4, share: 3 });
    const latestVideo = getRecentVideos(1)[0];
    assert.equal(latestVideo.captureStatus, "failed");
    assert.equal(latestVideo.likes, 35);
    assert.equal(latestVideo.metricCapturedAt, "2026-08-13T09:00:00.000Z");
  } finally {
    closeDb();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
