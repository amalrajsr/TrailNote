import Link from "next/link";
import Image from "next/image";
import { Clock3, Flag, MoreHorizontal } from "lucide-react";
import { CategoryIcon } from "../ui/category-icon";
import { categoryLabels } from "../../lib/constants";
import { formatMoney, priceSuffix } from "../../lib/money";
import { formatMonth } from "../../lib/visit-month";
import type {
  ContributionCardDTO,
  ViewerReactionState,
} from "../../server/queries/contributions";
import { ReactionControls } from "./reaction-controls";

const humanize = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function quickFacts(tip: ContributionCardDTO) {
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
  return values.slice(0, 3);
}

export function TipCard({
  tip,
  reactionState,
}: {
  tip: ContributionCardDTO;
  reactionState: ViewerReactionState;
}) {
  const photo = tip.photos[0];
  const facts = quickFacts(tip);
  return (
    <article className="tip-card">
      <div className="row between">
        <div className={`category-label ${tip.category}`}>
          <CategoryIcon category={tip.category} />
          {tip.category === "general"
            ? "General"
            : categoryLabels[tip.category]}
        </div>
        <span className={`badge ${tip.freshness.tone}`}>
          {tip.changeReported ? (
            <Flag size={14} aria-hidden />
          ) : (
            <Clock3 size={14} aria-hidden />
          )}
          {tip.freshness.label}
        </span>
      </div>
      {photo && (
        <Image
          className="tip-thumbnail"
          src={photo.path}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 767px) 72px, 96px"
          alt={photo.alt}
        />
      )}
      <h3>
        <Link href={`/tips/${tip.id}`}>{tip.title}</Link>
      </h3>
      {tip.category !== "general" && tip.price && (
        <div className="price">
          {formatMoney(tip.price.paise, tip.price.unit)}
          <span>{priceSuffix(tip.price.unit, tip.price.unitLabel)}</span>
        </div>
      )}
      {facts.length > 0 && (
        <p className="tip-facts">
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </p>
      )}
      <p className="tip-copy">
        {Array.from(tip.body).slice(0, 230).join("")}
        {Array.from(tip.body).length > 230 ? "…" : ""}
      </p>
      <p className="tip-meta">
        {tip.visitedMonth
          ? `Visited ${formatMonth(tip.visitedMonth)}`
          : formatMonth(null)}{" "}
        ·{" "}
        <Link className="author-link" href={`/users/${tip.author.id}`}>
          {tip.author.displayName}{" "}
          <span className="profile-handle">@{tip.author.username}</span>
        </Link>
      </p>
      {tip.lastConfirmedMonth && (
        <p className="tip-confirm">
          Last confirmed {formatMonth(tip.lastConfirmedMonth)} ·{" "}
          {tip.confirmationCount} travellers
        </p>
      )}
      <div className="tip-actions">
        <ReactionControls
          compact
          id={tip.id}
          rootId={tip.id}
          revision={tip.revision}
          visitedMonth={tip.visitedMonth}
          initialState={reactionState}
          initialConfirmationCount={tip.confirmationCount}
          initialHelpfulCount={tip.helpfulCount}
        />
        <Link
          className="quiet more"
          href={`/tips/${tip.id}`}
          aria-label="Read tip"
        >
          <MoreHorizontal size={20} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
