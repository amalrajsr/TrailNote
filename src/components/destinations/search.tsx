"use client";

import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type DestinationResult = {
  id: string;
  slug: string;
  name: string;
  state: string;
};

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
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [retry, setRetry] = useState(0);

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
          `/api/destinations?q=${encodeURIComponent(query)}`,
          { signal: abort.signal },
        );

        if (!response.ok) throw new Error("Destination search failed");

        const data = (await response.json()) as {
          destinations: DestinationResult[];
        };

        if (version === request.current) {
          setResults(data.destinations);
          setHighlight(-1);
          setState("ready");
        }
      } catch {
        if (!abort.signal.aborted && version === request.current) {
          setState("error");
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [query, retry]);

  function choose(slug: string) {
    setOpen(false);
    router.push(`/destinations/${slug}`);
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
          choose(selected.slug);
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
                  : Math.max(current - 1, 0),
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
              Couldn&apos;t load destinations. Try again.
              <button
                type="button"
                className="quiet"
                onClick={() => setRetry((value) => value + 1)}
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
                key={destination.id}
                className="search-option"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(destination.slug)}
              >
                {destination.name}
                <small>{destination.state}</small>
              </li>
            ))
          ) : (
            <li role="presentation" className="search-option">
              We haven&apos;t added this destination yet. Try a nearby town.
            </li>
          )}
        </ul>
      )}
    </form>
  );
}
