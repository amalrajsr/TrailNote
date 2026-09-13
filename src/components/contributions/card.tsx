import Link from "next/link";
import Image from "next/image";
import { Clock3, Flag } from "lucide-react";
import { CategoryIcon } from "../ui/category-icon";
import { categoryLabels } from "../../lib/constants";
import { formatMoney, priceSuffix } from "../../lib/money";
import { formatMonth } from "../../lib/visit-month";
import type { ContributionCardDTO } from "../../server/queries/contributions";
import { ProfileAvatar } from "../profiles/avatar";
export function TipCard({ tip }: { tip: ContributionCardDTO }) {
  const photo = tip.photos[0];
  return (
    <article className="tip-card">
      <div className="row between">
        <div className={`category-label ${tip.category}`}>
          <CategoryIcon category={tip.category} />
          {categoryLabels[tip.category]}
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
      {tip.price && (
        <div className="price">
          {formatMoney(tip.price.paise, tip.price.unit)}
          <span>{priceSuffix(tip.price.unit, tip.price.unitLabel)}</span>
        </div>
      )}
      <p className="tip-copy">
        {Array.from(tip.body).slice(0, 230).join("")}
        {Array.from(tip.body).length > 230 ? "…" : ""}
      </p>
      <div className="tip-meta tip-author-meta">
        <Link
          className="tip-author-avatar-link"
          href={`/users/${tip.author.id}`}
          aria-label={`View @${tip.author.username}'s profile`}
        >
          <ProfileAvatar
            name={tip.author.displayName}
            avatar={tip.author.avatar}
            className="tip-author-avatar"
            sizes="28px"
          />
        </Link>
        <p>
          {tip.visitedMonth
            ? `Visited ${formatMonth(tip.visitedMonth)}`
            : formatMonth(null)}{" "}
          ·{" "}
          <Link className="author-link" href={`/users/${tip.author.id}`}>
            {tip.author.displayName}{" "}
            <span className="profile-handle">@{tip.author.username}</span>
          </Link>
        </p>
      </div>
      {tip.lastConfirmedMonth && (
        <p className="tip-confirm">
          Last confirmed {formatMonth(tip.lastConfirmedMonth)} ·{" "}
          {tip.confirmationCount} travelers
        </p>
      )}
      <div className="tip-actions">
        <Link className="quiet" href={`/tips/${tip.id}?intent=confirm`}>
          Still accurate
        </Link>
        <Link className="quiet" href={`/tips/${tip.id}?intent=helpful`}>
          Helpful {tip.helpfulCount}
        </Link>
        <Link className="quiet more" href={`/tips/${tip.id}`}>
          Read tip →
        </Link>
      </div>
    </article>
  );
}
