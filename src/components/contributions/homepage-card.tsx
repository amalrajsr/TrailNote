import Link from "next/link";
import { Clock3, Flag } from "lucide-react";
import { categoryLabels } from "../../lib/constants";
import { formatMoney, priceSuffix } from "../../lib/money";
import { formatMonth } from "../../lib/visit-month";
import type { ContributionCardDTO } from "../../server/queries/contributions";

const humanize = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function summaryFacts(tip: ContributionCardDTO) {
  const facts = tip.details;
  const values: string[] = [];
  if (facts.transportMode) values.push(humanize(facts.transportMode));
  if (facts.roomType) values.push(humanize(facts.roomType));
  if (facts.dish) values.push(facts.dish);
  if (facts.durationMinutes) values.push(`About ${facts.durationMinutes} min`);
  else if (facts.walkMinutes) values.push(`${facts.walkMinutes} min walk`);
  if (facts.bookingMethod) values.push(humanize(facts.bookingMethod));
  if (facts.timingNote) values.push(facts.timingNote);
  if (facts.boardingPoint) values.push(facts.boardingPoint);
  else if (facts.locationText) values.push(facts.locationText);
  return values.slice(0, 2);
}

export function HomepageTipCard({ tip }: { tip: ContributionCardDTO }) {
  const facts = summaryFacts(tip);
  const body = Array.from(tip.body);

  return (
    <Link className="home-tip-card" href={`/tips/${tip.id}`}>
      <div className="home-tip-top">
        <span className={`category-label ${tip.category}`}>
          {tip.category === "general"
            ? "Quick tip"
            : categoryLabels[tip.category]}
        </span>
        <span className="home-tip-place">
          {tip.destination.name}
          {tip.destination.state ? ` · ${tip.destination.state}` : ""}
        </span>
      </div>

      <h3>{tip.title}</h3>

      {tip.category !== "general" && tip.price && (
        <div className="home-tip-price">
          {formatMoney(tip.price.paise, tip.price.unit)}
          <span>{priceSuffix(tip.price.unit, tip.price.unitLabel)}</span>
        </div>
      )}

      {facts.length > 0 && (
        <p className="home-tip-facts">
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </p>
      )}

      <p className="home-tip-copy">
        {body.slice(0, 170).join("")}
        {body.length > 170 ? "…" : ""}
      </p>

      <div className="home-tip-footer">
        <span>
          {tip.visitedMonth
            ? `Visited ${formatMonth(tip.visitedMonth)}`
            : formatMonth(null)}
        </span>
        <span className={`badge ${tip.freshness.tone}`}>
          {tip.changeReported ? (
            <Flag size={13} aria-hidden />
          ) : (
            <Clock3 size={13} aria-hidden />
          )}
          {tip.freshness.label}
        </span>
      </div>
    </Link>
  );
}
