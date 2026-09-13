"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Category } from "../../lib/constants";
import type {
  DestinationPage,
  DestinationSummary,
} from "../../server/queries/destinations";
import { DestinationTiles } from "./tiles";

type CountsByDestination = Record<
  string,
  Array<{ category: Category; count: number }>
>;

type DestinationPageResponse = DestinationPage & {
  categoryCounts: CountsByDestination;
};

export function LazyDestinationTiles({
  initialDestinations,
  initialCategoryCounts = {},
  initialNextCursor,
  total,
}: {
  initialDestinations: DestinationSummary[];
  initialCategoryCounts?: CountsByDestination;
  initialNextCursor: string | null;
  total: number;
}) {
  const hintId = useId();
  const [destinations, setDestinations] = useState(initialDestinations);
  const [categoryCounts, setCategoryCounts] = useState(initialCategoryCounts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const sentinel = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === "loading") return;

    abortController.current?.abort();
    const abort = new AbortController();
    abortController.current = abort;
    setStatus("loading");

    try {
      const response = await fetch(
        `/api/destinations?cursor=${encodeURIComponent(nextCursor)}`,
        { signal: abort.signal },
      );
      if (!response.ok) throw new Error("Destination page failed");

      const page = (await response.json()) as DestinationPageResponse;
      setDestinations((current) => {
        const known = new Set(current.map((destination) => destination.id));
        return [
          ...current,
          ...page.destinations.filter(
            (destination) => !known.has(destination.id),
          ),
        ];
      });
      setCategoryCounts((current) => ({
        ...current,
        ...page.categoryCounts,
      }));
      setNextCursor(page.nextCursor);
      setStatus("idle");
    } catch {
      if (!abort.signal.aborted) setStatus("error");
    }
  }, [nextCursor, status]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !nextCursor || status !== "idle") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: "300px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, nextCursor, status]);

  useEffect(
    () => () => {
      abortController.current?.abort();
    },
    [],
  );

  const loadedAll = !nextCursor && status !== "loading";

  return (
    <div className="destination-browser" aria-busy={status === "loading"}>
      <p id={hintId} className="scroll-hint">
        Scroll this list to browse more locations.
      </p>
      <div
        className="destination-scroll"
        role="region"
        aria-label="Locations"
        aria-describedby={hintId}
        tabIndex={0}
      >
        <DestinationTiles
          destinations={destinations}
          categoryCounts={categoryCounts}
        />
        <div
          ref={sentinel}
          className="destination-sentinel"
          aria-hidden="true"
        />
      </div>

      <div className="destination-load-more">
        {nextCursor && (
          <button
            className="btn secondary"
            type="button"
            disabled={status === "loading"}
            onClick={() => void loadMore()}
          >
            {status === "loading"
              ? "Loading locations…"
              : status === "error"
                ? "Try loading again"
                : "Load more locations"}
          </button>
        )}
        <p className="load-status" role="status" aria-live="polite">
          {status === "error"
            ? "We couldn’t load more locations. Check your connection and try again."
            : status === "loading"
              ? "Loading more locations…"
              : loadedAll
                ? `All ${total} ${total === 1 ? "location" : "locations"} shown.`
                : `${destinations.length} of ${total} locations shown.`}
        </p>
      </div>
    </div>
  );
}
