import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Compass, Clock3 } from "lucide-react";
import { getDatabase } from "../../../src/db";
import {
  destinationBySlug,
  categoryCounts,
} from "../../../src/server/queries/destinations";
import { listContributions } from "../../../src/server/queries/contributions";
import {
  categories,
  categoryLabels,
  type Category,
} from "../../../src/lib/constants";
import { CategoryIcon } from "../../../src/components/ui/category-icon";
import { InfiniteTipFeed } from "../../../src/components/contributions/infinite-tip-feed";
import { EmptyState } from "../../../src/components/ui/primitives";
import { SortSelect } from "../../../src/components/destinations/sort";
import { MapIllustration } from "../../../src/components/destinations/map-illustration";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `${slug.charAt(0).toUpperCase() + slug.slice(1)} travel tips`,
  };
}
export default async function DestinationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const { slug } = await params,
    query = await searchParams,
    { db } = await getDatabase(),
    destination = await destinationBySlug(db, slug);
  if (!destination) notFound();
  const category = categories.includes(query.category as Category)
      ? (query.category as Category)
      : undefined,
    sort = query.sort === "newest" ? "newest" : "recent";
  const [listing, counts] = await Promise.all([
    listContributions(db, {
      destinationId: destination.id,
      category,
      sort,
    }),
    categoryCounts(db, destination.id),
  ]);
  const totalTips = category
    ? (counts.find((count) => count.category === category)?.count ?? 0)
    : destination.publishedRootTipCount;
  const add = `/destinations/${slug}/add${category ? `?category=${category}` : ""}`;
  return (
    <main id="main" className="container page-top">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Explore</Link>
        <span>/</span>
        <span>{destination.state}</span>
      </nav>
      <div className="dest-heading">
        <div>
          <p className="eyebrow">{destination.state} · India</p>
          <h1>{destination.name}</h1>
          <p>Small discoveries. Useful details. Shared by travelers.</p>
          <div className="dest-meta">
            {destination.publishedRootTipCount} traveler{" "}
            {destination.publishedRootTipCount === 1 ? "note" : "notes"} ·{" "}
            {destination.state}, India
          </div>
        </div>
        <Link className="btn" href={add}>
          <Plus size={18} aria-hidden />
          Add a tip
        </Link>
      </div>
      <nav className="filters" aria-label="Tip categories">
        <div className="filters-row">
          <div className="pills">
            {["all", ...categories].map((key) => (
              <Link
                className={`pill ${(category ?? "all") === key ? "selected" : ""}`}
                aria-current={(category ?? "all") === key ? "page" : undefined}
                key={key}
                href={`/destinations/${slug}?${new URLSearchParams({ ...(key !== "all" ? { category: key } : {}), sort })}#tips`}
              >
                <CategoryIcon category={key as Category | "all"} />
                {key === "all"
                  ? "All"
                  : key === "general"
                    ? "Tips"
                    : categoryLabels[key as Category]}
                <span className="sr-only">
                  {key === "all"
                    ? destination.publishedRootTipCount
                    : (counts.find((c) => c.category === key)?.count ?? 0)}{" "}
                  tips
                </span>
              </Link>
            ))}
          </div>
          <SortSelect sort={sort} />
        </div>
      </nav>
      <div className="two-col">
        <section id="tips">
          <div className="list-heading">
            <h2>
              {category
                ? `${categoryLabels[category]} tips`
                : "Latest from travelers"}
            </h2>
            <span>
              {totalTips} {totalTips === 1 ? "note" : "notes"}
            </span>
          </div>
          {listing.cards.length ? (
            <InfiniteTipFeed
              key={`${slug}:${category ?? "all"}:${sort}`}
              slug={slug}
              category={category}
              sort={sort}
              initialCards={listing.cards}
              initialNextCursor={listing.nextCursor}
              total={totalTips}
            />
          ) : (
            <EmptyState
              title={
                category
                  ? `No ${categoryLabels[category].toLowerCase()} tips yet`
                  : "No tips here yet"
              }
              action={
                <Link className="btn" href={add}>
                  Add the first tip
                </Link>
              }
            >
              Know something useful about {destination.name}? Help the next
              traveler.
            </EmptyState>
          )}
        </section>
        <aside className="side-stack destination-aside">
          <MapIllustration
            compact
            activeSlug={destination.slug}
            destinations={[destination]}
          />
          <div className="map-info">
            <strong>
              {destination.name}, {destination.state}
            </strong>
            <p>
              Geographic context stays visible while traveler notes do the real
              work.
            </p>
            <Link className="quiet" href={add}>
              <Compass size={18} aria-hidden="true" />
              Share what you learned
            </Link>
          </div>
          <div className="side-note">
            <h3>
              <Clock3 size={20} aria-hidden />A note on prices
            </h3>
            <p>
              These are amounts travelers reported paying. Prices and
              availability can change.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
