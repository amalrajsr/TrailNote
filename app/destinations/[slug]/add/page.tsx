import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabase } from "../../../../src/db";
import { categories, type Category } from "../../../../src/lib/constants";
import { destinationBySlug } from "../../../../src/server/queries/destinations";
import { ContributionComposer } from "../../../../src/components/contributions/composer";
import { viewer } from "../../../../src/server/auth";

export const metadata = {
  title: "Share a travel tip",
  robots: { index: false },
};

export default async function AddContributionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { db } = await getDatabase();
  const [destination, user] = await Promise.all([
    destinationBySlug(db, slug),
    viewer(),
  ]);
  if (!destination) notFound();

  const initialCategory = categories.includes(query.category as Category)
    ? (query.category as Category)
    : "general";
  const initialMutationId = crypto.randomUUID();

  return (
    <main id="main" className="container composer-page">
      <div className="composer-wrap">
        <Link className="back" href={`/destinations/${slug}`}>
          ← Back to {destination.name}
        </Link>
        <div className="composer-layout">
          <section className="composer-main" aria-labelledby="composer-title">
            <h1 id="composer-title" className="page-title">
              Help the next traveller.
            </h1>
            <p className="composer-intro">One useful detail is enough.</p>
            <ContributionComposer
              key={initialMutationId}
              destination={destination}
              initialCategory={initialCategory}
              initialMutationId={initialMutationId}
              signedIn={!!user}
            />
          </section>
          <aside className="composer-help" aria-labelledby="useful-tip-title">
            <h2 id="useful-tip-title">What makes a tip useful?</h2>
            <p>
              Think about the traveller who will arrive after you. What would
              have made your own trip easier?
            </p>
            <div className="composer-help-list">
              <div className="composer-help-item">
                <span
                  className="composer-help-icon"
                  aria-hidden="true"
                  data-marker="₹"
                />
                <div>
                  <strong>How much?</strong>
                  <span>Room price, fare, meal cost, entry fee.</span>
                </div>
              </div>
              <div className="composer-help-item">
                <span
                  className="composer-help-icon"
                  aria-hidden="true"
                  data-marker="→"
                />
                <div>
                  <strong>How do I get there?</strong>
                  <span>Route, boarding point, walking direction.</span>
                </div>
              </div>
              <div className="composer-help-item">
                <span
                  className="composer-help-icon"
                  aria-hidden="true"
                  data-marker="◷"
                />
                <div>
                  <strong>When?</strong>
                  <span>Last bus, closing time, best time, waiting time.</span>
                </div>
              </div>
              <div className="composer-help-item">
                <span
                  className="composer-help-icon"
                  aria-hidden="true"
                  data-marker="!"
                />
                <div>
                  <strong>What surprised you?</strong>
                  <span>
                    Cash only, wrong entrance, hidden shortcut, unexpected cost.
                  </span>
                </div>
              </div>
            </div>
            <div className="composer-help-note">
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
