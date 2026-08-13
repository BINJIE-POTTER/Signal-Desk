import { closeDb, getDb } from "@/lib/db";

const db = getDb();
db.prepare("SELECT 1").get();

const crawlRunsDefinition = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'crawl_runs'")
  .get() as { sql: string } | undefined;

if (crawlRunsDefinition?.sql.includes("'seed'")) {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    CREATE TABLE crawl_runs_without_seed (
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
    INSERT INTO crawl_runs_without_seed SELECT * FROM crawl_runs WHERE trigger IN ('schedule','manual');
    DROP TABLE crawl_runs;
    ALTER TABLE crawl_runs_without_seed RENAME TO crawl_runs;
    CREATE INDEX IF NOT EXISTS idx_runs_started ON crawl_runs(started_at DESC);
  `);
  db.pragma("foreign_keys = ON");
}

const foreignKeyErrors = db.pragma("foreign_key_check") as unknown[];
if (foreignKeyErrors.length) throw new Error(`Foreign-key check failed: ${JSON.stringify(foreignKeyErrors)}`);
process.stdout.write("Database schema is ready.\n");
closeDb();
