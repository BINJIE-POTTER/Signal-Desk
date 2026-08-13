import { DashboardConsole } from "@/components/dashboard-console";
import { requireSession } from "@/lib/auth";
import {
  getAccountPerformance,
  getDashboardSummary,
  getErrors,
  getRecentVideos,
  getRunHistory,
  getTrendData,
  listAccounts,
} from "@/lib/queries";

export default async function DashboardPage() {
  const session = await requireSession();
  const summary = getDashboardSummary();
  const trends = getTrendData();
  const accountPerformance = getAccountPerformance();
  const accounts = listAccounts();
  const videos = getRecentVideos(250);
  const runs = getRunHistory(20);
  const errors = getErrors(20);

  return (
    <DashboardConsole
      username={session.username}
      summary={summary}
      trends={trends}
      accountPerformance={accountPerformance}
      accounts={accounts}
      videos={videos}
      runs={runs}
      errors={errors}
    />
  );
}
