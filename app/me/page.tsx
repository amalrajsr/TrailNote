import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyContributions } from "../../src/components/account/contributions";
import { AccountProfileEditor } from "../../src/components/account/profile-editor";
import { getDatabase } from "../../src/db";
import { viewer } from "../../src/server/auth";
import { accountContributions } from "../../src/server/queries/account";

export const metadata = { title: "Profile", robots: { index: false } };
export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await viewer();
  if (!user) redirect("/sign-in?returnTo=/me");
  const { status } = await searchParams;
  const filter =
    status === "published" || status === "hidden" || status === "deleted"
      ? status
      : "all";
  const { db } = await getDatabase();
  const allTips = await accountContributions(db, user.id);
  const activeTips = allTips.filter((tip) => tip.status !== "deleted");
  const tips =
    filter === "all"
      ? activeTips
      : allTips.filter((tip) => tip.status === filter);
  const counts = {
    all: activeTips.length,
    published: allTips.filter((tip) => tip.status === "published").length,
    hidden: allTips.filter((tip) => tip.status === "hidden").length,
    deleted: allTips.filter((tip) => tip.status === "deleted").length,
  };
  return (
    <main id="main" className="container page-top account-page">
      <AccountProfileEditor
        id={user.id}
        name={user.name}
        username={user.username}
        avatar={user.avatar}
        bio={user.bio}
        instagramUrl={user.instagramUrl}
        youtubeUrl={user.youtubeUrl}
        joinedYear={new Date(user.createdAt).getUTCFullYear()}
        tipsSharedCount={counts.all}
        placesCount={
          new Set(activeTips.map((tip) => tip.destination.slug)).size
        }
      />

      <section id="contributions" aria-labelledby="your-contributions">
        <div className="contributions-head">
          <div>
            <div className="section-kicker">Your TrailNotes</div>
            <h2 id="your-contributions">Your contributions</h2>
            <p>
              Manage the practical tips you have shared with other travellers.
            </p>
          </div>
          <Link className="btn account-share-tip" href="/search">
            <Plus size={17} aria-hidden="true" /> Share a tip
          </Link>
        </div>

        <div className="toolbar">
          <nav className="tabs" aria-label="Tip status">
            <Link
              className={filter === "all" ? "tab selected" : "tab"}
              aria-current={filter === "all" ? "page" : undefined}
              href="/me"
            >
              All <span className="count">{counts.all}</span>
            </Link>
            <Link
              className={filter === "published" ? "tab selected" : "tab"}
              aria-current={filter === "published" ? "page" : undefined}
              href="/me?status=published"
            >
              Published <span className="count">{counts.published}</span>
            </Link>
            <Link
              className={filter === "hidden" ? "tab selected" : "tab"}
              aria-current={filter === "hidden" ? "page" : undefined}
              href="/me?status=hidden"
            >
              Hidden <span className="count">{counts.hidden}</span>
            </Link>
            <Link
              className={filter === "deleted" ? "tab selected" : "tab"}
              aria-current={filter === "deleted" ? "page" : undefined}
              href="/me?status=deleted"
            >
              Deleted <span className="count">{counts.deleted}</span>
            </Link>
          </nav>
        </div>

        <MyContributions tips={tips} />
      </section>
    </main>
  );
}
