"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      <div
        className="destination-scroll"
        role="region"
        aria-label="Places on TrailNote"
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
              ? "Loading places…"
              : status === "error"
                ? "Try loading again"
                : "Show more places"}
          </button>
        )}
        <p className="load-status" role="status" aria-live="polite">
          {status === "error"
            ? "We couldn’t load more places. Check your connection and try again."
            : status === "loading"
              ? "Loading more places…"
              : loadedAll
                ? `All ${total} ${total === 1 ? "place" : "places"} shown.`
                : `${destinations.length} of ${total} places shown.`}
        </p>
      </div>
    </div>
  );
}
