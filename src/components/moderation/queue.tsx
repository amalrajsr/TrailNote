"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  changeAccountStatus,
  changeTipVisibility,
  reviewContactRequest,
  reviewReport,
} from "../../../app/moderation/actions";
import { Dialog } from "../ui/overlays";
import { Button, Textarea } from "../ui/primitives";

type Event = {
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  createdAt: number;
};
type Contribution = {
  id: string;
  contributionId: string;
  revision: number;
  reason: string;
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  resolutionNote: string | null;
  createdAt: number;
  body: string;
  destination: string;
  contributionStatus: "published" | "hidden" | "deleted";
  authorId: string;
  authorName: string;
  authorStatus: "active" | "suspended";
};
type Contact = {
  id: string;
  contributionId: string;
  contactId: string;
  requestText: string;
  status: "open" | "resolved" | "dismissed";
  resolutionNote: string | null;
  createdAt: number;
  body: string;
  destination: string;
  contactStatus: "visible" | "hidden";
};
type Result = { ok: boolean; code?: string; message?: string };

function History({ events }: { events: Event[] }) {
  if (!events.length) return null;
  return (
    <details>
      <summary>Moderation history ({events.length})</summary>
      <ul className="moderation-history">
        {events.map((event, index) => (
          <li key={`${event.targetId}-${event.createdAt}-${index}`}>
            <strong>{event.action}</strong> · {event.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ContributionRow({
  item,
  events,
}: {
  item: Contribution;
  events: Event[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<"hide" | "suspend" | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<Result>, success: string) =>
    startTransition(async () => {
      const result = await work();
      setMessage(
        result.ok ? success : (result.message ?? "Could not save this review."),
      );
      if (result.ok || result.code === "CONFLICT") router.refresh();
    });
  const confirmed = () => {
    if (confirm === "hide")
      run(
        () =>
          item.status === "open"
            ? reviewReport(item.id, "hide", reason)
            : changeTipVisibility(
                item.contributionId,
                item.contributionStatus === "hidden" ? "hidden" : "published",
                "hidden",
                reason,
              ),
        "Tip hidden.",
      );
    if (confirm === "suspend")
      run(
        () =>
          changeAccountStatus(
            item.authorId,
            item.authorStatus,
            "suspended",
            reason,
          ),
        "Traveler suspended.",
      );
    setConfirm(null);
  };
  const history = events.filter((event) =>
    [item.contributionId, item.authorId].includes(event.targetId),
  );
  return (
    <article className="tip-card moderation-row">
      <p className="eyebrow">
        {item.status} · {item.destination}
      </p>
      <h2>Contribution report</h2>
      <p>{item.details ?? item.body}</p>
      {item.resolutionNote && (
        <p>
          <strong>Resolution:</strong> {item.resolutionNote}
        </p>
      )}
      <p className="muted">
        Tip: {item.contributionStatus} · {item.authorName}: {item.authorStatus}
      </p>
      <History events={history} />
      <label className="label" htmlFor={`reason-${item.id}`}>
        Disposition reason
      </label>
      <Textarea
        id={`reason-${item.id}`}
        value={reason}
        maxLength={1000}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="row">
        {item.status === "open" && (
          <>
            <Button
              type="button"
              disabled={!reason.trim()}
              onClick={() => setConfirm("hide")}
            >
              Hide tip
            </Button>
            <Button
              type="button"
              variant="secondary"
              busy={pending}
              disabled={!reason.trim()}
              onClick={() =>
                run(
                  () => reviewReport(item.id, "dismiss", reason),
                  "Report dismissed.",
                )
              }
            >
              Dismiss report
            </Button>
          </>
        )}
        {item.contributionStatus === "hidden" && (
          <Button
            type="button"
            variant="secondary"
            busy={pending}
            disabled={!reason.trim()}
            onClick={() =>
              run(
                () =>
                  changeTipVisibility(
                    item.contributionId,
                    "hidden",
                    "published",
                    reason,
                  ),
                "Tip restored.",
              )
            }
          >
            Restore tip
          </Button>
        )}
        {item.authorStatus === "active" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={!reason.trim()}
            onClick={() => setConfirm("suspend")}
          >
            Suspend traveler
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            busy={pending}
            disabled={!reason.trim()}
            onClick={() =>
              run(
                () =>
                  changeAccountStatus(
                    item.authorId,
                    "suspended",
                    "active",
                    reason,
                  ),
                "Traveler restored.",
              )
            }
          >
            Restore traveler
          </Button>
        )}
      </div>
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm === "suspend" ? "Suspend this traveler?" : "Hide this tip?"
        }
        description={
          confirm === "suspend"
            ? "Their contributions and confirmations will no longer be public."
            : "It will no longer be visible to travelers."
        }
      >
        <div className="row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirm(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="danger"
            busy={pending}
            onClick={confirmed}
          >
            {confirm === "suspend" ? "Suspend traveler" : "Hide tip"}
          </Button>
        </div>
      </Dialog>
    </article>
  );
}

function ContactRow({ item, events }: { item: Contact; events: Event[] }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (disposition: "hide" | "dismiss") =>
    startTransition(async () => {
      const result = await reviewContactRequest(item.id, disposition, reason);
      setMessage(
        result.ok
          ? disposition === "hide"
            ? "Contact hidden."
            : "Request dismissed."
          : (result.message ?? "Could not save this review."),
      );
      if (result.ok || result.code === "CONFLICT") router.refresh();
    });
  return (
    <article className="tip-card moderation-row">
      <p className="eyebrow">
        {item.status} · {item.destination}
      </p>
      <h2>Contact removal request</h2>
      <p>{item.requestText}</p>
      {item.resolutionNote && (
        <p>
          <strong>Resolution:</strong> {item.resolutionNote}
        </p>
      )}
      <p className="muted">Contact: {item.contactStatus}</p>
      <History
        events={events.filter((event) => event.targetId === item.contactId)}
      />
      {item.status === "open" && (
        <>
          <label className="label" htmlFor={`reason-${item.id}`}>
            Disposition reason
          </label>
          <Textarea
            id={`reason-${item.id}`}
            value={reason}
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="row">
            <Button
              type="button"
              disabled={!reason.trim()}
              onClick={() => setConfirm(true)}
            >
              Hide contact
            </Button>
            <Button
              type="button"
              variant="secondary"
              busy={pending}
              disabled={!reason.trim()}
              onClick={() => run("dismiss")}
            >
              Dismiss report
            </Button>
          </div>
        </>
      )}
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Hide this contact?"
        description="The number will no longer be available to readers."
      >
        <div className="row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="danger"
            busy={pending}
            onClick={() => {
              setConfirm(false);
              run("hide");
            }}
          >
            Hide contact
          </Button>
        </div>
      </Dialog>
    </article>
  );
}

export function ModerationQueue({
  contributions,
  contacts,
  events,
}: {
  contributions: Contribution[];
  contacts: Contact[];
  events: Event[];
}) {
  const [kind, setKind] = useState<"contributions" | "contacts">(
    "contributions",
  );
  const [view, setView] = useState<"open" | "resolved">("open");
  const visible = <T extends { status: string }>(items: T[]) =>
    items.filter((item) =>
      view === "open" ? item.status === "open" : item.status !== "open",
    );
  const items =
    kind === "contributions" ? visible(contributions) : visible(contacts);
  return (
    <section>
      <div className="tabs" role="tablist" aria-label="Report type">
        <button
          className={kind === "contributions" ? "selected" : ""}
          role="tab"
          aria-selected={kind === "contributions"}
          onClick={() => setKind("contributions")}
        >
          Contributions
        </button>
        <button
          className={kind === "contacts" ? "selected" : ""}
          role="tab"
          aria-selected={kind === "contacts"}
          onClick={() => setKind("contacts")}
        >
          Contacts
        </button>
      </div>
      <div
        className="tabs moderation-status-tabs"
        role="tablist"
        aria-label="Report status"
      >
        <button
          className={view === "open" ? "selected" : ""}
          role="tab"
          aria-selected={view === "open"}
          onClick={() => setView("open")}
        >
          Open
        </button>
        <button
          className={view === "resolved" ? "selected" : ""}
          role="tab"
          aria-selected={view === "resolved"}
          onClick={() => setView("resolved")}
        >
          Resolved
        </button>
      </div>
      <div className="stack">
        {kind === "contributions"
          ? (items as Contribution[]).map((item) => (
              <ContributionRow key={item.id} item={item} events={events} />
            ))
          : (items as Contact[]).map((item) => (
              <ContactRow key={item.id} item={item} events={events} />
            ))}
        {items.length === 0 && (
          <p className="empty-state">Nothing in this queue.</p>
        )}
      </div>
    </section>
  );
}
