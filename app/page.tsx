import Link from "next/link";
import { DestinationSearch } from "../src/components/destinations/search";
import { LazyDestinationTiles } from "../src/components/destinations/lazy-tiles";
import { MapIllustration } from "../src/components/destinations/map-illustration";
import { getDatabase } from "../src/db";
import {
  categoryCountsForDestinations,
  destinationCount,
  destinationMapList,
  destinationPage,
} from "../src/server/queries/destinations";
import { Plus } from "lucide-react";

export default async function HomePage() {
  const { db } = await getDatabase();
  const [page, total, mapDestinations] = await Promise.all([
    destinationPage(db),
    destinationCount(db),
    destinationMapList(db),
  ]);
  const countsByDestination = await categoryCountsForDestinations(
    db,
    page.destinations.map((destination) => destination.id),
  );

  return (
    <main id="main" className="container">
      <section className="hero home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="eyebrow">Traveler knowledge for India</p>
          <h1 id="home-title">
            Tell the next traveller
            <br />
            <span>what you wish someone had told you.</span>
          </h1>
          <p className="intro">
            Practical notes from people who were actually there — what they
            paid, how they got around, and the little things worth knowing.
          </p>
          <DestinationSearch />
          <nav className="suggestions" aria-label="Suggested destinations">
            <span>A few places to start:</span>
            <Link href="/destinations/badami">Badami</Link>
            <Link href="/destinations/hampi">Hampi</Link>
            <Link href="/destinations/varkala">Varkala</Link>
            <Link href="/destinations/gokarna">Gokarna</Link>
          </nav>
        </div>
        <MapIllustration destinations={mapDestinations} />
      </section>

      <section className="home-section" aria-labelledby="destinations-title">
        <div className="section-head">
          <div>
            <h2 id="destinations-title">Explore every location</h2>
            <p>
              Browse every destination currently shared by the TrailNote
              community.
            </p>
          </div>
        </div>
        <LazyDestinationTiles
          initialDestinations={page.destinations}
          initialCategoryCounts={countsByDestination}
          initialNextCursor={page.nextCursor}
          total={total}
        />

        <aside className="home-cta" aria-labelledby="home-cta-title">
          <div>
            <h2 id="home-cta-title">Know something useful?</h2>
            <p>
              A fare, a room rate, a shortcut, a good meal — one detail is
              enough.
            </p>
          </div>
          <Link className="btn" href="/search">
            <Plus size={19} aria-hidden="true" />
            Share a tip
          </Link>
        </aside>
      </section>
    </main>
  );
}
