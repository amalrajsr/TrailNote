"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CircleX,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  ModerationReportDetail,
  ModerationTipVersion,
} from "../../server/services/moderation";
import { reviewReport } from "../../../app/moderation/actions";
import { categoryLabels } from "../../lib/constants";
import { formatMoney, priceSuffix } from "../../lib/money";
import { formatMonth } from "../../lib/visit-month";
import { reportReasonLabels } from "../../lib/report-reasons";
import { Dialog } from "../ui/overlays";
import { Button, Textarea } from "../ui/primitives";
import { toast } from "../ui/toaster";
import { PhotoGallery } from "../contributions/photo-gallery";

const historyActionLabels: Record<string, string> = {
  hide: "Tip hidden",
  issue_fixed: "Report resolved — issue fixed",
  dismiss: "Report dismissed",
};

const date = (value: number) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);

function titleFor(version: ModerationTipVersion, destination: string) {
  return (
    version.placeName ??
    (version.fromName && version.toName
      ? `${version.fromName} → ${version.toName}`
      : `${categoryLabels[version.category]}${version.category === "general" ? "" : " tip"} in ${destination}`)
  );
}

function factsFor(version: ModerationTipVersion) {
  const facts: Array<[string, string, string?]> = [];
  if (version.fromName) facts.push(["From", version.fromName]);
  if (version.toName) facts.push(["To", version.toName]);
  if (version.transportMode)
    facts.push(["Transport mode", humanize(version.transportMode)]);
  if (version.durationMinutes)
    facts.push(["Approximate duration", `${version.durationMinutes} min`]);
  if (version.walkMinutes)
    facts.push(["Walking time", `${version.walkMinutes} min`]);
  if (version.boardingPoint)
    facts.push(["Boarding point", version.boardingPoint]);
  if (version.timingNote) facts.push(["Timing", version.timingNote]);
  if (version.roomType) facts.push(["Room type", humanize(version.roomType)]);
  if (version.bookingMethod)
    facts.push(["Booking method", humanize(version.bookingMethod)]);
  if (version.dish) facts.push(["Dish", version.dish]);
  if (version.locationText)
    facts.push([
      "Location",
      version.locationText,
      version.mapsUrl ?? undefined,
    ]);
  else if (version.mapsUrl)
    facts.push(["Location", "Open in Maps", version.mapsUrl]);
  return facts;
}

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function TipVersion({
  version,
  tip,
}: {
  version: ModerationTipVersion;
  tip: ModerationReportDetail["tip"];
}) {
  const facts = factsFor(version);
  const initial = tip.author.displayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <article className="moderation-tip-review-card" aria-live="polite">
      <div className="moderation-tip-review-top">
        <div className="moderation-tip-review-tags">
          <span className="moderation-tip-category">
            {categoryLabels[version.category]}
          </span>
          <span className="moderation-revision-badge">
            Revision {version.revision}
          </span>
        </div>
        <span
          className={`moderation-badge moderation-badge-${tip.status} moderation-tip-status`}
        >
          Tip {humanize(tip.status)}
        </span>
      </div>
      <div className="moderation-tip-review-content">
        <h3>{titleFor(version, tip.destination.name)}</h3>
        {((version.pricePaise !== null && version.priceUnit) ||
          version.visitedMonth) && (
          <div className="moderation-review-overview">
            {version.pricePaise !== null && version.priceUnit && (
              <p className="moderation-review-price">
                {formatMoney(version.pricePaise, version.priceUnit)}
                <span>
                  {priceSuffix(version.priceUnit, version.priceUnitLabel)}
                </span>
              </p>
            )}
            {version.visitedMonth && (
              <p className="moderation-review-meta">
                Trip date: {formatMonth(version.visitedMonth)}
              </p>
            )}
          </div>
        )}
        <p className="moderation-review-body">{version.body}</p>
        {facts.length > 0 && (
          <dl className="moderation-review-facts">
            {facts.map(([label, value, href]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer">
                      {value} <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {version.photos.length > 0 && (
          <div className="moderation-review-photos">
            <PhotoGallery
              key={version.revision}
              photos={version.photos}
              title={`Photos for Revision ${version.revision}`}
              unavailableLabel={
                version.revision < tip.currentRevision
                  ? "Historical photo unavailable"
                  : "Photo unavailable"
              }
            />
          </div>
        )}
        {version.unavailablePhotoCount > 0 && (
          <p className="moderation-photo-unavailable" role="status">
            {version.revision < tip.currentRevision
              ? "Historical photo unavailable"
              : "Photo unavailable"}
            {version.unavailablePhotoCount > 1
              ? ` (${version.unavailablePhotoCount} photos)`
              : ""}
          </p>
        )}
        <div className="moderation-author-row">
          <div className="moderation-author-person">
            <span className="moderation-author-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="moderation-author-copy">
              <strong>
                {tip.author.displayName} <span>@{tip.author.username}</span>
              </strong>
              <span>{humanize(tip.author.status)} account</span>
            </div>
          </div>
          <Link
            href={`/users/${tip.author.id}`}
            target="_blank"
            rel="noreferrer"
            className="moderation-author-link"
          >
            View public profile <ExternalLink size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ReportReviewDrawer({
  detail,
  closeHref,
}: {
  detail: ModerationReportDetail | null;
  closeHref: string;
}) {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmHide, setConfirmHide] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!detail) return null;
  const { report, tip } = detail;
  const showingCurrent = tip.editedAfterReport && showCurrent;
  const version = showingCurrent ? tip.currentVersion : tip.reportedVersion;
  const hideLabel =
    tip.status === "hidden"
      ? "Keep hidden & resolve report"
      : tip.editedAfterReport
        ? "Hide current tip"
        : "Hide tip";
  const hideConfirmationDescription =
    tip.status === "hidden"
      ? `Revision ${tip.currentRevision} is already hidden. It will stay hidden while this report is resolved.`
      : tip.editedAfterReport
        ? `This report was submitted against Revision ${report.reportedRevision}. You are about to hide the currently published Revision ${tip.currentRevision}.`
        : "Travellers will no longer be able to see this tip.";
  const close = () => router.replace(closeHref, { scroll: false });
  const submit = (disposition: "hide" | "resolved" | "dismiss") =>
    startTransition(async () => {
      const result = await reviewReport(
        report.id,
        tip.currentRevision,
        disposition,
        reason,
      );
      if (result.ok) {
        toast(
          disposition === "hide"
            ? tip.status === "hidden"
              ? "Report resolved. Tip remains hidden."
              : "Report resolved. Tip hidden."
            : disposition === "resolved"
              ? "Report resolved. Tip visibility unchanged."
              : "Report dismissed. Tip unchanged.",
        );
        close();
      } else {
        toast(result.message ?? "Could not save this review.", "error");
        if (result.code === "CONFLICT") router.refresh();
      }
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      title="Tip report"
      description={`Reported ${date(report.createdAt)} · ${tip.destination.name}, ${tip.destination.state}`}
      closeLabel="Close report review"
      titleAddon={
        <div className="moderation-review-title-badges">
          <span
            className={`moderation-badge moderation-badge-${report.status}`}
          >
            {humanize(report.status)}
          </span>
          <span
            className={`moderation-badge moderation-badge-${tip.status} moderation-tip-status`}
          >
            Tip {humanize(tip.status)}
          </span>
        </div>
      }
      className="moderation-review-drawer"
    >
      <div className="moderation-review-scroll">
        <section className="moderation-review-section moderation-report-section">
          <div className="moderation-section-heading">
            <div>
              <span className="moderation-section-kicker">Report</span>
              <h3>Why this was reported</h3>
            </div>
          </div>
          <div className="moderation-report-card">
            <div className="moderation-report-reason">
              <span
                className="moderation-report-reason-icon"
                aria-hidden="true"
              >
                <AlertTriangle size={16} />
              </span>
              <div>
                <span className="moderation-report-label">Reason</span>
                <strong>{reportReasonLabels[report.reason]}</strong>
              </div>
            </div>
            {report.details && (
              <div className="moderation-report-message">
                <span className="moderation-report-label">
                  Traveller&apos;s report
                </span>
                <p>{report.details}</p>
              </div>
            )}
          </div>
        </section>
        {tip.editedAfterReport && (
          <aside className="moderation-revision-warning">
            <AlertTriangle size={20} aria-hidden="true" />
            <p>
              <strong>This tip was edited after it was reported.</strong>
              <br />
              The report applies to Revision {report.reportedRevision}.
              Travellers currently see Revision {tip.currentRevision}. Review
              both versions before taking action.
            </p>
          </aside>
        )}
        {tip.editedAfterReport && (
          <div
            className="moderation-version-tabs"
            role="group"
            aria-label="Tip version"
          >
            <button
              type="button"
              aria-pressed={!showCurrent}
              className={!showCurrent ? "selected" : ""}
              onClick={() => setShowCurrent(false)}
            >
              Reported version · Rev {report.reportedRevision}
            </button>
            <button
              type="button"
              aria-pressed={showCurrent}
              className={showCurrent ? "selected" : ""}
              onClick={() => setShowCurrent(true)}
            >
              Current version · Rev {tip.currentRevision}
            </button>
          </div>
        )}
        <section className="moderation-review-section moderation-tip-section">
          <div className="moderation-section-heading">
            <div>
              <span className="moderation-section-kicker">
                Reported content
              </span>
              <h3>Tip at the time of report</h3>
            </div>
          </div>
          <TipVersion version={version} tip={tip} />
        </section>
        {detail.history.length > 0 && (
          <section className="moderation-review-section moderation-history-section">
            <div className="moderation-section-heading">
              <div>
                <span className="moderation-section-kicker">History</span>
                <h3>Moderation activity</h3>
              </div>
            </div>
            <ul className="moderation-timeline">
              {detail.history.map((event, index) => (
                <li key={`${event.createdAt}-${event.action}-${index}`}>
                  <span className="moderation-timeline-icon" aria-hidden="true">
                    {event.action === "hide" ? (
                      <EyeOff size={15} />
                    ) : event.action === "dismiss" ? (
                      <CircleX size={15} />
                    ) : (
                      <Check size={15} />
                    )}
                  </span>
                  <div className="moderation-timeline-copy">
                    <strong>
                      {historyActionLabels[event.action] ?? event.action}
                    </strong>
                    <p>{event.reason}</p>
                    <time dateTime={new Date(event.createdAt).toISOString()}>
                      {date(event.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {report.status !== "open" && (
          <section className="moderation-review-section moderation-review-closed">
            <div className="moderation-section-heading">
              <div>
                <span className="moderation-section-kicker">Outcome</span>
                <h3>Review outcome</h3>
              </div>
            </div>
            <div
              className={`moderation-outcome-card${report.status === "dismissed" ? " is-dismissed" : ""}`}
            >
              <span className="moderation-outcome-icon" aria-hidden="true">
                {report.status === "dismissed" ? (
                  <CircleX size={17} />
                ) : (
                  <Check size={17} />
                )}
              </span>
              <div>
                <div className="moderation-outcome-title">
                  <strong>{humanize(report.status)}</strong>
                  {report.resolutionAction && (
                    <span>
                      {report.resolutionAction === "issue_fixed"
                        ? "Issue fixed in a later revision"
                        : report.resolutionAction === "hide"
                          ? "Tip hidden"
                          : "Tip left unchanged"}
                    </span>
                  )}
                </div>
                <p className="moderation-outcome-note">
                  {report.resolutionNote ?? "No resolution note was recorded."}
                </p>
                {report.resolvedAt && (
                  <p className="moderation-outcome-date">
                    Reviewed {date(report.resolvedAt)}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
      {report.status === "open" ? (
        <footer className="moderation-review-footer">
          <label className="label" htmlFor={`review-reason-${report.id}`}>
            Resolution note <span className="optional">(required)</span>
          </label>
          <p className="small muted">
            Briefly explain the moderation decision.
          </p>
          <Textarea
            id={`review-reason-${report.id}`}
            value={reason}
            maxLength={1000}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="dialog-actions">
            {tip.editedAfterReport && (
              <Button
                type="button"
                busy={pending}
                disabled={!reason.trim()}
                onClick={() => submit("resolved")}
              >
                Issue fixed
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              busy={pending}
              disabled={!reason.trim()}
              onClick={() => submit("dismiss")}
            >
              Dismiss report
            </Button>
            <Button
              type="button"
              className="danger"
              disabled={!reason.trim() || tip.status === "deleted" || pending}
              onClick={() => setConfirmHide(true)}
            >
              {hideLabel}
            </Button>
          </div>
          <Dialog
            open={confirmHide}
            onOpenChange={setConfirmHide}
            title={
              tip.status === "hidden"
                ? "Keep this tip hidden?"
                : tip.editedAfterReport
                  ? "Hide the current version?"
                  : "Hide this tip?"
            }
            description={hideConfirmationDescription}
          >
            <div className="dialog-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirmHide(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="danger"
                busy={pending}
                onClick={() => submit("hide")}
              >
                {hideLabel}
              </Button>
            </div>
          </Dialog>
        </footer>
      ) : null}
    </Dialog>
  );
}
