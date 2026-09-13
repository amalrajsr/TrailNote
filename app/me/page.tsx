import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AccountSignOut,
  MyContributions,
} from "../../src/components/account/contributions";
import { getDatabase } from "../../src/db";
import { viewer } from "../../src/server/auth";
import { accountContributions } from "../../src/server/queries/account";

export const metadata = { title: "My contributions", robots: { index: false } };
export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await viewer();
  if (!user) redirect("/sign-in?returnTo=/me");
  const { status } = await searchParams;
  const filter = status === "published" || status === "hidden" ? status : "all";
  const { db } = await getDatabase();
  const allTips = await accountContributions(db, user.id);
  const tips =
    filter === "all" ? allTips : allTips.filter((tip) => tip.status === filter);
  const counts = {
    all: allTips.length,
    published: allTips.filter((tip) => tip.status === "published").length,
    hidden: allTips.filter((tip) => tip.status === "hidden").length,
  };
  const initial = Array.from(user.name)[0]?.toUpperCase() ?? "T";

  return (
    <main id="main" className="container page-top account-page">
      <header className="account-hero">
        <div className="account-heading">
          <p className="eyebrow">Your TrailNote</p>
          <h1 className="page-title">My contributions</h1>
          <p>Everything you&apos;ve shared to help another traveler.</p>
        </div>
        <div className="account-profile">
          <span className="account-avatar" aria-hidden="true">
            {initial}
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>TrailNote contributor</span>
          </div>
          <AccountSignOut />
        </div>
      </header>

      <div className="account-toolbar">
        <nav className="tabs account-tabs" aria-label="Contribution status">
          <Link
            className={filter === "all" ? "selected" : ""}
            aria-current={filter === "all" ? "page" : undefined}
            href="/me"
          >
            All <span>{counts.all}</span>
          </Link>
          <Link
            className={filter === "published" ? "selected" : ""}
            aria-current={filter === "published" ? "page" : undefined}
            href="/me?status=published"
          >
            Published <span>{counts.published}</span>
          </Link>
          <Link
            className={filter === "hidden" ? "selected" : ""}
            aria-current={filter === "hidden" ? "page" : undefined}
            href="/me?status=hidden"
          >
            Hidden <span>{counts.hidden}</span>
          </Link>
        </nav>
        <Link className="btn account-add" href="/search">
          <Plus size={17} aria-hidden="true" /> Share a tip
        </Link>
      </div>
      <MyContributions tips={tips} />
    </main>
  );
}
