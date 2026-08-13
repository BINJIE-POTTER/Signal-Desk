import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/server/repositories/dashboard";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = getDashboardData();

  return <DashboardShell username={session.username} data={data} />;
}
