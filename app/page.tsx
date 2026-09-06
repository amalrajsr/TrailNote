import Link from "next/link";
import { DestinationSearch } from "../src/components/destinations/search";
import { DestinationTiles } from "../src/components/destinations/tiles";
import { Notebook } from "../src/components/destinations/notebook";
import { getDatabase } from "../src/db";
import { destinationList } from "../src/server/queries/destinations";

export default async function HomePage() {
  const { db } = await getDatabase();
  const destinations = (await destinationList(db)).slice(0, 6);

  return (
    <main id="main" className="container">
      <section className="hero" aria-labelledby="home-title">
        <div>
          <p className="eyebrow">For the way you actually travel</p>
          <h1 id="home-title">
            A little local knowledge.
            <br />
            <em>A better trip.</em>
          </h1>
          <p className="intro">
            What travelers paid, how they got around, and the little things
            worth knowing.
          </p>
          <DestinationSearch />
          <nav className="suggestions" aria-label="Suggested destinations">
            <span>A few places to start:</span>
            <Link href="/destinations/badami">Badami</Link>
            <Link href="/destinations/hampi">Hampi</Link>
            <Link href="/destinations/varkala">Varkala</Link>
          </nav>
        </div>
        <Notebook />
      </section>

      <section aria-labelledby="destinations-title">
        <div className="section-head">
          <h2 id="destinations-title">Start somewhere good</h2>
          <p>Practical notes from across India.</p>
        </div>
        <DestinationTiles destinations={destinations} />
      </section>
    </main>
  );
}
