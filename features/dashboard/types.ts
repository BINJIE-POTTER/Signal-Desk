export type DashboardView = "overview" | "trends" | "accounts" | "videos" | "system";
export type MetricDataKey = "likes" | "collects" | "comments" | "shares";
export const METRIC_DATA_KEYS = [
  "likes",
  "collects",
  "comments",
  "shares",
] as const satisfies readonly MetricDataKey[];
export type MetricKey = "like" | "collect" | "comment" | "share";
export type PeriodDays = 30 | 60 | 90;
export type VideoSortKey = MetricDataKey | "publishedAt";
export type SortDirection = "asc" | "desc";

export type DashboardSummary = {
  enabledAccounts: number;
  trackedVideos: number;
  newVideos: number;
  collectorRunning: boolean;
  latestRunStatus: string;
  latestRunAt: string | null;
  successRate: number;
  hasComparison: boolean;
  deltas: Record<MetricKey, number>;
};

export type TrendSnapshot = {
  date: string;
  accountId: number;
  videoId: number;
  publishedAt: string;
  likes: number;
  collects: number;
  comments: number;
  shares: number;
};

export type TrendTotal = Pick<TrendSnapshot, "date" | MetricDataKey>;

export type Account = {
  id: number;
  nickname: string;
  profileUrl: string;
  profileVideoCount: number | null;
  lastScannedAt: string | null;
  lastScanStatus: string;
  enabled: number;
};

export type AccountPerformance = {
  id: number;
  nickname: string;
  profileUrl: string;
  profileVideoCount: number | null;
  lastScannedAt: string | null;
  lastScanStatus: string;
  trackedVideos: number;
  likes: number;
  collects: number;
  comments: number;
  shares: number;
};

export type VideoRecord = {
  id: number;
  accountId: number;
  title: string | null;
  videoUrl: string;
  publishedAt: string | null;
  status: string;
  accountName: string;
  capturedAt: string | null;
  metricCapturedAt: string | null;
  likes: number | null;
  collects: number | null;
  comments: number | null;
  shares: number | null;
  captureStatus: string | null;
  qualityFlags: string | null;
};

export type VideoPoint = {
  id: number;
  title: string;
  accountName: string;
  publishedAt: string;
  likes: number;
  collects: number;
  comments: number;
  shares: number;
};

export type AccountMetricPoint = {
  accountName: string;
  videoCount: number;
  likes: number;
  collects: number;
  comments: number;
  shares: number;
};

export type CrawlRun = {
  id: number;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  accountsScanned: number;
  videosSucceeded: number;
  videosPartial: number;
  videosFailed: number;
  status: string;
  errorMessage: string | null;
  errorCount: number;
};

export type CrawlError = {
  id: number;
  crawlRunId: number;
  scope: string;
  accountId: number | null;
  videoId: number | null;
  category: string;
  message: string;
  screenshotPath: string | null;
  createdAt: string;
  accountName: string | null;
  videoTitle: string | null;
};

export type DashboardData = {
  summary: DashboardSummary;
  trends: TrendSnapshot[];
  accountPerformance: AccountPerformance[];
  accounts: Account[];
  videos: VideoRecord[];
  runs: CrawlRun[];
  errors: CrawlError[];
};
