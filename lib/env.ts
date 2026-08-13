import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_PATH: z.string().default("./data/douyin-monitor.db"),
  AUTH_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  COLLECTOR_HEADLESS: z.string().default("false"),
  COLLECTOR_SLOW_MO: z.coerce.number().nonnegative().default(250),
  COLLECTOR_PROFILE_DIR: z.string().default("./playwright-profile"),
  COLLECTOR_MAX_VIDEOS_PER_ACCOUNT: z.coerce.number().positive().default(100),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  DATABASE_PATH: path.resolve(process.cwd(), parsed.DATABASE_PATH),
  COLLECTOR_PROFILE_DIR: path.resolve(process.cwd(), parsed.COLLECTOR_PROFILE_DIR),
  COLLECTOR_HEADLESS: parsed.COLLECTOR_HEADLESS === "true",
};
