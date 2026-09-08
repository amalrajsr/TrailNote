import { redirect } from "next/navigation";
import { MyContributions } from "../../src/components/account/contributions";
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
  const tips = await accountContributions(db, user.id, filter);
  return (
    <main id="main" className="container page-top account-page">
      <div className="row between">
        <div>
          <h1 className="page-title">My contributions</h1>
          <p className="muted">{user.name}</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Contribution status">
        <a className={filter === "all" ? "selected" : ""} href="/me">
          All
        </a>
        <a
          className={filter === "published" ? "selected" : ""}
          href="/me?status=published"
        >
          Published
        </a>
        <a
          className={filter === "hidden" ? "selected" : ""}
          href="/me?status=hidden"
        >
          Hidden
        </a>
      </nav>
      <MyContributions tips={tips} />
    </main>
  );
}
