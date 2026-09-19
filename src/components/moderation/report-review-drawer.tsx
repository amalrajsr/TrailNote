"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
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
  destination,
  currentRevision,
}: {
  version: ModerationTipVersion;
  destination: string;
  currentRevision: number;
}) {
  const facts = factsFor(version);
  return (
    <section className="moderation-review-content" aria-live="polite">
      <p className="eyebrow">
        {categoryLabels[version.category]} · Revision {version.revision}
      </p>
      <h3>{titleFor(version, destination)}</h3>
      {version.pricePaise !== null && version.priceUnit && (
        <p className="moderation-review-price">
          {formatMoney(version.pricePaise, version.priceUnit)}
          <span>{priceSuffix(version.priceUnit, version.priceUnitLabel)}</span>
        </p>
      )}
      {version.visitedMonth && (
        <p className="moderation-review-meta">
          Trip date: {formatMonth(version.visitedMonth)}
        </p>
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
              version.revision < currentRevision
                ? "Historical photo unavailable"
                : "Photo unavailable"
            }
          />
        </div>
      )}
      {version.unavailablePhotoCount > 0 && (
        <p className="moderation-photo-unavailable" role="status">
          {version.revision < currentRevision
            ? "Historical photo unavailable"
            : "Photo unavailable"}
          {version.unavailablePhotoCount > 1
            ? ` (${version.unavailablePhotoCount} photos)`
            : ""}
        </p>
      )}
    </section>
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
      className="moderation-review-drawer"
    >
      <div className="moderation-review-header">
        <span className={`moderation-badge moderation-badge-${report.status}`}>
          {humanize(report.status)}
        </span>
        <span>Current tip: {humanize(tip.status)}</span>
      </div>
      <section className="moderation-review-section">
        <h3>Report context</h3>
        <dl className="moderation-review-meta-list">
          <div>
            <dt>Reason</dt>
            <dd>{reportReasonLabels[report.reason]}</dd>
          </div>
          {report.details && (
            <div>
              <dt>Traveller&apos;s report</dt>
              <dd>{report.details}</dd>
            </div>
          )}
        </dl>
      </section>
      {tip.editedAfterReport && (
        <aside className="moderation-revision-warning">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>
            <strong>This tip was edited after it was reported.</strong>
            <br />
            The report applies to Revision {report.reportedRevision}. Travellers
            currently see Revision {tip.currentRevision}. Review both versions
            before taking action.
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
      <TipVersion
        version={version}
        destination={tip.destination.name}
        currentRevision={tip.currentRevision}
      />
      <section className="moderation-review-section moderation-review-author">
        <h3>Shared by</h3>
        <p>
          {tip.author.displayName} <span>@{tip.author.username}</span>
        </p>
        <p className="muted">Account: {tip.author.status}</p>
        <Link href={`/users/${tip.author.id}`} target="_blank">
          View public profile
        </Link>
      </section>
      {detail.history.length > 0 && (
        <section className="moderation-review-section">
          <h3>Moderation history</h3>
          <ul className="moderation-history">
            {detail.history.map((event, index) => (
              <li key={`${event.createdAt}-${event.action}-${index}`}>
                <strong>
                  {historyActionLabels[event.action] ?? event.action}
                </strong>{" "}
                · {event.reason} · {date(event.createdAt)}
              </li>
            ))}
          </ul>
        </section>
      )}
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
      ) : (
        <section className="moderation-review-section moderation-review-closed">
          <h3>Review outcome</h3>
          <dl className="moderation-review-meta-list">
            <div>
              <dt>Status</dt>
              <dd>{humanize(report.status)}</dd>
            </div>
            {report.resolutionAction && (
              <div>
                <dt>Resolution</dt>
                <dd>
                  {report.resolutionAction === "issue_fixed"
                    ? "Issue fixed in a later revision"
                    : report.resolutionAction === "hide"
                      ? "Tip hidden"
                      : "Report dismissed; tip left unchanged"}
                </dd>
              </div>
            )}
            <div>
              <dt>Moderator note</dt>
              <dd>
                {report.resolutionNote ?? "No resolution note was recorded."}
              </dd>
            </div>
          </dl>
          {report.resolvedAt && (
            <p className="muted">Reviewed {date(report.resolvedAt)}</p>
          )}
        </section>
      )}
    </Dialog>
  );
}
