import Link from "next/link";
import { DestinationSearch } from "../src/components/destinations/search";
import { DestinationTiles } from "../src/components/destinations/tiles";
import { MapIllustration } from "../src/components/destinations/map-illustration";
import { Notebook } from "../src/components/destinations/notebook";
import { HomepageTipCard } from "../src/components/contributions/homepage-card";
import { getDatabase } from "../src/db";
import {
  categoryCountsForDestinations,
  destinationMapList,
  destinationPage,
} from "../src/server/queries/destinations";
import { homepageContributions } from "../src/server/queries/contributions";
import { ArrowRight, Plus } from "lucide-react";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const { db } = await getDatabase();
  const [page, mapDestinations, featuredTips] = await Promise.all([
    destinationPage(db, { limit: 4 }),
    destinationMapList(db),
    homepageContributions(db),
  ]);
  const countsByDestination = await categoryCountsForDestinations(
    db,
    page.destinations.map((destination) => destination.id),
  );

  return (
    <main id="main" className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="container home-hero-grid">
          <div className="home-copy">
            <p className="eyebrow">From travellers who’ve been there</p>
            <h1 id="home-title">
              A little local knowledge.
              <span>A better trip.</span>
            </h1>
            <p className="intro">
              What travellers paid, how they got around, and the little things
              worth knowing.
            </p>
            <DestinationSearch />
            <nav className="suggestions" aria-label="Suggested destinations">
              <span>A few places to start:</span>
              <Link href="/destinations/badami">Badami</Link>
              <Link href="/destinations/hampi">Hampi</Link>
              <Link href="/destinations/varkala">Varkala</Link>
              <Link href="/destinations/goa">Goa</Link>
            </nav>
          </div>
          <Notebook />
        </div>
      </section>

      {featuredTips.length > 0 && (
        <section
          className="home-section home-tips-section"
          id="tips"
          aria-labelledby="tips-title"
        >
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Useful right now</p>
                <h2 id="tips-title">From travellers who’ve been there</h2>
                <p>Real, practical tips from people who were actually there.</p>
              </div>
            </div>
            <div className="home-tips-grid">
              {featuredTips.map((tip) => (
                <HomepageTipCard tip={tip} key={tip.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        className="home-section home-explore-section"
        id="places"
        aria-labelledby="destinations-title"
      >
        <div className="container">
          <div className="home-explore-grid">
            <div className="home-places-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Find your next stop</p>
                  <h2 id="destinations-title">Explore India</h2>
                  <p>Practical tips from places across India.</p>
                </div>
              </div>
              <DestinationTiles
                destinations={page.destinations}
                categoryCounts={countsByDestination}
              />
              <Link className="home-text-link" href="/search">
                View all places
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            <MapIllustration
              className="home-explore-map"
              destinations={mapDestinations}
            />
          </div>

          <aside
            className="home-cta"
            id="share"
            aria-labelledby="home-cta-title"
          >
            <div>
              <p className="home-cta-eyebrow">Know something useful?</p>
              <h2 id="home-cta-title">
                Tell the next traveller what you wish someone had told you.
              </h2>
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
        </div>
      </section>
    </main>
  );
}
