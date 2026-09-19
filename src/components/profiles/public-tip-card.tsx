import Link from "next/link";
import { Clock3, Flag, MapPin } from "lucide-react";
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

export function PublicProfileTipCard({ tip }: { tip: ContributionCardDTO }) {
  const facts = summaryFacts(tip);
  const body = Array.from(tip.body);
  const freshnessTone =
    tip.freshness.tone === "warning"
      ? "warning"
      : tip.freshness.tone === "muted"
        ? "muted"
        : "success";

  return (
    <Link className="public-profile-tip-card" href={`/tips/${tip.id}`}>
      <div className="public-profile-tip-top">
        <span className="public-profile-tip-category">
          {tip.category === "general"
            ? "Quick tip"
            : categoryLabels[tip.category]}
        </span>
        <span className="public-profile-tip-place">
          <MapPin size={13} aria-hidden="true" />
          {tip.destination.name}
          {tip.destination.state ? ` · ${tip.destination.state}` : ""}
        </span>
      </div>

      <h3>{tip.title}</h3>

      {tip.category !== "general" && tip.price && (
        <div className="public-profile-tip-price">
          {formatMoney(tip.price.paise, tip.price.unit)}
          <span>{priceSuffix(tip.price.unit, tip.price.unitLabel)}</span>
        </div>
      )}

      {facts.length > 0 && (
        <p className="public-profile-tip-facts">
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </p>
      )}

      <p className="public-profile-tip-copy">
        {body.slice(0, 170).join("")}
        {body.length > 170 ? "…" : ""}
      </p>

      <div className="public-profile-tip-footer">
        <span>
          {tip.visitedMonth
            ? `Visited ${formatMonth(tip.visitedMonth)}`
            : formatMonth(null)}
        </span>
        <span className={`public-profile-freshness ${freshnessTone}`}>
          {tip.changeReported ? (
            <Flag size={13} aria-hidden="true" />
          ) : (
            <Clock3 size={13} aria-hidden="true" />
          )}
          {tip.freshness.label}
        </span>
      </div>
    </Link>
  );
}
