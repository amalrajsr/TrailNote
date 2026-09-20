import { getDatabase } from "../../src/db";
import {
  categoryCountsForDestinations,
  destinationCount,
  destinationPage,
  searchDestinations,
} from "../../src/server/queries/destinations";
import { DestinationSearch } from "../../src/components/destinations/search";
import { LazyDestinationTiles } from "../../src/components/destinations/lazy-tiles";
import { DestinationTiles } from "../../src/components/destinations/tiles";
import { EmptyState } from "../../src/components/ui/primitives";
export const metadata = {
  title: "Explore places",
  alternates: { canonical: "/search" },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; intent?: string }>;
}) {
  const { q = "", intent } = await searchParams,
    { db } = await getDatabase();
  const isShareIntent = intent === "share";
  const results = q ? await searchDestinations(db, q) : null;
  const [page, total] = q
    ? [null, 0]
    : await Promise.all([destinationPage(db), destinationCount(db)]);
  const categoryCounts = page
    ? await categoryCountsForDestinations(
        db,
        page.destinations.map((destination) => destination.id),
      )
    : {};
  return (
    <main id="main" className="container page-top stack">
      <h1 className="page-title">
        {isShareIntent ? "Where did you travel?" : "Explore places"}
      </h1>
      <p className="muted">
        {isShareIntent
          ? "Choose the place you want to share a tip about."
          : "Find practical tips from travellers who've been there."}
      </p>
      <DestinationSearch
        initialQuery={q}
        intent={isShareIntent ? "share" : undefined}
      />
      <section className="stack">
        <h2>{q ? `Results for “${q}”` : "Places on TrailNote"}</h2>
        {results?.length ? (
          <DestinationTiles
            destinations={results}
            intent={isShareIntent ? "share" : undefined}
          />
        ) : page?.destinations.length ? (
          <LazyDestinationTiles
            initialDestinations={page.destinations}
            initialCategoryCounts={categoryCounts}
            initialNextCursor={page.nextCursor}
            total={total}
            intent={isShareIntent ? "share" : undefined}
          />
        ) : (
          <EmptyState title="No places found">
            We haven&apos;t added this place yet. Try a nearby town.
          </EmptyState>
        )}
      </section>
    </main>
  );
}
