import { Clock3, Flag, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "../../../src/components/contributions/copy-link";
import { PhotoGallery } from "../../../src/components/contributions/photo-gallery";
import { ReactionControls } from "../../../src/components/contributions/reaction-controls";
import { ContactReveal } from "../../../src/components/contributions/contact-reveal";
import { ReportTip } from "../../../src/components/contributions/report-tip";
import { ProfileAvatar } from "../../../src/components/profiles/avatar";
import { CategoryIcon } from "../../../src/components/ui/category-icon";
import { InfoTooltip } from "../../../src/components/ui/info-tooltip";
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

const tipDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
  timeZoneName: "short",
});

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
  if (facts.boardingPoint) values.push(["Boarding point", facts.boardingPoint]);
  if (facts.timingNote) values.push(["Timing", facts.timingNote]);
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
        <Link
          href={`/users/${detail.author.id}`}
          aria-label={`View @${detail.author.username}'s profile`}
        >
          <ProfileAvatar
            name={detail.author.displayName}
            avatar={detail.author.avatar}
          />
        </Link>
        <p>
          Shared by{" "}
          <Link className="author-link" href={`/users/${detail.author.id}`}>
            {detail.author.displayName}{" "}
            <span className="profile-handle">@{detail.author.username}</span>
          </Link>
          <small>
            {detail.visitedMonth
              ? `Visited ${formatMonth(detail.visitedMonth)}`
              : formatMonth(null)}
          </small>
        </p>
      </div>
      {reaction.isAuthor && (
        <div className="detail-owner-actions">
          <Link className="btn secondary" href={`/tips/${detail.id}/edit`}>
            <Pencil size={16} aria-hidden="true" /> Edit your tip
          </Link>
        </div>
      )}
      {facts.length > 0 && (
        <section className="facts-section" aria-labelledby="useful-details">
          <h2 id="useful-details">Useful details</h2>
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
        </section>
      )}
      {detail.photos.length > 0 && <PhotoGallery photos={detail.photos} />}
      <section
        className="detail-actions"
        aria-labelledby="detail-actions-title"
      >
        <h2 id="detail-actions-title">Is this information still accurate?</h2>
        <p className="reaction-helper">
          Used this tip recently? Help other travellers know what still holds
          up.
        </p>
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
        <div className="moderation-action">
          <ReportTip id={detail.id} revision={detail.revision} />
        </div>
      </section>
      {detail.hasContact && <ContactReveal contributionId={detail.id} />}
    </article>
  );
}

function FreshnessPanel({ detail }: { detail: ContributionDetailDTO }) {
  const wasEdited = detail.revision > 1;
  const activityAt = wasEdited ? detail.updatedAt : detail.createdAt;

  return (
    <aside className="detail-aside">
      <section className="freshness-panel">
        <h2>Is this tip still current?</h2>
        {detail.changeReported && (
          <span className="badge warning">
            <Flag size={14} aria-hidden="true" /> Change reported
          </span>
        )}
        <p className="fresh-line">
          <small>Trip date</small>
          {detail.visitedMonth
            ? formatMonth(detail.visitedMonth)
            : "Not provided"}
        </p>
        <p className="fresh-line last-confirmed">
          <small className="fresh-label">
            Last confirmed
            <InfoTooltip label="Last confirmed" position="right">
              When another traveller most recently confirmed this tip.
            </InfoTooltip>
          </small>
          {detail.lastConfirmedAt ? (
            <time dateTime={new Date(detail.lastConfirmedAt).toISOString()}>
              {tipDateFormatter.format(detail.lastConfirmedAt)}
            </time>
          ) : (
            "Not yet confirmed"
          )}
        </p>
        <p className="fresh-line tip-activity">
          <small className="fresh-label">
            {wasEdited ? "Last updated" : "Added"}
            <InfoTooltip
              label={wasEdited ? "Last updated" : "Added"}
              position="right"
            >
              {wasEdited
                ? "When the original author last edited this tip."
                : "When the original author first shared this tip."}
            </InfoTooltip>
          </small>
          <time dateTime={new Date(activityAt).toISOString()}>
            {tipDateFormatter.format(activityAt)}
          </time>
        </p>
        {detail.confirmationCount > 0 && (
          <p className="fresh-count">
            {detail.confirmationCount}{" "}
            {detail.confirmationCount === 1 ? "traveller" : "travellers"}{" "}
            confirmed this version
          </p>
        )}
        <p className="muted">
          {detail.changeReported
            ? "Someone reported that these details may have changed. Review the latest update before relying on them."
            : detail.confirmationCount > 0
              ? "Traveller confirmations suggest this tip is still useful, but details can still change."
              : "No traveller has confirmed this tip yet. Verify important details before relying on it."}
        </p>
      </section>
      <section className="side-note trust-note">
        <h2>
          <Clock3 size={20} aria-hidden="true" /> Before you rely on this tip
        </h2>
        <p>
          Prices, routes, hours, and availability can change. Confirm important
          details locally before you go.
        </p>
        <CopyLink tipId={detail.parent?.id ?? detail.id} />
      </section>
    </aside>
  );
}

// function Updates({ detail }: { detail: ContributionDetailDTO }) {
//   if (
//     detail.isUpdate ||
//     (!detail.updates.length && !detail.earlierUpdates.length)
//   )
//     return null;

//   const cards = (updates: ContributionDetailDTO["updates"]) =>
//     updates.map((update) => {
//       const originalPrice = detail.updateOriginalPrices[update.id];
//       return (
//         <article className="update-card" key={update.id}>
//           <div className="row between update-byline">
//             <Link className="update-author" href={`/users/${update.author.id}`}>
//               <ProfileAvatar
//                 name={update.author.displayName}
//                 avatar={update.author.avatar}
//                 className="update-author-avatar"
//                 sizes="32px"
//               />
//               <span>
//                 <strong>{update.author.displayName}</strong>
//                 <small className="profile-handle">
//                   @{update.author.username}
//                 </small>
//               </span>
//             </Link>
//             <span>
//               {update.visitedMonth
//                 ? `Visited ${formatMonth(update.visitedMonth)}`
//                 : formatMonth(null)}
//             </span>
//           </div>
//           <p>{update.body}</p>
//           {(originalPrice || update.price) && (
//             <div className="update-prices">
//               {originalPrice && (
//                 <div>
//                   <span>Original report</span>
//                   <strong>
//                     {formatMoney(originalPrice.paise, originalPrice.unit)}{" "}
//                     <small>
//                       {priceSuffix(originalPrice.unit, originalPrice.unitLabel)}
//                     </small>
//                   </strong>
//                 </div>
//               )}
//               {update.price && (
//                 <div>
//                   <span>Update reported</span>
//                   <strong>
//                     {formatMoney(update.price.paise, update.price.unit)}{" "}
//                     <small>
//                       {priceSuffix(update.price.unit, update.price.unitLabel)}
//                     </small>
//                   </strong>
//                 </div>
//               )}
//             </div>
//           )}
//           <Link className="quiet update-link" href={`/tips/${update.id}`}>
//             Read full update →
//           </Link>
//         </article>
//       );
//     });

//   return (
//     <section className="updates" id="updates" aria-labelledby="updates-title">
//       <h2 id="updates-title">
//         Traveller updates <small>{detail.updates.length}</small>
//       </h2>
//       <div className="timeline">{cards(detail.updates)}</div>
//       {detail.earlierUpdates.length > 0 && (
//         <details className="revision-disclosure">
//           <summary>
//             Updates on an earlier version ({detail.earlierUpdates.length})
//           </summary>
//           <p className="muted">
//             Edited since these updates. They remain visible for context.
//           </p>
//           <div className="timeline">{cards(detail.earlierUpdates)}</div>
//         </details>
//       )}
//     </section>
//   );
// }

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
        {/* <Updates detail={detail} /> */}
      </div>
    </main>
  );
}
