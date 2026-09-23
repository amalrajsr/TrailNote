"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ContributionCardDTO } from "../../server/queries/contributions";
import { HomepageTipCard } from "./homepage-card";

function slidesPerView() {
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 768) return 2;
  return 1;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HomepageTipCarousel({ tips }: { tips: ContributionCardDTO[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const carouselId = useId();
  const [perView, setPerView] = useState(3);
  const [position, setPosition] = useState(0);
  const totalPositions = Math.ceil(tips.length / perView);

  const updatePosition = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const slides = Array.from(track.children) as HTMLElement[];

    const visible = slidesPerView();
    const nextPosition =
      visible === 1
        ? slides.reduce(
            (closest, child, index) =>
              Math.abs(child.offsetLeft - viewport.scrollLeft) <
              Math.abs(slides[closest].offsetLeft - viewport.scrollLeft)
                ? index
                : closest,
            0,
          )
        : Math.round(
            (viewport.scrollLeft /
              Math.max(viewport.scrollWidth - viewport.clientWidth, 1)) *
              (Math.ceil(tips.length / visible) - 1),
          );

    setPosition((current) =>
      current === nextPosition ? current : nextPosition,
    );
  }, [tips.length]);

  useEffect(() => {
    const syncLayout = () => {
      setPerView(slidesPerView());
      updatePosition();
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, [updatePosition]);

  const moveTo = (nextPosition: number) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const slides = Array.from(track.children) as HTMLElement[];

    const visible = slidesPerView();
    const lastPosition = Math.ceil(tips.length / visible) - 1;
    const boundedPosition = Math.max(0, Math.min(nextPosition, lastPosition));
    const target =
      visible === 1
        ? (slides[boundedPosition]?.offsetLeft ?? 0)
        : Math.min(
            boundedPosition * viewport.clientWidth,
            viewport.scrollWidth - viewport.clientWidth,
          );

    viewport.scrollTo({
      left: target,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
    setPosition(boundedPosition);
  };

  return (
    <div className="home-tip-carousel">
      <div className="section-head home-tip-carousel-head">
        <div>
          <p className="eyebrow">Useful right now</p>
          <h2 id="tips-title">From travellers who&apos;ve been there</h2>
          <p>Real, practical tips from people who were actually there.</p>
        </div>

        <nav className="home-tip-carousel-controls" aria-label="Tip carousel">
          <button
            type="button"
            aria-label="Show previous tips"
            aria-controls={carouselId}
            disabled={position === 0}
            onClick={() => moveTo(position - 1)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Show next tips"
            aria-controls={carouselId}
            disabled={position >= totalPositions - 1}
            onClick={() => moveTo(position + 1)}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </nav>
      </div>

      <div
        ref={viewportRef}
        id={carouselId}
        className="home-tip-carousel-viewport"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured traveller tips"
        tabIndex={0}
        onScroll={updatePosition}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveTo(position - 1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveTo(position + 1);
          }
        }}
      >
        <div ref={trackRef} className="home-tip-carousel-track">
          {tips.map((tip) => (
            <HomepageTipCard tip={tip} key={tip.id} />
          ))}
        </div>
      </div>

      <div className="home-tip-carousel-mobile-controls">
        <p className="sr-only" aria-live="polite">
          Showing tip {position + 1} of {tips.length}
        </p>
        <div className="home-tip-carousel-indicator">
          {tips.map((tip, index) => (
            <button
              type="button"
              aria-current={index === position ? "true" : undefined}
              aria-label={`Show tip ${index + 1}`}
              className={index === position ? "active" : ""}
              key={tip.id}
              onClick={() => moveTo(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
