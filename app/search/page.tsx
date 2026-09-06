import { getDatabase } from "../../src/db";
import {
  destinationList,
  searchDestinations,
} from "../../src/server/queries/destinations";
import { DestinationSearch } from "../../src/components/destinations/search";
import { DestinationTiles } from "../../src/components/destinations/tiles";
import { EmptyState } from "../../src/components/ui/primitives";
export const metadata = { title: "Explore destinations" };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams,
    { db } = await getDatabase();
  const results = q
    ? await searchDestinations(db, q)
    : await destinationList(db);
  return (
    <main id="main" className="container page-top stack">
      <h1 className="page-title">Find your next destination.</h1>
      <DestinationSearch initialQuery={q} />
      <section className="stack">
        <h2>{q ? `Results for “${q}”` : "Start somewhere good"}</h2>
        {results.length ? (
          <DestinationTiles destinations={results} />
        ) : (
          <EmptyState title="No destinations found">
            We haven&apos;t added this destination yet. Try a nearby town.
          </EmptyState>
        )}
      </section>
    </main>
  );
}
