import Link from "next/link";
import type { CSSProperties } from "react";

export type MapDestination = {
  id?: string;
  slug: string;
  name: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

const indiaBounds = {
  north: 37.1,
  east: 97.4,
  south: 6.5,
  west: 68.1,
};

// The visible path bounds inside India outline.svg's 666.67 × 777.33 viewBox.
const outlineBounds = {
  left: 10.4,
  right: 655.4,
  top: 23.5,
  bottom: 742,
};

const outlineViewBox = { width: 666.66669, height: 777.33331 };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function mercator(latitude: number) {
  return Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
}

function markerPosition(destination: MapDestination) {
  if (destination.latitude === null || destination.longitude === null)
    return null;

  const { latitude, longitude } = destination;
  if (
    latitude < indiaBounds.south ||
    latitude > indiaBounds.north ||
    longitude < indiaBounds.west ||
    longitude > indiaBounds.east
  )
    return null;

  const projectedX =
    outlineBounds.left +
    ((longitude - indiaBounds.west) / (indiaBounds.east - indiaBounds.west)) *
      (outlineBounds.right - outlineBounds.left);
  const projectedY =
    outlineBounds.top +
    ((mercator(indiaBounds.north) - mercator(latitude)) /
      (mercator(indiaBounds.north) - mercator(indiaBounds.south))) *
      (outlineBounds.bottom - outlineBounds.top);

  return {
    left: clamp((projectedX / outlineViewBox.width) * 100, 0, 100),
    top: clamp((projectedY / outlineViewBox.height) * 100, 0, 100),
  };
}

export function MapIllustration({
  destinations,
  compact = false,
  activeSlug,
}: {
  destinations: MapDestination[];
  compact?: boolean;
  activeSlug?: string;
}) {
  const markers = destinations.flatMap((destination) => {
    const position = markerPosition(destination);
    return position ? [{ destination, position }] : [];
  });

  return (
    <div
      className={`map-shell ${compact ? "destination-map" : "hero-map"}${markers.length > 8 ? " dense" : ""}`}
    >
      <div className="map-grid" aria-hidden="true" />
      <div className="map-water" aria-hidden="true" />
      <div className="india-map-layer">
        <div className="india-shape" aria-hidden="true" />
        <nav className="map-markers" aria-label="Map destinations">
          {markers.map(({ destination, position }) => (
            <Link
              className={`marker${
                destination.slug === activeSlug ? " active" : ""
              }`}
              href={`/destinations/${destination.slug}`}
              key={destination.id ?? destination.slug}
              data-slug={destination.slug}
              style={
                {
                  "--marker-left": `${position.left}%`,
                  "--marker-top": `${position.top}%`,
                } as CSSProperties
              }
              aria-label={`${destination.name}, ${destination.state}`}
            >
              <span className="marker-dot" aria-hidden="true" />
              <span className="marker-label" aria-hidden="true">
                {destination.name}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
