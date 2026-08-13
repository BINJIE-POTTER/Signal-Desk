import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("deletes an account and its dependent monitoring data", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "douyin-monitor-delete-test-"));
  process.env.DATABASE_PATH = path.join(directory, "test.db");

  const [{ closeDb, getDb }, { deleteAccount }] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/queries"),
  ]);
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
  } finally {
    closeDb();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
