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
import { TipCard } from "../../../src/components/contributions/card";
import { EmptyState } from "../../../src/components/ui/primitives";
import { SortSelect } from "../../../src/components/destinations/sort";
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
  searchParams: Promise<{ category?: string; sort?: string; cursor?: string }>;
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
      cursor: query.cursor,
    }),
    categoryCounts(db, destination.id),
  ]);
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
          <h1>{destination.name}</h1>
          <p>Small discoveries. Useful details. Shared by travelers.</p>
          <div className="dest-meta">
            {destination.publishedRootTipCount} traveler tips ·{" "}
            {destination.state}, India
          </div>
        </div>
        <Link className="btn" href={add}>
          <Plus size={18} aria-hidden />
          Add a tip
        </Link>
      </div>
      <nav className="filters" aria-label="Tip categories">
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
      </nav>
      <div className="two-col">
        <section id="tips">
          <div className="list-heading">
            <h2>
              {category
                ? `${categoryLabels[category]} tips`
                : "Latest from travelers"}
            </h2>
            <SortSelect sort={sort} />
          </div>
          <div className="stack">
            {listing.cards.length ? (
              listing.cards.map((t) => <TipCard tip={t} key={t.id} />)
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
          </div>
          {listing.nextCursor && (
            <div className="load-more">
              <Link
                className="btn secondary"
                href={`?${new URLSearchParams({ sort, ...(category ? { category } : {}), cursor: listing.nextCursor })}#tips`}
              >
                Load more tips
              </Link>
            </div>
          )}
        </section>
        <aside className="side-stack">
          <div className="side-panel">
            <Compass size={20} aria-hidden />
            <h2>Been here recently?</h2>
            <p>
              A fare, a place to stay, a little local advice. Your experience
              could make someone&apos;s trip easier.
            </p>
            <Link className="quiet" href={add}>
              Share what you learned →
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
