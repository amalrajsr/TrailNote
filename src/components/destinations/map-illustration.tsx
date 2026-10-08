"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

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

type PositionedDestination = {
  destination: MapDestination;
  position: { left: number; top: number };
};

type MarkerGroup = {
  key: string;
  position: { left: number; top: number };
  places: PositionedDestination[];
};

function groupNearbyMarkers(markers: PositionedDestination[]): MarkerGroup[] {
  const groups: MarkerGroup[] = [];

  for (const marker of markers) {
    const group = groups.find(
      ({ position }) =>
        Math.hypot(
          (marker.position.left - position.left) / 14,
          (marker.position.top - position.top) / 12,
        ) <= 1,
    );

    if (!group) {
      groups.push({
        key: marker.destination.slug,
        position: { ...marker.position },
        places: [marker],
      });
      continue;
    }

    group.places.push(marker);
    group.position = {
      left:
        group.places.reduce((sum, place) => sum + place.position.left, 0) /
        group.places.length,
      top:
        group.places.reduce((sum, place) => sum + place.position.top, 0) /
        group.places.length,
    };
  }

  return groups;
}

function markerStyle(position: { left: number; top: number }) {
  return {
    "--marker-left": `${position.left.toFixed(4)}%`,
    "--marker-top": `${position.top.toFixed(4)}%`,
  } as CSSProperties;
}

export function MapIllustration({
  destinations,
  compact = false,
  activeSlug,
  className,
}: {
  destinations: MapDestination[];
  compact?: boolean;
  activeSlug?: string;
  className?: string;
}) {
  const markers = useMemo(
    () =>
      destinations.flatMap((destination) => {
        const position = markerPosition(destination);
        return position ? [{ destination, position }] : [];
      }),
    [destinations],
  );
  const groups = useMemo(
    () =>
      compact
        ? markers.map((marker) => ({
            key: marker.destination.slug,
            position: marker.position,
            places: [marker],
          }))
        : groupNearbyMarkers(markers),
    [compact, markers],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedGroup = groups.find((group) => group.key === selectedKey);
  const backButton = useRef<HTMLButtonElement>(null);
  const groupButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastSelectedKey = useRef<string | null>(null);

  useEffect(() => {
    if (selectedGroup) backButton.current?.focus();
    else if (lastSelectedKey.current)
      groupButtons.current[lastSelectedKey.current]?.focus();
  }, [selectedGroup]);

  const zoom = selectedGroup ? 2.6 : 1;
  const mapStyle = selectedGroup
    ? ({
        "--map-scale": zoom,
        "--map-inverse-scale": 1 / zoom,
        "--map-shift-x": `${(50 - selectedGroup.position.left) * zoom}%`,
        "--map-shift-y": `${(50 - selectedGroup.position.top) * zoom}%`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={`map-shell ${compact ? "destination-map" : "hero-map"}${markers.length > 8 ? " dense" : ""}${selectedGroup ? " map-zoomed" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="map-grid" aria-hidden="true" />
      <div className="india-map-layer" style={mapStyle}>
        <div className="india-shape" aria-hidden="true" />
        <nav className="map-markers" aria-label="Map destinations">
          {selectedGroup
            ? selectedGroup.places.map(({ destination, position }) => (
                <Link
                  className={`marker${destination.slug === activeSlug ? " active" : ""}`}
                  href={`/destinations/${destination.slug}`}
                  key={destination.id ?? destination.slug}
                  data-slug={destination.slug}
                  style={markerStyle(position)}
                  aria-label={`${destination.name}, ${destination.state}`}
                >
                  <span className="marker-dot" aria-hidden="true" />
                  <span className="marker-label" aria-hidden="true">
                    {destination.name}
                  </span>
                </Link>
              ))
            : groups.map((group) =>
                group.places.length === 1 ? (
                  <Link
                    className={`marker${group.places[0].destination.slug === activeSlug ? " active" : ""}`}
                    href={`/destinations/${group.places[0].destination.slug}`}
                    key={group.key}
                    data-slug={group.places[0].destination.slug}
                    style={markerStyle(group.position)}
                    aria-label={`${group.places[0].destination.name}, ${group.places[0].destination.state}`}
                  >
                    <span className="marker-dot" aria-hidden="true" />
                    <span className="marker-label" aria-hidden="true">
                      {group.places[0].destination.name}
                    </span>
                  </Link>
                ) : (
                  <button
                    className="marker marker-cluster"
                    key={group.key}
                    ref={(element) => {
                      groupButtons.current[group.key] = element;
                    }}
                    style={markerStyle(group.position)}
                    type="button"
                    onClick={() => {
                      lastSelectedKey.current = group.key;
                      setSelectedKey(group.key);
                    }}
                    aria-label={`Explore ${group.places.length} nearby places: ${group.places.map(({ destination }) => destination.name).join(", ")}`}
                  >
                    <span className="marker-cluster-badge" aria-hidden="true">
                      {group.places.length}
                    </span>
                  </button>
                ),
              )}
        </nav>
      </div>
      {selectedGroup && (
        <div className="map-region-panel">
          <button
            className="map-back-button"
            ref={backButton}
            type="button"
            onClick={() => setSelectedKey(null)}
          >
            ← All India
          </button>
          <p>{selectedGroup.places.length} nearby places</p>
          <div className="map-region-links">
            {selectedGroup.places.map(({ destination }) => (
              <Link
                href={`/destinations/${destination.slug}`}
                key={destination.slug}
              >
                {destination.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
