PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  profile_url TEXT NOT NULL UNIQUE,
  douyin_account_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  profile_video_count INTEGER,
  last_scanned_at TEXT,
  last_scan_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  douyin_video_id TEXT UNIQUE,
  video_url TEXT NOT NULL,
  title TEXT,
  published_at TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tracking_until TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','unavailable','removed')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  UNIQUE(account_id, video_url)
);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  trigger TEXT NOT NULL CHECK(trigger IN ('schedule','manual')),
  status TEXT NOT NULL CHECK(status IN ('running','success','partial','failed')),
  accounts_scanned INTEGER NOT NULL DEFAULT 0,
  videos_succeeded INTEGER NOT NULL DEFAULT 0,
  videos_partial INTEGER NOT NULL DEFAULT 0,
  videos_failed INTEGER NOT NULL DEFAULT 0,
  collector_version TEXT NOT NULL DEFAULT '0.1.0',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  like_count INTEGER,
  collect_count INTEGER,
  comment_count INTEGER,
  visible_share_count INTEGER,
  raw_like_text TEXT,
  raw_collect_text TEXT,
  raw_comment_text TEXT,
  raw_share_text TEXT,
  capture_status TEXT NOT NULL CHECK(capture_status IN ('success','partial','failed')),
  quality_flags TEXT NOT NULL DEFAULT '[]',
  UNIQUE(video_id, crawl_run_id)
);

CREATE TABLE IF NOT EXISTS crawl_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_lease (
  name TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_videos_account_published ON videos(account_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_video_captured ON metric_snapshots(video_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_started ON crawl_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_run ON crawl_errors(crawl_run_id, created_at DESC);
