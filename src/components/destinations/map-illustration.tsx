import Link from "next/link";

const destinations = [
  { slug: "badami", name: "Badami" },
  { slug: "hampi", name: "Hampi" },
  { slug: "munnar", name: "Munnar" },
  { slug: "varkala", name: "Varkala" },
  { slug: "gokarna", name: "Gokarna" },
  { slug: "mysuru", name: "Mysuru" },
] as const;

export function MapIllustration({
  compact = false,
  activeSlug = "badami",
}: {
  compact?: boolean;
  activeSlug?: string;
}) {
  return (
    <div
      className={`map-shell ${compact ? "destination-map" : "hero-map"}`}
      aria-label="Explore TrailNote destinations across India"
    >
      <div className="map-grid" aria-hidden="true" />
      <div className="map-water" aria-hidden="true" />
      <div className="india-shape" aria-hidden="true" />
      <nav className="map-markers" aria-label="Map destinations">
        {destinations.map((destination) => (
          <Link
            className={`marker marker-${destination.slug}${
              destination.slug === activeSlug ? " active" : ""
            }`}
            href={`/destinations/${destination.slug}`}
            key={destination.slug}
          >
            <span className="marker-dot" aria-hidden="true" />
            <span>{destination.name}</span>
          </Link>
        ))}
      </nav>
      {/* {!compact && (
        <div className="map-card">
          <p className="eyebrow">From one traveler to another</p>
          <strong>Useful details, grounded in a place.</strong>
          <p>The map helps you explore. Traveler notes do the real work.</p>
        </div>
      )} */}
    </div>
  );
}
