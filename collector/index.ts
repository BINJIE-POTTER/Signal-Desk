import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { acquireLease, releaseLease } from "@/collector/lease";
import {
  detectBlocker,
  discoverVisibleVideos,
  extractProfileName,
  extractProfileVideoCount,
  extractVideoMetadata,
  extractVisibleMetrics,
  toDiscoveredVideo,
} from "@/collector/extractors";
import type { AccountRow, DiscoveredVideo, VideoRow } from "@/collector/types";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { trackingUntil } from "@/lib/metrics";

const SYSTEMIC_FAILURE_THRESHOLD = 3;
const cutoff = new Date(Date.now() - 90 * 86_400_000);
let runId = 0;

function artifactPath(name: string) {
  const directory = path.join(process.cwd(), "artifacts", `run-${runId}`);
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, name.replace(/[^a-zA-Z0-9._-]/g, "-"));
}

async function recordError(input: {
  scope: string;
  category: string;
  message: string;
  accountId?: number;
  videoId?: number;
  page?: Page;
}) {
  let screenshotPath: string | null = null;
  if (input.page) {
    screenshotPath = artifactPath(`${input.scope}-${Date.now()}.png`);
    await input.page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => undefined);
  }
  getDb()
    .prepare(
      "INSERT INTO crawl_errors (crawl_run_id, scope, account_id, video_id, category, message, screenshot_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      runId,
      input.scope,
      input.accountId ?? null,
      input.videoId ?? null,
      input.category,
      input.message.slice(0, 1000),
      screenshotPath,
    );
}

function upsertVideo(accountId: number, item: DiscoveredVideo) {
  const db = getDb();
  const publishedAt = item.publishedAt;
  const tracking = publishedAt ? trackingUntil(publishedAt) : null;
  db.prepare(
    `
    INSERT INTO videos (account_id, douyin_video_id, video_url, title, published_at, tracking_until)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, video_url) DO UPDATE SET
      title = COALESCE(excluded.title, videos.title), published_at = COALESCE(excluded.published_at, videos.published_at),
      tracking_until = COALESCE(excluded.tracking_until, videos.tracking_until), last_seen_at = CURRENT_TIMESTAMP,
      status = CASE WHEN excluded.published_at IS NOT NULL AND datetime(excluded.published_at) >= datetime('now','-90 days') THEN 'active' ELSE videos.status END
  `,
  ).run(accountId, item.douyinVideoId, item.videoUrl, item.title, publishedAt, tracking);
}

async function scanProfile(page: Page, account: AccountRow) {
  await page.goto(account.profile_url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(2_000);
  const blocker = await detectBlocker(page);
  if (blocker) throw new Error(`SYSTEMIC:${blocker}`);
  const profileName = await extractProfileName(page);
  const profileVideoCount = await extractProfileVideoCount(page);
  let previousCount = 0;
  let stagnantRounds = 0;
  const discovered = new Map<string, DiscoveredVideo>();
  for (let round = 0; round < 30 && discovered.size < env.COLLECTOR_MAX_VIDEOS_PER_ACCOUNT; round += 1) {
    const visible = await discoverVisibleVideos(page, profileName);
    for (const item of visible) discovered.set(item.href, toDiscoveredVideo(item));
    const knownDates = [...discovered.values()].flatMap((item) =>
      item.publishedAt ? [new Date(item.publishedAt)] : [],
    );
    if (knownDates.some((date) => date < cutoff)) break;
    stagnantRounds = discovered.size === previousCount ? stagnantRounds + 1 : 0;
    if (stagnantRounds >= 3) break;
    previousCount = discovered.size;
    await page.mouse.wheel(0, 1_400);
    await page.waitForTimeout(900 + Math.floor(Math.random() * 500));
  }
  for (const item of discovered.values()) upsertVideo(account.id, item);
  getDb()
    .prepare(
      "UPDATE accounts SET nickname = COALESCE(?, nickname), profile_video_count = ?, last_scanned_at = CURRENT_TIMESTAMP, last_scan_status = 'success', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .run(profileName, profileVideoCount, account.id);
}

async function captureVideo(page: Page, video: VideoRow) {
  try {
    await page.goto(video.video_url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1_500);
    const blocker = await detectBlocker(page);
    if (blocker) throw new Error(`SYSTEMIC:${blocker}`);
    await page
      .getByText(/发布时间[:：]\s*20\d{2}/)
      .first()
      .waitFor({ state: "attached", timeout: 8_000 })
      .catch(() => undefined);
    const metadata = await extractVideoMetadata(page);
    if (metadata.publishedAt || metadata.title) {
      getDb()
        .prepare(
          `UPDATE videos SET
        published_at = COALESCE(published_at, ?),
        tracking_until = COALESCE(tracking_until, ?),
        title = COALESCE(?, title),
        status = CASE WHEN ? IS NOT NULL AND datetime(?) < datetime('now', '-90 days') THEN 'expired' ELSE status END
        WHERE id = ?`,
        )
        .run(
          metadata.publishedAt,
          metadata.publishedAt ? trackingUntil(metadata.publishedAt) : null,
          metadata.title,
          metadata.publishedAt,
          metadata.publishedAt,
          video.id,
        );
    }
    if (!metadata.publishedAt)
      throw new Error("Published date was not available after waiting for the detail page.");
    if (metadata.publishedAt && new Date(metadata.publishedAt) < cutoff) return "expired";
    const metrics = await extractVisibleMetrics(page);
    const available = [
      metrics.like.value,
      metrics.collect.value,
      metrics.comment.value,
      metrics.share.value,
    ].filter((value) => value !== null).length;
    const status = available === 4 ? "success" : available > 0 ? "partial" : "failed";
    getDb()
      .prepare(
        `INSERT INTO metric_snapshots
      (video_id, crawl_run_id, like_count, collect_count, comment_count, visible_share_count, raw_like_text, raw_collect_text, raw_comment_text, raw_share_text, capture_status, quality_flags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        video.id,
        runId,
        metrics.like.value,
        metrics.collect.value,
        metrics.comment.value,
        metrics.share.value,
        metrics.like.raw,
        metrics.collect.raw,
        metrics.comment.raw,
        metrics.share.raw,
        status,
        JSON.stringify(metrics.qualityFlags),
      );
    getDb()
      .prepare("UPDATE videos SET consecutive_failures = 0, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(video.id);
    return status;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("SYSTEMIC:")) throw error;
    await recordError({
      scope: "video",
      category: "navigation",
      message: error instanceof Error ? error.message : String(error),
      videoId: video.id,
      page,
    });
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO metric_snapshots
          (video_id, crawl_run_id, capture_status, quality_flags)
         VALUES (?, ?, 'failed', '["capture_error"]')`,
      )
      .run(video.id, runId);
    getDb()
      .prepare("UPDATE videos SET consecutive_failures = consecutive_failures + 1 WHERE id = ?")
      .run(video.id);
    return "failed";
  }
}

async function processAccount(context: BrowserContext, account: AccountRow) {
  const page = await context.newPage();
  try {
    await scanProfile(page, account);
    const videos = getDb()
      .prepare(
        "SELECT id, video_url, title, published_at FROM videos WHERE account_id = ? AND status = 'active' AND (published_at IS NULL OR datetime(published_at) >= datetime('now','-90 days')) ORDER BY published_at DESC",
      )
      .all(account.id) as VideoRow[];
    let systemicFailures = 0;
    for (const video of videos) {
      try {
        const status = await captureVideo(page, video);
        getDb()
          .prepare(
            `UPDATE crawl_runs SET videos_succeeded = videos_succeeded + ?, videos_partial = videos_partial + ?, videos_failed = videos_failed + ? WHERE id = ?`,
          )
          .run(
            status === "success" ? 1 : 0,
            status === "partial" ? 1 : 0,
            status === "failed" ? 1 : 0,
            runId,
          );
        systemicFailures = status === "failed" ? systemicFailures + 1 : 0;
        if (systemicFailures >= SYSTEMIC_FAILURE_THRESHOLD) throw new Error("SYSTEMIC:page_changed");
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("SYSTEMIC:")) throw error;
      }
      await page.waitForTimeout(1_000 + Math.floor(Math.random() * 1_000));
    }
    getDb().prepare("UPDATE crawl_runs SET accounts_scanned = accounts_scanned + 1 WHERE id = ?").run(runId);
  } catch (error) {
    const category =
      error instanceof Error && error.message.startsWith("SYSTEMIC:")
        ? error.message.split(":")[1]
        : "navigation";
    getDb()
      .prepare(
        "UPDATE accounts SET last_scanned_at = CURRENT_TIMESTAMP, last_scan_status = 'failed' WHERE id = ?",
      )
      .run(account.id);
    await recordError({
      scope: "account",
      category,
      message: error instanceof Error ? error.message : String(error),
      accountId: account.id,
      page,
    });
    throw error;
  } finally {
    await page.close();
  }
}

async function main() {
  const requestedAccountId = Number(process.env.COLLECTOR_ACCOUNT_ID || 0);
  while (!acquireLease()) {
    if (!requestedAccountId) throw new Error("A collector task is already running.");
    const requestedAccount = getDb()
      .prepare("SELECT last_scan_status status FROM accounts WHERE id = ? AND enabled = 1")
      .get(requestedAccountId) as { status: string } | undefined;
    if (!requestedAccount || requestedAccount.status !== "pending") return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10_000));
  }
  const started = getDb()
    .prepare("INSERT INTO crawl_runs (trigger, status) VALUES (?, 'running')")
    .run(process.env.COLLECTOR_TRIGGER === "manual" ? "manual" : "schedule");
  runId = Number(started.lastInsertRowid);
  getDb()
    .prepare(
      "UPDATE videos SET status = 'expired' WHERE status = 'active' AND tracking_until IS NOT NULL AND datetime(tracking_until) < datetime('now')",
    )
    .run();
  let context: BrowserContext | null = null;
  try {
    context = await chromium.launchPersistentContext(env.COLLECTOR_PROFILE_DIR, {
      headless: env.COLLECTOR_HEADLESS,
      channel: "chrome",
      slowMo: env.COLLECTOR_SLOW_MO,
      viewport: env.COLLECTOR_HEADLESS ? { width: 1440, height: 960 } : null,
    });
    const initialPages = context.pages();
    await Promise.all(initialPages.map((page) => page.close()));
    let accounts = (
      requestedAccountId
        ? getDb()
            .prepare(
              "SELECT id, nickname, profile_url FROM accounts WHERE enabled = 1 AND last_scan_status = 'pending' ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, id",
            )
            .all(requestedAccountId)
        : getDb()
            .prepare("SELECT id, nickname, profile_url FROM accounts WHERE enabled = 1 ORDER BY id")
            .all()
    ) as AccountRow[];
    const processedAccountIds = new Set<number>();
    while (accounts.length) {
      for (const account of accounts) {
        await processAccount(context, account);
        processedAccountIds.add(account.id);
      }
      accounts = (
        getDb()
          .prepare(
            "SELECT id, nickname, profile_url FROM accounts WHERE enabled = 1 AND last_scan_status = 'pending' ORDER BY id",
          )
          .all() as AccountRow[]
      ).filter((account) => !processedAccountIds.has(account.id));
    }
    const stats = getDb()
      .prepare("SELECT videos_partial, videos_failed FROM crawl_runs WHERE id = ?")
      .get(runId) as { videos_partial: number; videos_failed: number };
    const status = stats.videos_failed > 0 || stats.videos_partial > 0 ? "partial" : "success";
    getDb()
      .prepare("UPDATE crawl_runs SET finished_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?")
      .run(status, runId);
  } catch (error) {
    getDb()
      .prepare(
        "UPDATE crawl_runs SET finished_at = CURRENT_TIMESTAMP, status = 'failed', error_message = ? WHERE id = ?",
      )
      .run(error instanceof Error ? error.message.slice(0, 1000) : String(error), runId);
    throw error;
  } finally {
    await context?.close();
    releaseLease();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
