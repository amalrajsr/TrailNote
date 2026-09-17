import { Clock3, IndianRupee, Route } from "lucide-react";

export function Notebook() {
  return (
    <aside className="hero-note" aria-labelledby="hero-note-title">
      <div className="hero-note-content">
        <p className="hero-note-label">From one traveller to another</p>
        <h2 id="hero-note-title">Good trips start with useful details.</h2>
        <p className="hero-note-intro">
          The small practical things another traveller can actually use.
        </p>

        <div className="hero-note-details">
          <div className="hero-note-row">
            <span className="hero-note-icon" aria-hidden="true">
              <IndianRupee size={19} strokeWidth={2} />
            </span>
            <div>
              <strong>What you paid</strong>
              <span>Room rates, fares, meals and entry fees.</span>
            </div>
          </div>
          <div className="hero-note-row">
            <span className="hero-note-icon" aria-hidden="true">
              <Clock3 size={19} strokeWidth={2} />
            </span>
            <div>
              <strong>When you visited</strong>
              <span>So the next traveller knows how recent it is.</span>
            </div>
          </div>
          <div className="hero-note-row">
            <span className="hero-note-icon" aria-hidden="true">
              <Route size={19} strokeWidth={2} />
            </span>
            <div>
              <strong>What to know</strong>
              <span>Routes, timings, shortcuts and small surprises.</span>
            </div>
          </div>
        </div>

        <div className="hero-note-example">
          <p className="hero-note-meta">Explore · Goa</p>
          <blockquote>
If you’re exploring South Goa, don’t skip Butterfly Beach. Take the off-road route if you can ,it makes the visit even better.          </blockquote>
          <p className="hero-note-date">Visited Juanuary 2026</p>
        </div>
      </div>
    </aside>
  );
}
