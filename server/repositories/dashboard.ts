import { cache } from "react";
import type {
  Account,
  AccountPerformance,
  CrawlError,
  CrawlRun,
  DashboardData,
  DashboardSummary,
  TrendSnapshot,
  VideoRecord,
} from "@/features/dashboard/types";
import { getDb } from "@/lib/db";
import { isCollectorRunning } from "@/server/repositories/collector";

const latestSnapshotSql = `
  WITH ranked AS (
    SELECT
      ms.*,
      ROW_NUMBER() OVER (PARTITION BY ms.video_id ORDER BY ms.captured_at DESC) rank
    FROM metric_snapshots ms
    WHERE ms.capture_status IN ('success', 'partial')
  )
`;

export const getDashboardSummary = cache((): DashboardSummary => {
  const db = getDb();
  const collectorRunning = isCollectorRunning();
  const counts = db
    .prepare(
      `
        SELECT
          (SELECT COUNT(*) FROM accounts WHERE enabled = 1) enabledAccounts,
          (
            SELECT COUNT(*) FROM videos
            WHERE status = 'active' AND datetime(published_at) >= datetime('now', '-90 days')
          ) trackedVideos,
          (
            SELECT COUNT(*) FROM videos
            WHERE status = 'active' AND datetime(first_seen_at) >= datetime('now', '-14 days')
          ) newVideos
      `,
    )
    .get() as Pick<DashboardSummary, "enabledAccounts" | "trackedVideos" | "newVideos">;
  const run = db
    .prepare(
      `
        SELECT
          started_at startedAt,
          status,
          videos_succeeded videosSucceeded,
          videos_partial videosPartial,
          videos_failed videosFailed
        FROM crawl_runs
        ORDER BY started_at DESC
        LIMIT 1
      `,
    )
    .get() as
    | {
        startedAt: string;
        status: string;
        videosSucceeded: number;
        videosPartial: number;
        videosFailed: number;
      }
    | undefined;
  const delta = db
    .prepare(
      `
        WITH daily AS (
          SELECT
            ms.*,
            ROW_NUMBER() OVER (
              PARTITION BY ms.video_id, substr(ms.captured_at, 1, 10)
              ORDER BY ms.captured_at DESC
            ) dailyRank
          FROM metric_snapshots ms
          WHERE ms.capture_status IN ('success', 'partial')
        ), ranked AS (
          SELECT
            daily.*,
            ROW_NUMBER() OVER (
              PARTITION BY daily.video_id
              ORDER BY substr(daily.captured_at, 1, 10) DESC
            ) dateRank
          FROM daily
          WHERE dailyRank = 1
        ), paired AS (
          SELECT
            video_id,
            MAX(CASE WHEN dateRank = 1 THEN like_count END) currentLike,
            MAX(CASE WHEN dateRank = 2 THEN like_count END) previousLike,
            MAX(CASE WHEN dateRank = 1 THEN collect_count END) currentCollect,
            MAX(CASE WHEN dateRank = 2 THEN collect_count END) previousCollect,
            MAX(CASE WHEN dateRank = 1 THEN comment_count END) currentComment,
            MAX(CASE WHEN dateRank = 2 THEN comment_count END) previousComment,
            MAX(CASE WHEN dateRank = 1 THEN visible_share_count END) currentShare,
            MAX(CASE WHEN dateRank = 2 THEN visible_share_count END) previousShare
          FROM ranked
          WHERE dateRank <= 2
          GROUP BY video_id
        )
        SELECT
          COALESCE(SUM(CASE WHEN currentLike IS NOT NULL AND previousLike IS NOT NULL THEN currentLike - previousLike ELSE 0 END), 0) likeDelta,
          COALESCE(SUM(CASE WHEN currentCollect IS NOT NULL AND previousCollect IS NOT NULL THEN currentCollect - previousCollect ELSE 0 END), 0) collectDelta,
          COALESCE(SUM(CASE WHEN currentComment IS NOT NULL AND previousComment IS NOT NULL THEN currentComment - previousComment ELSE 0 END), 0) commentDelta,
          COALESCE(SUM(CASE WHEN currentShare IS NOT NULL AND previousShare IS NOT NULL THEN currentShare - previousShare ELSE 0 END), 0) shareDelta,
          COALESCE(SUM(CASE WHEN (currentLike IS NOT NULL AND previousLike IS NOT NULL) OR (currentCollect IS NOT NULL AND previousCollect IS NOT NULL) OR (currentComment IS NOT NULL AND previousComment IS NOT NULL) OR (currentShare IS NOT NULL AND previousShare IS NOT NULL) THEN 1 ELSE 0 END), 0) comparisonCount
        FROM paired
      `,
    )
    .get() as {
    likeDelta: number;
    collectDelta: number;
    commentDelta: number;
    shareDelta: number;
    comparisonCount: number;
  };
  const total =
    Number(run?.videosSucceeded ?? 0) + Number(run?.videosPartial ?? 0) + Number(run?.videosFailed ?? 0);
  const passed = Number(run?.videosSucceeded ?? 0) + Number(run?.videosPartial ?? 0);

  return {
    ...counts,
    collectorRunning,
    latestRunStatus: String(
      run?.status === "running" && !collectorRunning ? "interrupted" : (run?.status ?? "pending"),
    ),
    latestRunAt: run?.startedAt ?? null,
    successRate: total ? Math.round((passed / total) * 100) : 0,
    hasComparison: delta.comparisonCount > 0,
    deltas: {
      like: delta.likeDelta,
      collect: delta.collectDelta,
      comment: delta.commentDelta,
      share: delta.shareDelta,
    },
  };
});

export const getTrendData = cache((): TrendSnapshot[] => {
  return getDb()
    .prepare(
      `
        WITH daily AS (
          SELECT
            ms.*,
            ROW_NUMBER() OVER (
              PARTITION BY ms.video_id, substr(ms.captured_at, 1, 10)
              ORDER BY ms.captured_at DESC
            ) rank
          FROM metric_snapshots ms
          WHERE ms.capture_status IN ('success', 'partial')
        )
        SELECT
          substr(d.captured_at, 1, 10) date,
          v.account_id accountId,
          v.id videoId,
          v.published_at publishedAt,
          d.like_count likes,
          d.collect_count collects,
          d.comment_count comments,
          d.visible_share_count shares
        FROM daily d
        JOIN videos v ON v.id = d.video_id
        WHERE d.rank = 1 AND datetime(v.published_at) >= datetime('now', '-90 days')
        ORDER BY date ASC, v.id ASC
      `,
    )
    .all() as TrendSnapshot[];
});

export const getAccountPerformance = cache((): AccountPerformance[] => {
  return getDb()
    .prepare(
      `${latestSnapshotSql}
        SELECT
          a.id,
          a.nickname,
          a.profile_url profileUrl,
          a.profile_video_count profileVideoCount,
          a.last_scanned_at lastScannedAt,
          a.last_scan_status lastScanStatus,
          COUNT(DISTINCT CASE WHEN v.status = 'active' THEN v.id END) trackedVideos,
          COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.like_count ELSE 0 END), 0) likes,
          COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.collect_count ELSE 0 END), 0) collects,
          COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.comment_count ELSE 0 END), 0) comments,
          COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.visible_share_count ELSE 0 END), 0) shares
        FROM accounts a
        LEFT JOIN videos v
          ON v.account_id = a.id AND datetime(v.published_at) >= datetime('now', '-90 days')
        LEFT JOIN ranked r ON r.video_id = v.id AND r.rank = 1
        WHERE a.enabled = 1
        GROUP BY a.id
        ORDER BY likes DESC
      `,
    )
    .all() as AccountPerformance[];
});

export const getRecentVideos = cache((limit = 10_000): VideoRecord[] => {
  return getDb()
    .prepare(
      `
        WITH metricRanked AS (
          SELECT
            ms.*,
            ROW_NUMBER() OVER (PARTITION BY ms.video_id ORDER BY ms.captured_at DESC) rank
          FROM metric_snapshots ms
          WHERE ms.capture_status IN ('success', 'partial')
        ), attemptRanked AS (
          SELECT
            ms.*,
            ROW_NUMBER() OVER (PARTITION BY ms.video_id ORDER BY ms.captured_at DESC) rank
          FROM metric_snapshots ms
        )
        SELECT
          v.id,
          v.account_id accountId,
          v.title,
          v.video_url videoUrl,
          v.published_at publishedAt,
          v.status,
          a.nickname accountName,
          attempt.captured_at capturedAt,
          metric.captured_at metricCapturedAt,
          metric.like_count likes,
          metric.collect_count collects,
          metric.comment_count comments,
          metric.visible_share_count shares,
          attempt.capture_status captureStatus,
          attempt.quality_flags qualityFlags
        FROM videos v
        JOIN accounts a ON a.id = v.account_id
        LEFT JOIN metricRanked metric ON metric.video_id = v.id AND metric.rank = 1
        LEFT JOIN attemptRanked attempt ON attempt.video_id = v.id AND attempt.rank = 1
        WHERE datetime(v.published_at) >= datetime('now', '-90 days')
        ORDER BY datetime(v.published_at) DESC
        LIMIT ?
      `,
    )
    .all(limit) as VideoRecord[];
});

export const getRunHistory = cache((limit = 20): CrawlRun[] => {
  return getDb()
    .prepare(
      `
        SELECT
          cr.id,
          cr.trigger,
          cr.started_at startedAt,
          cr.finished_at finishedAt,
          cr.accounts_scanned accountsScanned,
          cr.videos_succeeded videosSucceeded,
          cr.videos_partial videosPartial,
          cr.videos_failed videosFailed,
          cr.status,
          cr.error_message errorMessage,
          (SELECT COUNT(*) FROM crawl_errors ce WHERE ce.crawl_run_id = cr.id) errorCount
        FROM crawl_runs cr
        ORDER BY cr.started_at DESC
        LIMIT ?
      `,
    )
    .all(limit) as CrawlRun[];
});

export const getErrors = cache((limit = 20): CrawlError[] => {
  return getDb()
    .prepare(
      `
        SELECT
          ce.id,
          ce.crawl_run_id crawlRunId,
          ce.scope,
          ce.account_id accountId,
          ce.video_id videoId,
          ce.category,
          ce.message,
          ce.screenshot_path screenshotPath,
          ce.created_at createdAt,
          a.nickname accountName,
          v.title videoTitle
        FROM crawl_errors ce
        LEFT JOIN accounts a ON a.id = ce.account_id
        LEFT JOIN videos v ON v.id = ce.video_id
        ORDER BY ce.created_at DESC
        LIMIT ?
      `,
    )
    .all(limit) as CrawlError[];
});

export const listAccounts = cache((): Account[] => {
  return getDb()
    .prepare(
      `
        SELECT
          id,
          nickname,
          profile_url profileUrl,
          profile_video_count profileVideoCount,
          last_scanned_at lastScannedAt,
          last_scan_status lastScanStatus,
          enabled
        FROM accounts
        ORDER BY enabled DESC, nickname ASC
      `,
    )
    .all() as Account[];
});

export function getDashboardData(): DashboardData {
  return {
    summary: getDashboardSummary(),
    trends: getTrendData(),
    accountPerformance: getAccountPerformance(),
    accounts: listAccounts(),
    videos: getRecentVideos(),
    runs: getRunHistory(),
    errors: getErrors(),
  };
}
