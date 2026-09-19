"use client";

import Link from "next/link";
import Image from "next/image";
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
import { Dialog } from "../ui/overlays";
import { Button, Textarea } from "../ui/primitives";
import { toast } from "../ui/toaster";

const reasonLabels = {
  spam: "Spam",
  inaccurate: "Inaccurate information",
  unsafe: "Unsafe information",
  private_information: "Private information",
  other: "Other",
};

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
    facts.push([
      "Transport",
      version.transportMode
        .split("_")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" "),
    ]);
  if (version.durationMinutes)
    facts.push(["Approximate duration", `${version.durationMinutes} min`]);
  if (version.walkMinutes)
    facts.push(["Walking time", `${version.walkMinutes} min`]);
  if (version.boardingPoint)
    facts.push(["Boarding point", version.boardingPoint]);
  if (version.timingNote) facts.push(["Timing", version.timingNote]);
  if (version.roomType) facts.push(["Room type", version.roomType]);
  if (version.bookingMethod)
    facts.push(["Booking method", version.bookingMethod]);
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

function TipVersion({
  version,
  destination,
}: {
  version: ModerationTipVersion;
  destination: string;
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
          <h4>Photos for this version</h4>
          <div>
            {version.photos.map((photo, index) => (
              <a
                href={photo.path}
                target="_blank"
                rel="noreferrer"
                key={`${photo.path}-${index}`}
              >
                <Image
                  src={photo.path}
                  width={photo.width}
                  height={photo.height}
                  sizes="(max-width: 767px) calc(50vw - 30px), 270px"
                  alt={photo.alt || `Photo ${index + 1}`}
                />
              </a>
            ))}
          </div>
        </div>
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
  const close = () => router.push(closeHref);
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
            ? "Tip report resolved."
            : disposition === "resolved"
              ? "Report resolved — issue fixed."
              : "Report dismissed.",
        );
        close();
        router.refresh();
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
          {report.status}
        </span>
        <span>Current tip: {tip.status}</span>
      </div>
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
      <section className="moderation-review-section">
        <h3>Report context</h3>
        <dl className="moderation-review-meta-list">
          <div>
            <dt>Reason</dt>
            <dd>{reasonLabels[report.reason]}</dd>
          </div>
          {report.details && (
            <div>
              <dt>Traveller&apos;s details</dt>
              <dd>{report.details}</dd>
            </div>
          )}
        </dl>
      </section>
      {tip.editedAfterReport && (
        <div
          className="moderation-version-tabs"
          role="tablist"
          aria-label="Tip version"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!showCurrent}
            className={!showCurrent ? "selected" : ""}
            onClick={() => setShowCurrent(false)}
          >
            Reported version · Rev {report.reportedRevision}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={showCurrent}
            className={showCurrent ? "selected" : ""}
            onClick={() => setShowCurrent(true)}
          >
            Current version · Rev {tip.currentRevision}
          </button>
        </div>
      )}
      <TipVersion version={version} destination={tip.destination.name} />
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
            Briefly describe what changed or why the current version resolves
            this report.
          </p>
          <Textarea
            id={`review-reason-${report.id}`}
            value={reason}
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
          />
          {confirmHide ? (
            <div className="moderation-hide-confirmation">
              <p>
                {tip.editedAfterReport
                  ? `This report was submitted against Revision ${report.reportedRevision}. You are about to hide the currently ${tip.status === "published" ? "published" : "hidden"} Revision ${tip.currentRevision}.`
                  : "Travellers will no longer be able to see this tip."}
              </p>
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="secondary"
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
            </div>
          ) : (
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
                disabled={!reason.trim() || tip.status === "deleted"}
                onClick={() => setConfirmHide(true)}
              >
                {hideLabel}
              </Button>
            </div>
          )}
        </footer>
      ) : (
        <section className="moderation-review-section moderation-review-closed">
          <h3>Resolution</h3>
          {report.resolutionAction === "issue_fixed" && (
            <p>Issue fixed in a later revision.</p>
          )}
          <p>{report.resolutionNote ?? "No resolution note was recorded."}</p>
          {report.resolvedAt && (
            <p className="muted">Reviewed {date(report.resolvedAt)}</p>
          )}
        </section>
      )}
    </Dialog>
  );
}
