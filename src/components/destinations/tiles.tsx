import Link from "next/link";
import type { DestinationSummary } from "../../server/queries/destinations";
import { categoryLabels, type Category } from "../../lib/constants";
export function DestinationTiles({
  destinations,
  categoryCounts,
}: {
  destinations: DestinationSummary[];
  categoryCounts?: Record<string, Array<{ category: Category; count: number }>>;
}) {
  return (
    <div className="dest-grid">
      {destinations.map((d) => (
        <Link
          className="destination-tile"
          href={`/destinations/${d.slug}`}
          key={d.id}
        >
          <div className="tile-copy">
            <h3>{d.name}</h3>
            <p className="state">{d.state}</p>
            {!!categoryCounts?.[d.id]?.length && (
              <span className="place-meta" aria-label="Available categories">
                {categoryCounts[d.id].slice(0, 3).map(({ category }) => (
                  <span className={`mini-tag ${category}`} key={category}>
                    {category === "general" ? "Tips" : categoryLabels[category]}
                  </span>
                ))}
              </span>
            )}
            <small className="place-count">
              {d.publishedRootTipCount
                ? `${d.publishedRootTipCount} traveler ${d.publishedRootTipCount === 1 ? "note" : "notes"}`
                : "Be the first to add a tip"}
            </small>
          </div>
        </Link>
      ))}
    </div>
  );
}
