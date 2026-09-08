"use client";

import { useState, useTransition } from "react";
import {
  reviewContactRequest,
  reviewReport,
} from "../../../app/moderation/actions";
import { Button, Textarea } from "../ui/primitives";

type Contribution = {
  id: string;
  contributionId: string;
  revision: number;
  reason: string;
  details: string | null;
  createdAt: number;
  body: string;
  destination: string;
};
type Contact = {
  id: string;
  contributionId: string;
  contactId: string;
  requestText: string;
  createdAt: number;
  body: string;
  destination: string;
};
function Row({
  title,
  text,
  onReview,
}: {
  title: string;
  text: string;
  onReview: (
    disposition: "hide" | "dismiss",
    reason: string,
  ) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const review = (disposition: "hide" | "dismiss") =>
    startTransition(async () => {
      const result = await onReview(disposition, reason);
      setMessage(
        result.ok
          ? "Reviewed."
          : (result.message ?? "Could not save this review."),
      );
    });
  return (
    <article className="tip-card moderation-row">
      <h2>{title}</h2>
      <p>{text}</p>
      <label className="label" htmlFor={`reason-${title}`}>
        Disposition reason
      </label>
      <Textarea
        id={`reason-${title}`}
        value={reason}
        maxLength={1000}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="row">
        <Button
          type="button"
          busy={pending}
          disabled={!reason.trim()}
          onClick={() => review("hide")}
        >
          Hide {title.startsWith("Contact") ? "contact" : "tip"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          busy={pending}
          disabled={!reason.trim()}
          onClick={() => review("dismiss")}
        >
          Dismiss report
        </Button>
      </div>
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
    </article>
  );
}
export function ModerationQueue({
  contributions,
  contacts,
}: {
  contributions: Contribution[];
  contacts: Contact[];
}) {
  const [tab, setTab] = useState<"contributions" | "contacts">("contributions");
  const items = tab === "contributions" ? contributions : contacts;
  return (
    <section>
      <div className="tabs" role="tablist" aria-label="Report queues">
        <button
          className={tab === "contributions" ? "selected" : ""}
          role="tab"
          aria-selected={tab === "contributions"}
          onClick={() => setTab("contributions")}
        >
          Contributions
        </button>
        <button
          className={tab === "contacts" ? "selected" : ""}
          role="tab"
          aria-selected={tab === "contacts"}
          onClick={() => setTab("contacts")}
        >
          Contacts
        </button>
      </div>
      <div className="stack">
        {items.length === 0 && (
          <p className="empty-state">Nothing needs review right now.</p>
        )}
        {tab === "contributions"
          ? contributions.map((item) => (
              <Row
                key={item.id}
                title="Contribution report"
                text={`${item.destination} · ${item.reason}\n${item.details ?? item.body}`}
                onReview={async (disposition, reason) =>
                  reviewReport(item.id, disposition, reason)
                }
              />
            ))
          : contacts.map((item) => (
              <Row
                key={item.id}
                title="Contact removal request"
                text={`${item.destination} · ${item.requestText}`}
                onReview={async (disposition, reason) =>
                  reviewContactRequest(item.id, disposition, reason)
                }
              />
            ))}
      </div>
    </section>
  );
}
