"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Category } from "../../lib/constants";
import type { ContributionCardDTO } from "../../server/queries/contributions";
import { TipCard } from "./card";

type TipPageResponse = {
  cards: ContributionCardDTO[];
  nextCursor: string | null;
};

export function InfiniteTipFeed({
  slug,
  category,
  sort,
  initialCards,
  initialNextCursor,
  total,
}: {
  slug: string;
  category?: Category;
  sort: "recent" | "newest";
  initialCards: ContributionCardDTO[];
  initialNextCursor: string | null;
  total: number;
}) {
  const hintId = useId();
  const [cards, setCards] = useState(initialCards);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const scrollContainer = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === "loading") return;

    abortController.current?.abort();
    const abort = new AbortController();
    abortController.current = abort;
    setStatus("loading");

    const query = new URLSearchParams({ cursor: nextCursor, sort });
    if (category) query.set("category", category);

    try {
      const response = await fetch(
        `/api/destinations/${encodeURIComponent(slug)}/tips?${query}`,
        { signal: abort.signal },
      );
      if (!response.ok) throw new Error("Tip page failed");

      const page = (await response.json()) as TipPageResponse;
      setCards((current) => {
        const known = new Set(current.map((card) => card.id));
        return [
          ...current,
          ...page.cards.filter((card) => !known.has(card.id)),
        ];
      });
      setNextCursor(page.nextCursor);
      setStatus("idle");
    } catch {
      if (!abort.signal.aborted) setStatus("error");
    }
  }, [category, nextCursor, slug, sort, status]);

  useEffect(() => {
    const root = scrollContainer.current;
    const target = sentinel.current;
    if (!root || !target || !nextCursor || status !== "idle") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { root, rootMargin: "320px 0px" },
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

  return (
    <div className="tip-browser" aria-busy={status === "loading"}>
      <p id={hintId} className="scroll-hint">
        Scroll this list to browse more traveler notes.
      </p>
      <div
        ref={scrollContainer}
        className="tip-scroll"
        role="region"
        aria-label="Traveler tips"
        aria-describedby={hintId}
        tabIndex={0}
      >
        <div className="stack">
          {cards.map((tip) => (
            <TipCard tip={tip} key={tip.id} />
          ))}
        </div>
        <div ref={sentinel} className="tip-sentinel" aria-hidden="true" />
      </div>

      <div className="tip-load-more">
        {nextCursor && (
          <button
            type="button"
            className="btn secondary"
            disabled={status === "loading"}
            onClick={() => void loadMore()}
          >
            {status === "loading"
              ? "Loading more tips…"
              : status === "error"
                ? "Try loading again"
                : "Load more tips"}
          </button>
        )}
        <p className="load-status" role="status" aria-live="polite">
          {status === "error"
            ? "We couldn’t load more tips. Check your connection and try again."
            : status === "loading"
              ? "Loading more traveler tips…"
              : nextCursor
                ? `${cards.length} of ${total} tips shown.`
                : `All ${total} ${total === 1 ? "tip" : "tips"} shown.`}
        </p>
      </div>
    </div>
  );
}
