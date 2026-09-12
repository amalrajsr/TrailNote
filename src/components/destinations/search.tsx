"use client";

import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchDestination } from "../../lib/destination-search";

type SearchState = "idle" | "loading" | "ready" | "error";

export function DestinationSearch({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const router = useRouter();
  const id = useId();
  const request = useRef(0);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchDestination[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<string>();
  const [errorMessage, setErrorMessage] = useState(
    "Couldn't load destinations right now. Please try again.",
  );

  useEffect(() => {
    const version = ++request.current;
    const abort = new AbortController();

    if (query.trim().length < 2) {
      return () => abort.abort();
    }

    const timer = window.setTimeout(async () => {
      setState("loading");

      try {
        const response = await fetch(
          `/api/places/search?q=${encodeURIComponent(query)}`,
          { signal: abort.signal },
        );

        if (!response.ok) throw new Error("Destination search failed");

        const data = (await response.json()) as {
          results: SearchDestination[];
        };

        if (version === request.current) {
          setResults(data.results);
          setHighlight(-1);
          setState("ready");
        }
      } catch {
        if (!abort.signal.aborted && version === request.current) {
          setErrorMessage(
            "Couldn't load destinations right now. Please try again.",
          );
          setState("error");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [query, retry]);

  async function choose(destination: SearchDestination) {
    if (destination.trailnoteSlug) {
      setOpen(false);
      router.push(`/destinations/${destination.trailnoteSlug}`);
      return;
    }
    if (!destination.providerPlaceId || saving) return;

    setSaving(destination.providerPlaceId);
    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          providerPlaceId: destination.providerPlaceId,
        }),
      });
      if (response.status === 401) {
        router.push(
          `/sign-in?returnTo=${encodeURIComponent(`/search?q=${encodeURIComponent(query.trim())}`)}`,
        );
        return;
      }
      if (!response.ok) throw new Error("Destination save failed");
      const data = (await response.json()) as {
        destination: { slug: string };
      };
      router.push(`/destinations/${data.destination.slug}`);
    } catch {
      setSaving(undefined);
      setErrorMessage("Couldn't add that destination. Please try again.");
      setState("error");
      setOpen(true);
    }
  }

  const showResults = open && query.trim().length >= 2;

  return (
    <form
      action="/search"
      className="search-block"
      onSubmit={(event) => {
        const selected = results[highlight];
        if (selected && showResults && state === "ready") {
          event.preventDefault();
          void choose(selected);
        }
      }}
    >
      <label htmlFor={id} className="label">
        Where are you going?
      </label>
      <div className="search">
        <Search size={20} aria-hidden="true" />
        <input
          id={id}
          name="q"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={`${id}-results`}
          aria-activedescendant={
            showResults && highlight >= 0 ? `${id}-${highlight}` : undefined
          }
          autoComplete="off"
          maxLength={80}
          value={query}
          placeholder="Try Badami, Hampi, Varkala…"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(-1);
            setState("idle");
            setErrorMessage(
              "Couldn't load destinations right now. Please try again.",
            );
            setResults([]);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setHighlight(-1);
            }

            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setHighlight((current) =>
                event.key === "ArrowDown"
                  ? Math.min(current + 1, results.length - 1)
                  : current <= 0
                    ? results.length - 1
                    : current - 1,
              );
            }
          }}
        />
        <button className="btn" aria-label="Search destinations">
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>

      {showResults && (
        <ul
          id={`${id}-results`}
          role="listbox"
          aria-label="Destinations"
          className="search-results"
        >
          {state === "loading" || state === "idle" ? (
            <li
              role="presentation"
              className="search-option"
              aria-live="polite"
            >
              Finding destinations…
            </li>
          ) : state === "error" ? (
            <li role="presentation" className="search-option">
              {errorMessage}
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setState("idle");
                  setRetry((value) => value + 1);
                }}
              >
                Retry
              </button>
            </li>
          ) : results.length ? (
            results.map((destination, index) => (
              <li
                role="option"
                aria-selected={highlight === index}
                id={`${id}-${index}`}
                key={
                  destination.providerPlaceId ??
                  destination.trailnoteSlug ??
                  `${destination.canonicalName}-${destination.latitude}-${destination.longitude}`
                }
                className="search-option"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => void choose(destination)}
              >
                {destination.displayName}
                <small>
                  {destination.secondaryText}
                  {!destination.trailnoteSlug && (
                    <>
                      {destination.secondaryText && " · "}
                      {saving === destination.providerPlaceId
                        ? "Adding destination…"
                        : "Add to TrailNote"}
                    </>
                  )}
                </small>
              </li>
            ))
          ) : (
            <li role="presentation" className="search-option">
              We couldn&apos;t find that destination. Try another spelling or
              nearby town.
            </li>
          )}
        </ul>
      )}
    </form>
  );
}
