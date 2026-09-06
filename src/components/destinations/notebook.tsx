import { BedDouble, Clock3, Lightbulb } from "lucide-react";
export function Notebook() {
  return (
    <div className="notebook" aria-hidden>
      <svg className="contours" viewBox="0 0 400 340">
        <path d="M-30 250C110 110 280 450 440 220M-30 270C110 130 280 470 440 240M-30 290C110 150 280 490 440 260M-30 230C110 90 280 430 440 200M-30 40C120-80 270 180 430 30M-30 60C120-60 270 200 430 50M-30 80C120-40 270 220 430 70" />
      </svg>
      <div className="paper">
        <div className="eyebrow">From one traveler to another</div>
        <h2>
          Good trips start with
          <br />
          useful details.
        </h2>
        <div className="notebook-line">
          <BedDouble size={17} />
          What you paid
        </div>
        <div className="notebook-line">
          <Clock3 size={17} />
          When you visited
        </div>
        <div className="notebook-line">
          <Lightbulb size={17} />
          What to know
        </div>
      </div>
    </div>
  );
}
