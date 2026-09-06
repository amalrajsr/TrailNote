import Link from "next/link";
import { Mountain, ArrowUpRight } from "lucide-react";
import type { DestinationSummary } from "../../server/queries/destinations";
export function DestinationTiles({
  destinations,
}: {
  destinations: DestinationSummary[];
}) {
  return (
    <div className="dest-grid">
      {destinations.map((d, i) => (
        <Link
          className="destination-tile"
          href={`/destinations/${d.slug}`}
          key={d.id}
        >
          <span className={`tile-icon ${i > 1 ? "green" : ""}`}>
            <Mountain size={22} aria-hidden strokeWidth={1.75} />
          </span>
          <div className="tile-copy">
            <h3>{d.name}</h3>
            <p>{d.state}</p>
            <small>
              {d.publishedRootTipCount
                ? `${d.publishedRootTipCount} traveler tips`
                : "Be the first to add a tip"}
            </small>
          </div>
          <ArrowUpRight className="tile-arrow" size={20} aria-hidden />
        </Link>
      ))}
    </div>
  );
}
