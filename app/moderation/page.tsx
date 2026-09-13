import { ModerationDashboard } from "../../src/components/moderation/dashboard";
import { getDatabase } from "../../src/db";
import { viewer } from "../../src/server/auth";
import { moderationDashboard } from "../../src/server/services/moderation";
import { DomainError } from "../../src/server/result";

export const metadata = { title: "Moderator dashboard", robots: { index: false } };
export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await viewer();
  if (!user)
    return (
      <main id="main" className="container page-top">
        <h1 className="page-title">Moderator dashboard</h1>
        <p className="muted">Sign in to access moderation.</p>
      </main>
    );
  let dashboard: Awaited<ReturnType<typeof moderationDashboard>> | null = null;
  try {
    const { db } = await getDatabase();
    const params = await searchParams;
    const query = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    );
    dashboard = await moderationDashboard(db, user.id, query);
  } catch (error) {
    if (!(error instanceof DomainError && (error.code === "FORBIDDEN" || error.code === "VALIDATION")))
      throw error;
  }
  if (!dashboard)
    return (
      <main id="main" className="container page-top">
        <h1 className="page-title">Access restricted</h1>
        <p className="muted">You do not have permission to view the moderator dashboard.</p>
      </main>
    );
  return (
    <main id="main" className="container page-top moderation-page">
      <p className="eyebrow">TrailNote operations</p>
      <h1 className="page-title">Moderator dashboard</h1>
      <p className="moderation-intro">Manage reports, users, and tips.</p>
      <ModerationDashboard data={dashboard} />
    </main>
  );
}
