import { ModerationQueue } from "../../src/components/moderation/queue";
import { getDatabase } from "../../src/db";
import { viewer } from "../../src/server/auth";
import { moderationQueues } from "../../src/server/services/moderation";
import { DomainError } from "../../src/server/result";

export const metadata = { title: "Reports", robots: { index: false } };
export default async function ModerationPage() {
  const user = await viewer();
  if (!user)
    return (
      <main id="main" className="container page-top">
        <h1 className="page-title">Reports</h1>
        <p className="muted">Sign in to access moderation.</p>
      </main>
    );
  let queue: Awaited<ReturnType<typeof moderationQueues>> | null = null;
  try {
    const { db } = await getDatabase();
    queue = await moderationQueues(db, user.id);
  } catch (error) {
    if (!(error instanceof DomainError && error.code === "FORBIDDEN"))
      throw error;
  }
  if (!queue)
    return (
      <main id="main" className="container page-top">
        <h1 className="page-title">Access restricted</h1>
        <p className="muted">You do not have permission to view reports.</p>
      </main>
    );
  return (
    <main id="main" className="container page-top moderation-page">
      <h1 className="page-title">Reports</h1>
      <ModerationQueue {...queue} />
    </main>
  );
}
