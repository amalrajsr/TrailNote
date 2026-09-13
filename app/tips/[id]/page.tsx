import { Clock3, Flag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "../../../src/components/contributions/copy-link";
import { PhotoGallery } from "../../../src/components/contributions/photo-gallery";
import { ReactionControls } from "../../../src/components/contributions/reaction-controls";
import { ContactReveal } from "../../../src/components/contributions/contact-reveal";
import { ReportTip } from "../../../src/components/contributions/report-tip";
import { CategoryIcon } from "../../../src/components/ui/category-icon";
import { getDatabase } from "../../../src/db";
import { categoryLabels } from "../../../src/lib/constants";
import { formatMoney, priceSuffix } from "../../../src/lib/money";
import { formatMonth } from "../../../src/lib/visit-month";
import { viewer } from "../../../src/server/auth";
import {
  contributionDetail,
  viewerReactionState,
  type ContributionCardDTO,
  type ContributionDetailDTO,
} from "../../../src/server/queries/contributions";
import { DomainError } from "../../../src/server/result";

export async function generateMetadata({ params }: PageProps<"/tips/[id]">) {
  const { id } = await params;
  try {
    const { db } = await getDatabase();
    const detail = await contributionDetail(db, id);
    return {
      title: detail.title,
      description: Array.from(detail.body).slice(0, 155).join(""),
      alternates: { canonical: `/tips/${id}` },
    };
  } catch {
    return { title: "Tip unavailable", robots: { index: false } };
  }
}

const humanize = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function Price({ price }: { price: ContributionCardDTO["price"] }) {
  if (!price) return null;
  return (
    <div className="price">
      {formatMoney(price.paise, price.unit)}
      <span>{priceSuffix(price.unit, price.unitLabel)}</span>
    </div>
  );
}

function factsFor(detail: ContributionDetailDTO) {
  const values: Array<[string, string, string?]> = [];
  const facts = detail.details;
  if (facts.fromName) values.push(["From", facts.fromName]);
  if (facts.toName) values.push(["To", facts.toName]);
  if (facts.transportMode)
    values.push(["Transport", humanize(facts.transportMode)]);
  if (facts.durationMinutes)
    values.push([
      "Approximate duration",
      `${facts.durationMinutes} ${facts.durationMinutes === 1 ? "minute" : "minutes"}`,
    ]);
  if (facts.roomType) values.push(["Room type", humanize(facts.roomType)]);
  if (facts.bookingMethod)
    values.push(["Booking method", humanize(facts.bookingMethod)]);
  if (facts.dish) values.push(["Dish", facts.dish]);
  if (facts.walkMinutes)
    values.push([
      "Walking time",
      `${facts.walkMinutes} ${facts.walkMinutes === 1 ? "minute" : "minutes"}`,
    ]);
  if (facts.locationText)
    values.push(["Location", facts.locationText, facts.mapsUrl ?? undefined]);
  else if (facts.mapsUrl)
    values.push(["Location", "Open in Maps", facts.mapsUrl]);
  return values;
}

function DetailCard({
  detail,
  reaction,
  intent,
}: {
  detail: ContributionDetailDTO;
  reaction: Awaited<ReturnType<typeof viewerReactionState>>;
  intent?: string;
}) {
  const rootId = detail.parent?.id ?? detail.id;
  const facts = factsFor(detail);
  const mode = detail.details.transportMode
    ? humanize(detail.details.transportMode)
    : detail.details.roomType
      ? humanize(detail.details.roomType)
      : null;
  const duration = detail.details.durationMinutes
    ? `About ${detail.details.durationMinutes} min`
    : detail.details.walkMinutes
      ? `${detail.details.walkMinutes} min walk`
      : null;

  return (
    <article className="detail-main">
      <div className="row between detail-label-row">
        <div className={`category-label ${detail.category}`}>
          <CategoryIcon category={detail.category} />
          {categoryLabels[detail.category]}
        </div>
        <span className={`badge ${detail.freshness.tone}`}>
          {detail.changeReported ? (
            <Flag size={14} aria-hidden="true" />
          ) : (
            <Clock3 size={14} aria-hidden="true" />
          )}
          {detail.freshness.label}
        </span>
      </div>
      {detail.parent && (
        <p className="parent-reference">
          Update to{" "}
          <Link href={`/tips/${detail.parent.id}`}>{detail.parent.title}</Link>
        </p>
      )}
      <h1>{detail.title}</h1>
      <Price price={detail.price} />
      {(mode || duration) && (
        <p className="detail-mode">
          {[mode, duration].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="detail-text">{detail.body}</p>
      <div className="author">
        <span className="avatar" aria-hidden="true">
          {detail.author.initial}
        </span>
        <p>
          Shared by {detail.author.displayName}
          <small>
            {detail.visitedMonth
              ? `Visited ${formatMonth(detail.visitedMonth)}`
              : formatMonth(null)}
          </small>
        </p>
      </div>
      {facts.length > 0 && (
        <dl className="facts">
          {facts.map(([label, value, href]) => (
            <div key={label}>
              <dt className="fact-label">{label}</dt>
              <dd className="fact-value">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                  >
                    {value} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {detail.photos.length > 0 && <PhotoGallery photos={detail.photos} />}
      <section
        className="detail-actions"
        aria-labelledby="detail-actions-title"
      >
        <h2 id="detail-actions-title">Know this information?</h2>
        <ReactionControls
          id={detail.id}
          rootId={rootId}
          revision={detail.revision}
          visitedMonth={detail.visitedMonth}
          initialState={reaction}
          initialConfirmationCount={detail.confirmationCount}
          initialHelpfulCount={detail.helpfulCount}
          intent={intent}
        />
        <ReportTip id={detail.id} revision={detail.revision} />
      </section>
      {detail.hasContact && <ContactReveal contributionId={detail.id} />}
    </article>
  );
}

function FreshnessPanel({ detail }: { detail: ContributionDetailDTO }) {
  return (
    <aside className="detail-aside">
      <section className="freshness-panel">
        <h2>How recent is this?</h2>
        {detail.changeReported && (
          <span className="badge warning">
            <Flag size={14} aria-hidden="true" /> Change reported
          </span>
        )}
        <p className="fresh-line">
          <small>Originally visited</small>
          {detail.visitedMonth
            ? formatMonth(detail.visitedMonth)
            : "Not provided"}
        </p>
        <p className="fresh-line">
          <small>Last confirmed</small>
          {detail.lastConfirmedMonth
            ? formatMonth(detail.lastConfirmedMonth)
            : "No confirmations yet"}
        </p>
        <p className="fresh-count">
          {detail.confirmationCount === 0
            ? "No confirmations yet"
            : `${detail.confirmationCount} ${detail.confirmationCount === 1 ? "traveler" : "travelers"} confirmed this version`}
        </p>
        <p className="muted">
          {detail.changeReported
            ? "A traveler has reported a change. Read the update before relying on the original details."
            : "Community confirmations reflect travelers' experiences."}
        </p>
      </section>
      <section className="side-note trust-note">
        <h2>
          <Clock3 size={20} aria-hidden="true" /> From travelers, for travelers
        </h2>
        <p>
          Community confirmations reflect travelers&apos; experiences. Fares and
          availability may change.
        </p>
        <CopyLink tipId={detail.parent?.id ?? detail.id} />
      </section>
    </aside>
  );
}

function Updates({ detail }: { detail: ContributionDetailDTO }) {
  if (
    detail.isUpdate ||
    (!detail.updates.length && !detail.earlierUpdates.length)
  )
    return null;

  const cards = (updates: ContributionDetailDTO["updates"]) =>
    updates.map((update) => {
      const originalPrice = detail.updateOriginalPrices[update.id];
      return (
        <article className="update-card" key={update.id}>
          <div className="row between update-byline">
            <strong>{update.author.displayName}</strong>
            <span>
              {update.visitedMonth
                ? `Visited ${formatMonth(update.visitedMonth)}`
                : formatMonth(null)}
            </span>
          </div>
          <p>{update.body}</p>
          {(originalPrice || update.price) && (
            <div className="update-prices">
              {originalPrice && (
                <div>
                  <span>Original report</span>
                  <strong>
                    {formatMoney(originalPrice.paise, originalPrice.unit)}{" "}
                    <small>
                      {priceSuffix(originalPrice.unit, originalPrice.unitLabel)}
                    </small>
                  </strong>
                </div>
              )}
              {update.price && (
                <div>
                  <span>Update reported</span>
                  <strong>
                    {formatMoney(update.price.paise, update.price.unit)}{" "}
                    <small>
                      {priceSuffix(update.price.unit, update.price.unitLabel)}
                    </small>
                  </strong>
                </div>
              )}
            </div>
          )}
          <Link className="quiet update-link" href={`/tips/${update.id}`}>
            Read full update →
          </Link>
        </article>
      );
    });

  return (
    <section className="updates" id="updates" aria-labelledby="updates-title">
      <h2 id="updates-title">
        Traveler updates <small>{detail.updates.length}</small>
      </h2>
      <div className="timeline">{cards(detail.updates)}</div>
      {detail.earlierUpdates.length > 0 && (
        <details className="revision-disclosure">
          <summary>
            Updates on an earlier version ({detail.earlierUpdates.length})
          </summary>
          <p className="muted">
            Edited since these updates. They remain visible for context.
          </p>
          <div className="timeline">{cards(detail.earlierUpdates)}</div>
        </details>
      )}
    </section>
  );
}

export default async function TipDetailPage({
  params,
  searchParams,
}: PageProps<"/tips/[id]"> & {
  searchParams: Promise<{ intent?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { db } = await getDatabase();
  let detail: ContributionDetailDTO;
  try {
    detail = await contributionDetail(db, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const user = await viewer();
  const reaction = await viewerReactionState(db, id, user?.id);
  return (
    <main id="main" className="container page-top detail-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href={`/destinations/${detail.destination.slug}`}>
          {detail.destination.name}
        </Link>
        <span>/</span>
        <span>{categoryLabels[detail.category]}</span>
      </nav>
      <div className="two-col detail-grid">
        <DetailCard detail={detail} reaction={reaction} intent={query.intent} />
        <FreshnessPanel detail={detail} />
      </div>
      <Updates detail={detail} />
      {detail.previousRevisions.length > 0 && (
        <details className="revision-disclosure history-disclosure">
          <summary>
            Revision history ({detail.previousRevisions.length} earlier)
          </summary>
          {detail.previousRevisions.map((revision) => (
            <article key={revision.revision} className="revision-card">
              <strong>Version {revision.revision}</strong>
              <p>{revision.body}</p>
            </article>
          ))}
        </details>
      )}
    </main>
  );
}
