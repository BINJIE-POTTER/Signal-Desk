import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "@/lib/env";

declare global {
  var __douyinDb: Database.Database | undefined;
}

function initializeDatabase() {
  fs.mkdirSync(path.dirname(env.DATABASE_PATH), { recursive: true });
  const database = new Database(env.DATABASE_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  const schema = fs.readFileSync(path.join(process.cwd(), "lib/schema.sql"), "utf8");
  database.exec(schema);
  return database;
}

export function getDb() {
  if (!globalThis.__douyinDb) globalThis.__douyinDb = initializeDatabase();
  return globalThis.__douyinDb;
}

export function closeDb() {
  globalThis.__douyinDb?.close();
  globalThis.__douyinDb = undefined;
}
