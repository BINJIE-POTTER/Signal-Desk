import argon2 from "argon2";
import { closeDb, getDb } from "@/lib/db";

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password || password.length < 12)
    throw new Error("Usage: npm run auth:create -- <username> <password-at-least-12-chars>");
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  getDb()
    .prepare(
      "INSERT INTO app_users (username, password_hash) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash",
    )
    .run(username, hash);
  process.stdout.write(`User ${username} is ready.\n`);
  closeDb();
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
